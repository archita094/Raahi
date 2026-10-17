
const { StateGraph, START, END, Annotation } = require('@langchain/langgraph');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const mongoose = require('mongoose');

const Stop = require('../models/Stop');
const {
  geocodeLocationTool,
  findNearbyStopsTool,
  findDirectRoutesTool,
  findTransferRoutesTool,
  getBusScheduleTool,
  calculateFareTool,
  calculateTravelTimeTool,
  getNavigationInformationTool
} = require('./transitTools');

const {
  formatJourneyForUi,
  buildStopCoordsMap,
  parseTimeToMinutes,
  formatMinutesToTimeStr,
  CONFIG
} = require('./routeEngine');

const { getCurrentIndiaTime } = require('./scheduleService');

const RoutePlanningState = Annotation.Root({

  source: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  destination: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  departureTime: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  timingMode: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  preferences: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  departureMinutes: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  indiaTime: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),

  sourceCoordinates: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  destinationCoordinates: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  sourceStop: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  destinationStop: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  nearbySourceStops: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  nearbyDestinationStops: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),

  directRoutes: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  indirectRoutes: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  availableRoutes: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  directUi: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  transferUi: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  selectedRoute: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),

  totalFare: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  estimatedTravelTime: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  transferCount: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  walkingInformation: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),

  instructions: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  explanation: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  explanationSource: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),

  status: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  errorMessage: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  isSameLocation: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  locationNotFound: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  notFoundType: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),
  noRouteFound: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) }),

  finalRouteResult: Annotation({ reducer: (x, y) => (y !== undefined ? y : x) })
});

async function validateInputNode(state) {
  const { source, destination, departureTime, timingMode, preferences = {} } = state;

  if (!source || !destination) {
    return {
      status: 'invalid_input',
      errorMessage: 'Both Source and Destination must be provided.'
    };
  }

  const istNow = getCurrentIndiaTime();
  const explicitTime = departureTime || preferences.departureTime || preferences.time || null;
  let departureMinutes = parseTimeToMinutes(explicitTime);
  const effectiveTimingMode = timingMode || preferences.timingMode || (explicitTime ? 'later' : 'now');

  if (departureMinutes === null || effectiveTimingMode === 'now') {
    departureMinutes = istNow.totalMinutes;
  }
  const departureTimeStr = formatMinutesToTimeStr(departureMinutes);

  const origRaw = typeof source === 'string' ? source.trim().toLowerCase() : '';
  const destRaw = typeof destination === 'string' ? destination.trim().toLowerCase() : '';

  if (origRaw && destRaw && origRaw === destRaw) {
    return {
      status: 'same_location',
      isSameLocation: true,
      errorMessage: 'The source and destination are the same.',
      departureTime: departureTimeStr,
      departureMinutes,
      timingMode: effectiveTimingMode,
      indiaTime: istNow.timeStr12
    };
  }

  return {
    status: 'valid',
    departureTime: departureTimeStr,
    departureMinutes,
    timingMode: effectiveTimingMode,
    indiaTime: istNow.timeStr12
  };
}

async function resolveLocationsNode(state) {
  const { source, destination } = state;

  const sourceMatch = await geocodeLocationTool.invoke({ query: source });
  const destMatch = await geocodeLocationTool.invoke({ query: destination });

  const sourceDesc = typeof source === 'object' && source !== null ? (source.name || 'Provided coordinate') : String(source);
  const destDesc = typeof destination === 'object' && destination !== null ? (destination.name || 'Provided coordinate') : String(destination);

  if (!sourceMatch || !sourceMatch.found) {
    return {
      status: 'location_not_found',
      locationNotFound: true,
      notFoundType: 'source',
      errorMessage: `Location '${sourceDesc}' not found in the current CTU data.`
    };
  }

  if (!destMatch || !destMatch.found) {
    return {
      status: 'location_not_found',
      locationNotFound: true,
      notFoundType: 'destination',
      errorMessage: `Location '${destDesc}' not found in the current CTU data.`
    };
  }

  if (sourceMatch.stopName.toLowerCase() === destMatch.stopName.toLowerCase()) {
    return {
      status: 'same_location',
      isSameLocation: true,
      errorMessage: `Both locations correspond to the same bus stop (${sourceMatch.stopName}).`,
      sourceCoordinates: sourceMatch.coordinates,
      destinationCoordinates: destMatch.coordinates,
      sourceStop: {
        name: sourceMatch.stopName,
        isExactMatch: sourceMatch.isExactMatch,
        distanceKm: sourceMatch.distanceKm,
        lat: sourceMatch.coordinates?.lat,
        lng: sourceMatch.coordinates?.lng,
        resolvedAddress: sourceMatch.resolvedAddress,
        note: sourceMatch.note
      },
      destinationStop: {
        name: destMatch.stopName,
        isExactMatch: destMatch.isExactMatch,
        distanceKm: destMatch.distanceKm,
        lat: destMatch.coordinates?.lat,
        lng: destMatch.coordinates?.lng,
        resolvedAddress: destMatch.resolvedAddress,
        note: destMatch.note
      }
    };
  }

  return {
    status: 'valid',
    sourceCoordinates: sourceMatch.coordinates,
    destinationCoordinates: destMatch.coordinates,
    sourceStop: {
      name: sourceMatch.stopName,
      isExactMatch: sourceMatch.isExactMatch,
      distanceKm: sourceMatch.distanceKm,
      lat: sourceMatch.coordinates?.lat,
      lng: sourceMatch.coordinates?.lng,
      resolvedAddress: sourceMatch.resolvedAddress,
      note: sourceMatch.note
    },
    destinationStop: {
      name: destMatch.stopName,
      isExactMatch: destMatch.isExactMatch,
      distanceKm: destMatch.distanceKm,
      lat: destMatch.coordinates?.lat,
      lng: destMatch.coordinates?.lng,
      resolvedAddress: destMatch.resolvedAddress,
      note: destMatch.note
    }
  };
}

async function findNearbyStopsNode(state) {
  const { sourceCoordinates, destinationCoordinates } = state;

  let nearbySource = [];
  let nearbyDest = [];

  if (sourceCoordinates?.lat && sourceCoordinates?.lng) {
    try {
      const res = await findNearbyStopsTool.invoke({
        latitude: sourceCoordinates.lat,
        longitude: sourceCoordinates.lng,
        radiusMeters: 2000,
        limit: 5
      });
      nearbySource = res.stops || [];
    } catch (e) {}
  }

  if (destinationCoordinates?.lat && destinationCoordinates?.lng) {
    try {
      const res = await findNearbyStopsTool.invoke({
        latitude: destinationCoordinates.lat,
        longitude: destinationCoordinates.lng,
        radiusMeters: 2000,
        limit: 5
      });
      nearbyDest = res.stops || [];
    } catch (e) {}
  }

  return {
    nearbySourceStops: nearbySource,
    nearbyDestinationStops: nearbyDest
  };
}

async function searchDirectRoutesNode(state) {
  const { sourceStop, destinationStop, departureMinutes } = state;

  const directRes = await findDirectRoutesTool.invoke({
    sourceStopName: sourceStop.name,
    destStopName: destinationStop.name,
    departureMinutes
  });

  return {
    directRoutes: directRes.routes || []
  };
}

async function searchTransferRoutesNode(state) {
  const { sourceStop, destinationStop, directRoutes = [], departureMinutes } = state;

  const transferRes = await findTransferRoutesTool.invoke({
    sourceStopName: sourceStop.name,
    destStopName: destinationStop.name,
    directBuses: directRoutes,
    departureMinutes
  });

  return {
    indirectRoutes: transferRes.routes || []
  };
}

async function calculateRouteDetailsNode(state) {
  const {
    sourceStop,
    destinationStop,
    sourceCoordinates,
    destinationCoordinates,
    directRoutes = [],
    indirectRoutes = [],
    departureMinutes
  } = state;

  if (directRoutes.length === 0 && indirectRoutes.length === 0) {
    return {
      status: 'no_route',
      noRouteFound: true,
      errorMessage: 'No route found within the currently supported transit network.',
      availableRoutes: [],
      directUi: [],
      transferUi: [],
      selectedRoute: null
    };
  }

  let allStops = [];
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      allStops = await Stop.find({}).lean();
    } catch (e) {}
  }
  const stopCoordsMap = buildStopCoordsMap(allStops);

  const sourceMatchObj = {
    stopName: sourceStop.name,
    isExactMatch: sourceStop.isExactMatch,
    distanceKm: sourceStop.distanceKm,
    lat: sourceStop.lat || sourceCoordinates?.lat,
    lng: sourceStop.lng || sourceCoordinates?.lng,
    resolvedAddress: sourceStop.resolvedAddress,
    query: typeof state.source === 'string' ? state.source : sourceStop.name
  };

  const destMatchObj = {
    stopName: destinationStop.name,
    isExactMatch: destinationStop.isExactMatch,
    distanceKm: destinationStop.distanceKm,
    lat: destinationStop.lat || destinationCoordinates?.lat,
    lng: destinationStop.lng || destinationCoordinates?.lng,
    resolvedAddress: destinationStop.resolvedAddress,
    query: typeof state.destination === 'string' ? state.destination : destinationStop.name
  };

  const directUi = await Promise.all(
    directRoutes.map((r, i) =>
      formatJourneyForUi(r, 'dir', i, sourceMatchObj, destMatchObj, departureMinutes, stopCoordsMap)
    )
  );

  const transferUi = await Promise.all(
    indirectRoutes.map((r, i) =>
      formatJourneyForUi(r, 'xfr', i, sourceMatchObj, destMatchObj, departureMinutes, stopCoordsMap)
    )
  );

  const availableRoutes = [...directUi, ...transferUi];
  const selectedRoute = availableRoutes[0] || null;

  const totalFare = selectedRoute?.fareAmount || (selectedRoute?.fare ? parseInt(String(selectedRoute.fare).replace(/\D/g, ''), 10) : 10);
  const estimatedTravelTime = selectedRoute?.totalTimeMinutes || selectedRoute?.trafficTotalTimeMinutes || selectedRoute?.totalEstimatedTime || selectedRoute?.estimatedTime || 20;
  const transferCount = selectedRoute?.transfersNum !== undefined ? selectedRoute.transfersNum : (selectedRoute?.type === 'transfer' ? 1 : 0);

  let walkingInformation = null;
  try {
    const navInfo = await getNavigationInformationTool.invoke({
      originCoords: sourceCoordinates,
      boardingStopCoords: { lat: sourceStop.lat, lng: sourceStop.lng },
      dropStopCoords: { lat: destinationStop.lat, lng: destinationStop.lng },
      destinationCoords: destinationCoordinates
    });
    walkingInformation = navInfo;
  } catch (e) {}

  return {
    status: 'success',
    availableRoutes,
    directUi,
    transferUi,
    selectedRoute,
    totalFare,
    estimatedTravelTime,
    transferCount,
    walkingInformation
  };
}

async function prepareRouteInstructionsNode(state) {
  const {
    status,
    noRouteFound,
    isSameLocation,
    selectedRoute,
    sourceStop,
    destinationStop,
    directRoutes = [],
    indirectRoutes = []
  } = state;

  if (status !== 'success' || noRouteFound || isSameLocation || !selectedRoute) {
    return {
      instructions: [],
      explanation: state.errorMessage || 'No route available within the currently supported transit network.',
      explanationSource: 'deterministic-engine'
    };
  }

  const instructions = [];
  const isDirect = selectedRoute.type === 'direct';
  const directBusNumber = selectedRoute.busNumber || selectedRoute.busNumbers?.[0] || selectedRoute.legs?.[0]?.busNumber || 'Direct';
  const totalTravelTimeMins = selectedRoute.totalTimeMinutes || selectedRoute.totalEstimatedTime || selectedRoute.estimatedTime || 20;
  const totalTravelDistanceKm = selectedRoute.distanceKm || selectedRoute.totalDistance || selectedRoute.distance || 0;
  const fareDisplayAmount = selectedRoute.fareAmount || (typeof selectedRoute.totalFare === 'number' ? selectedRoute.totalFare : 10);

  const boardingStopName = isDirect ? (selectedRoute.boardingStop || selectedRoute.legs?.[0]?.boardingStop || sourceStop.name) : selectedRoute.legs[0].boardingStop;
  const walkMeters = selectedRoute.checkpoints?.[0]?.distanceMeters || 100;
  instructions.push({
    stepNumber: 1,
    type: 'walk',
    title: `Head to ${boardingStopName}`,
    description: sourceStop.isExactMatch
      ? `Board bus directly at ${boardingStopName}.`
      : `Walk approximately ${walkMeters} meters to ${boardingStopName}. Bus departs at ${selectedRoute.departureTime}.`
  });

  if (isDirect) {
    const dropStopName = selectedRoute.dropStop || selectedRoute.legs?.[0]?.dropStop || destinationStop.name;

    instructions.push({
      stepNumber: 2,
      type: 'bus_ride',
      title: `Board Bus ${directBusNumber}`,
      description: `Ride Bus ${directBusNumber} directly from ${boardingStopName} to ${dropStopName}. Travel time is ~${totalTravelTimeMins} mins (${totalTravelDistanceKm} km, ${selectedRoute.stops?.length || 0} stops).`
    });

    instructions.push({
      stepNumber: 3,
      type: 'alight',
      title: `Alight at ${dropStopName}`,
      description: `Arrive at ${dropStopName} at approx ${selectedRoute.arrivalTime}. Your destination is right at or next to the stop.`
    });
  } else {

    const leg1 = selectedRoute.legs[0];
    const leg2 = selectedRoute.legs[1];
    const leg1Bus = leg1.busNumber || selectedRoute.busNumbers?.[0] || 'Bus';
    const leg2Bus = leg2.busNumber || selectedRoute.busNumbers?.[1] || 'Bus';
    const transferStop = selectedRoute.transferStops?.[0] || leg1.dropStop;

    instructions.push({
      stepNumber: 2,
      type: 'bus_ride',
      title: `Board Bus ${leg1Bus}`,
      description: `Ride Bus ${leg1Bus} from ${leg1.boardingStop} to ${transferStop} (~${leg1.estimatedTime} mins).`
    });

    instructions.push({
      stepNumber: 3,
      type: 'transfer',
      title: `Transfer at ${transferStop}`,
      description: `Alight at ${transferStop}. Allow ~${selectedRoute.transferWaitMinutes || 5} mins to switch platforms/bays and board Bus ${leg2Bus}.`
    });

    instructions.push({
      stepNumber: 4,
      type: 'bus_ride',
      title: `Board Bus ${leg2Bus}`,
      description: `Ride Bus ${leg2Bus} from ${transferStop} to ${leg2.dropStop} (~${leg2.estimatedTime} mins).`
    });

    instructions.push({
      stepNumber: 5,
      type: 'alight',
      title: `Alight at ${leg2.dropStop}`,
      description: `Arrive at ${leg2.dropStop} at approx ${selectedRoute.arrivalTime}. Total travel distance is ~${totalTravelDistanceKm} km.`
    });
  }

  let explanation = '';
  let explanationSource = 'deterministic-engine';

  if (isDirect) {
    explanation = `🚌 Direct Bus Available: Take Bus ${directBusNumber} from ${sourceStop.name} to ${destinationStop.name}. Journey duration is ~${totalTravelTimeMins} mins across ${totalTravelDistanceKm} km with zero transfers. Fare is ₹${fareDisplayAmount}.`;
  } else {
    const leg1 = selectedRoute.legs[0];
    const leg2 = selectedRoute.legs[1];
    const leg1Bus = leg1.busNumber || selectedRoute.busNumbers?.[0] || 'Bus';
    const leg2Bus = leg2.busNumber || selectedRoute.busNumbers?.[1] || 'Bus';
    const xfr = selectedRoute.transferStops?.[0] || leg1.dropStop;
    explanation = `🔄 Connecting Route: Board Bus ${leg1Bus} from ${sourceStop.name} to ${xfr} (~${leg1.estimatedTime} mins), then transfer to Bus ${leg2Bus} towards ${destinationStop.name} (~${leg2.estimatedTime} mins). Total journey time is ~${totalTravelTimeMins} mins across ${totalTravelDistanceKm} km (includes ~${selectedRoute.transferWaitMinutes || 5} min transfer wait). Total fare is ₹${fareDisplayAmount}.`;
  }

  const apiKey = (process.env.NODE_ENV !== 'test') ? process.env.GEMINI_API_KEY : null;
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
      const llm = new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey,
        temperature: 0.1
      });

      const prompt = `
You are Raahi, a transit engine assistant for Chandigarh CTU bus commuters.
Summarize the calculated bus options below in 2 concise, helpful sentences for the commuter.

STRICT ACCURACY RULES:
1. ONLY use the exact bus numbers, stops, distances, fares, and travel times provided below.
2. NEVER invent, assume, or alter any bus number, stop name, or travel time.

ROUTE DATA:
- Origin: ${sourceStop.name}
- Destination: ${destinationStop.name}
- Selected Route: Bus ${selectedRoute.busNumber || selectedRoute.busNumbers?.join(' -> ')}
- Type: ${isDirect ? 'Direct bus (0 transfers)' : '1 Transfer'}
- Total Travel Time: ${selectedRoute.totalEstimatedTime || selectedRoute.estimatedTime} mins
- Distance: ${selectedRoute.totalDistance || selectedRoute.distance} km
- Fare: ₹${selectedRoute.totalFare || selectedRoute.fare?.amount || 10}

Provide a crisp, clear 2-sentence summary.
`;

      const response = await llm.invoke(prompt);
      let llmText = '';
      if (typeof response?.content === 'string') {
        llmText = response.content.trim();
      } else if (Array.isArray(response?.content)) {
        llmText = response.content.map(p => (typeof p === 'string' ? p : p?.text || '')).join(' ').trim();
      }

      if (llmText) {
        explanation = llmText;
        explanationSource = `langchain-${modelName}`;
      }
    } catch (err) {

    }
  }

  return {
    instructions,
    explanation,
    explanationSource
  };
}

async function formatFinalResponseNode(state) {
  const {
    source,
    destination,
    departureTime,
    timingMode,
    indiaTime,
    sourceStop,
    destinationStop,
    nearbySourceStops = [],
    nearbyDestinationStops = [],
    directRoutes = [],
    indirectRoutes = [],
    availableRoutes = [],
    selectedRoute = null,
    totalFare = null,
    estimatedTravelTime = null,
    transferCount = 0,
    walkingInformation = null,
    instructions = [],
    explanation = null,
    explanationSource = 'deterministic-engine',
    status = 'success',
    errorMessage = null,
    isSameLocation = false,
    locationNotFound = false,
    notFoundType = null,
    noRouteFound = false
  } = state;

  if (isSameLocation) {
    return {
      finalRouteResult: {
        isSameLocation: true,
        message: errorMessage || 'The source and destination are the same.',
        departureTime,
        timingMode,
        indiaTime,
        sourceStop: sourceStop || null,
        destinationStop: destinationStop || null,
        directRoutes: [],
        transferRoutes: [],
        availableRoutes: []
      }
    };
  }

  if (locationNotFound) {
    return {
      finalRouteResult: {
        locationNotFound: true,
        notFoundType,
        message: errorMessage || 'Location not found in the current CTU data.',
        departureTime,
        timingMode,
        indiaTime,
        directRoutes: [],
        transferRoutes: [],
        availableRoutes: []
      }
    };
  }

  if (status === 'invalid_input') {
    return {
      finalRouteResult: {
        invalidRequest: true,
        message: errorMessage || 'Both Source and Destination must be provided.',
        directRoutes: [],
        transferRoutes: [],
        availableRoutes: []
      }
    };
  }

  if (noRouteFound || availableRoutes.length === 0) {
    return {
      finalRouteResult: {
        source: typeof source === 'string' ? source : sourceStop?.name,
        destination: typeof destination === 'string' ? destination : destinationStop?.name,
        departureTime,
        timingMode,
        indiaTime,
        sourceStop: sourceStop || null,
        destinationStop: destinationStop || null,
        nearbySourceStops,
        nearbyDestinationStops,
        directRoutes: [],
        transferRoutes: [],
        availableRoutes: [],
        noRouteFound: true,
        message: errorMessage || 'No route found within the currently supported transit network.'
      }
    };
  }

  const finalResult = {
    source: typeof source === 'string' ? source : sourceStop?.name,
    destination: typeof destination === 'string' ? destination : destinationStop?.name,
    departureTime,
    timingMode,
    indiaTime,
    sourceStop,
    destinationStop,
    nearbySourceStops,
    nearbyDestinationStops,
    directRoutes,
    transferRoutes: indirectRoutes,
    availableRoutes,
    recommendedRoute: selectedRoute,
    selectedRoute,
    totalFare,
    estimatedTravelTime,
    transferCount,
    walkingInformation,
    instructions,
    explanation,
    explanationSource,
    journeys: availableRoutes,
    generatedAt: new Date().toISOString()
  };

  return {
    finalRouteResult: finalResult
  };
}

function shouldContinueAfterValidation(state) {
  if (state.status !== 'valid') {
    return 'format_final_response';
  }
  return 'resolve_locations';
}

function shouldContinueAfterResolution(state) {
  if (state.status !== 'valid') {
    return 'format_final_response';
  }
  return 'find_nearby_stops';
}

function checkDirectRouteAvailability(state) {
  const directRoutes = state.directRoutes || [];
  const prefs = state.preferences || {};

  if ((prefs.directOnly || prefs.priority === 'direct') && directRoutes.length > 0) {
    return 'has_direct';
  }

  if (directRoutes.length === 0) {
    return 'no_direct';
  }

  return prefs.skipTransfers ? 'has_direct' : 'search_both';
}

function createRoutePlanningGraph() {
  const workflow = new StateGraph(RoutePlanningState)

    .addNode('validate_input', validateInputNode)
    .addNode('resolve_locations', resolveLocationsNode)
    .addNode('find_nearby_stops', findNearbyStopsNode)
    .addNode('search_direct_routes', searchDirectRoutesNode)
    .addNode('search_transfer_routes', searchTransferRoutesNode)
    .addNode('calculate_route_details', calculateRouteDetailsNode)
    .addNode('prepare_route_instructions', prepareRouteInstructionsNode)
    .addNode('format_final_response', formatFinalResponseNode)

    .addEdge(START, 'validate_input')
    .addConditionalEdges(
      'validate_input',
      shouldContinueAfterValidation,
      {
        format_final_response: 'format_final_response',
        resolve_locations: 'resolve_locations'
      }
    )
    .addConditionalEdges(
      'resolve_locations',
      shouldContinueAfterResolution,
      {
        format_final_response: 'format_final_response',
        find_nearby_stops: 'find_nearby_stops'
      }
    )
    .addEdge('find_nearby_stops', 'search_direct_routes')

    .addConditionalEdges(
      'search_direct_routes',
      checkDirectRouteAvailability,
      {
        has_direct: 'calculate_route_details',
        no_direct: 'search_transfer_routes',
        search_both: 'search_transfer_routes'
      }
    )
    .addEdge('search_transfer_routes', 'calculate_route_details')
    .addEdge('calculate_route_details', 'prepare_route_instructions')
    .addEdge('prepare_route_instructions', 'format_final_response')
    .addEdge('format_final_response', END);

  return workflow.compile();
}

let compiledRouteGraph = null;
function getRoutePlanningGraph() {
  if (!compiledRouteGraph) {
    compiledRouteGraph = createRoutePlanningGraph();
  }
  return compiledRouteGraph;
}

async function planJourneyWithLangGraph(params = {}) {
  const source = params.source || params.origin;
  const destination = params.destination;
  const preferences = params.preferences || {};
  const departureTime = params.departureTime || params.time || preferences.departureTime || preferences.time || null;
  const timingMode = params.timingMode || preferences.timingMode || (departureTime ? 'later' : 'now');

  const app = getRoutePlanningGraph();
  const result = await app.invoke({
    source,
    destination,
    departureTime,
    timingMode,
    preferences
  });

  return result.finalRouteResult;
}

module.exports = {
  createRoutePlanningGraph,
  getRoutePlanningGraph,
  planJourneyWithLangGraph,
  RoutePlanningState
};

