
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const mongoose = require('mongoose');

const Stop = require('../models/Stop');
const { matchLocation, getHaversineDistanceKm } = require('./locationMatcher');
const { geocode, findNearbyStops } = require('./geocodingService');
const { calculateFare } = require('./fareService');
const { calculateNextBusArrival, getCurrentIndiaTime } = require('./scheduleService');
const { calculateCorridorTraffic } = require('./trafficService');
const {
  findDirectRoutes,
  findTransferRoutes,
  calculateTravelTimeMinutes,
  parseTimeToMinutes,
  formatMinutesToTimeStr,
  CONFIG
} = require('./routeEngine');

function calculateMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 100;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const geocodeLocationTool = tool(
  async ({ query }) => {
    let allStops = [];
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        allStops = await Stop.find({}).lean();
      } catch (e) {}
    }

    let inputQuery = query;
    if (typeof query === 'string') {
      const coordMatch = query.trim().match(/^([-+]?[0-9]*\.?[0-9]+),\s*([-+]?[0-9]*\.?[0-9]+)$/);
      if (coordMatch) {
        inputQuery = { latitude: parseFloat(coordMatch[1]), longitude: parseFloat(coordMatch[2]) };
      }
    }

    const match = await matchLocation(inputQuery, allStops);
    if (!match) {
      return { found: false, query, message: `Location not found in verified CTU dataset.` };
    }

    return {
      found: true,
      query: typeof query === 'object' ? (query.name || `${query.latitude || query.lat},${query.longitude || query.lng}`) : query,
      stopName: match.stopName,
      isExactMatch: match.isExactMatch,
      distanceKm: match.distanceKm,
      coordinates: {
        lat: match.lat || match.coordinates?.lat || null,
        lng: match.lng || match.coordinates?.lng || null
      },
      resolvedAddress: match.resolvedAddress || match.stopName,
      note: match.note || ''
    };
  },
  {
    name: 'geocode_location',
    description: 'Resolve a commuter place or landmark query into verified coordinates and nearest bus stop in Chandigarh Tricity',
    schema: z.object({
      query: z.any().describe('The name, address, or coordinate object to geocode')
    })
  }
);

const findNearbyStopsTool = tool(
  async ({ latitude, longitude, radiusMeters = 2000, limit = 5 }) => {
    const stops = await findNearbyStops(latitude, longitude, radiusMeters, limit);
    return {
      count: stops.length,
      latitude,
      longitude,
      radiusMeters,
      stops: stops.map(s => ({
        name: s.name,
        distanceMeters: s.distanceMeters,
        distanceKm: s.distanceKm,
        lat: s.lat,
        lng: s.lng,
        sector: s.sector
      }))
    };
  },
  {
    name: 'find_nearby_stops',
    description: 'Find verified CTU bus stops within a given radius around geographic coordinates',
    schema: z.object({
      latitude: z.number().describe('Latitude of coordinate center'),
      longitude: z.number().describe('Longitude of coordinate center'),
      radiusMeters: z.number().optional().describe('Search radius in meters (default 2000m)'),
      limit: z.number().optional().describe('Maximum stops to return (default 5)')
    })
  }
);

const findDirectRoutesTool = tool(
  async ({ sourceStopName, destStopName, departureMinutes = null }) => {
    const direct = findDirectRoutes(sourceStopName, destStopName, departureMinutes);
    return {
      source: sourceStopName,
      destination: destStopName,
      count: direct.length,
      routes: direct
    };
  },
  {
    name: 'find_direct_routes',
    description: 'Find authentic direct CTU bus routes connecting two verified bus stops with zero transfers',
    schema: z.object({
      sourceStopName: z.string().describe('Name of verified boarding bus stop'),
      destStopName: z.string().describe('Name of verified alighting bus stop'),
      departureMinutes: z.number().nullable().optional().describe('Minutes from midnight (0-1439) for time-aware routes')
    })
  }
);

const findTransferRoutesTool = tool(
  async ({ sourceStopName, destStopName, directBuses = [], departureMinutes = null }) => {
    const transfers = findTransferRoutes(sourceStopName, destStopName, directBuses, departureMinutes);
    return {
      source: sourceStopName,
      destination: destStopName,
      count: transfers.length,
      routes: transfers
    };
  },
  {
    name: 'find_transfer_routes',
    description: 'Find valid 1-transfer connecting CTU bus routes between two bus stops via intermediate hubs (ISBT 17, ISBT 43, etc.)',
    schema: z.object({
      sourceStopName: z.string().describe('Name of verified boarding bus stop'),
      destStopName: z.string().describe('Name of verified alighting bus stop'),
      directBuses: z.array(z.any()).optional().describe('List of direct route objects already found'),
      departureMinutes: z.number().nullable().optional().describe('Minutes from midnight for time-aware routes')
    })
  }
);

const getBusScheduleTool = tool(
  async ({ routeNumber, stopName, currentTimeStr = null, timingMode = 'now' }) => {
    const scheduleInfo = calculateNextBusArrival(routeNumber, stopName, currentTimeStr, timingMode);
    return scheduleInfo;
  },
  {
    name: 'get_bus_schedule',
    description: 'Get verified timetable, operating hours, frequency, and next bus arrival time for a CTU route',
    schema: z.object({
      routeNumber: z.string().describe('CTU Route number (e.g. "206", "35", "11")'),
      stopName: z.string().describe('Bus stop name'),
      currentTimeStr: z.string().nullable().optional().describe('Time in HH:MM AM/PM format (defaults to current IST)'),
      timingMode: z.string().optional().describe('"now" or "later"')
    })
  }
);

const calculateFareTool = tool(
  async ({ distanceKm, busType = 'ordinary' }) => {
    const fare = await calculateFare(distanceKm, busType);
    return fare;
  },
  {
    name: 'calculate_fare',
    description: 'Calculate official CTU bus ticket fare based on distance slabs: 0-5 km ₹10, 5-10 km ₹25, 10-15 km ₹40, 15+ km ₹45',
    schema: z.object({
      distanceKm: z.number().describe('Travel distance in kilometers'),
      busType: z.string().optional().describe('Bus type')
    })
  }
);

const calculateTravelTimeTool = tool(
  async ({ distanceKm, speedKmh = 22, stops = [], departureMinutes = null }) => {
    const nominalMinutes = calculateTravelTimeMinutes(distanceKm, speedKmh);
    const traffic = calculateCorridorTraffic({
      stops,
      distanceKm,
      nominalMinutes,
      departureMinutes
    });

    return {
      distanceKm,
      nominalMinutes,
      trafficDurationMinutes: traffic.trafficDurationMinutes,
      congestionLevel: traffic.congestionLevel,
      delayMinutes: traffic.delayMinutes
    };
  },
  {
    name: 'calculate_travel_time',
    description: 'Calculate estimated bus transit travel time including corridor traffic delays',
    schema: z.object({
      distanceKm: z.number().describe('Travel distance in kilometers'),
      speedKmh: z.number().optional().describe('Average bus speed in km/h (default 22)'),
      stops: z.array(z.string()).optional().describe('List of route stop names'),
      departureMinutes: z.number().nullable().optional().describe('Departure time in minutes from midnight')
    })
  }
);

const getNavigationInformationTool = tool(
  async ({ originCoords, boardingStopCoords, dropStopCoords, destinationCoords }) => {
    const walkToStopMeters = (originCoords && boardingStopCoords)
      ? calculateMeters(originCoords.lat, originCoords.lng, boardingStopCoords.lat, boardingStopCoords.lng)
      : 100;
    const walkFromStopMeters = (dropStopCoords && destinationCoords)
      ? calculateMeters(dropStopCoords.lat, dropStopCoords.lng, destinationCoords.lat, destinationCoords.lng)
      : 100;

    return {
      originWalk: {
        distanceMeters: walkToStopMeters,
        durationMinutes: Math.max(1, Math.round(walkToStopMeters / 80)),
        distanceText: walkToStopMeters >= 1000 ? `${(walkToStopMeters / 1000).toFixed(1)} km` : `${walkToStopMeters} m`
      },
      destinationWalk: {
        distanceMeters: walkFromStopMeters,
        durationMinutes: Math.max(1, Math.round(walkFromStopMeters / 80)),
        distanceText: walkFromStopMeters >= 1000 ? `${(walkFromStopMeters / 1000).toFixed(1)} km` : `${walkFromStopMeters} m`
      }
    };
  },
  {
    name: 'get_navigation_information',
    description: 'Calculate walking distances, walking times, and connection info between origin/destination GPS coordinates and bus stops',
    schema: z.object({
      originCoords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
      boardingStopCoords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
      dropStopCoords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
      destinationCoords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional()
    })
  }
);

const transitTools = [
  geocodeLocationTool,
  findNearbyStopsTool,
  findDirectRoutesTool,
  findTransferRoutesTool,
  getBusScheduleTool,
  calculateFareTool,
  calculateTravelTimeTool,
  getNavigationInformationTool
];

module.exports = {
  geocodeLocationTool,
  findNearbyStopsTool,
  findDirectRoutesTool,
  findTransferRoutesTool,
  getBusScheduleTool,
  calculateFareTool,
  calculateTravelTimeTool,
  getNavigationInformationTool,
  transitTools,
  calculateMeters
};

