
const fs = require('fs');
const path = require('path');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const { matchLocation, getHaversineDistanceKm } = require('./locationMatcher');
const { calculateFare } = require('./fareService');
const { calculateNextBusArrival, getCurrentIndiaTime } = require('./scheduleService');
const { calculateCorridorTraffic } = require('./trafficService');

const CONFIG = {
  AVG_BUS_SPEED_KMH: 22,
  TRANSFER_WAIT_MINUTES: 5,
  WALKING_SPEED_KMH: 4.8
};

let CTU_ROUTES_DATA = null;
function loadRoutesData() {
  if (!CTU_ROUTES_DATA) {
    const filePath = path.join(__dirname, '../data/ctu_distance_routes.json');
    if (fs.existsSync(filePath)) {
      CTU_ROUTES_DATA = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      CTU_ROUTES_DATA = { routes: [] };
    }
  }
  return CTU_ROUTES_DATA;
}

let STATIC_STOP_COORDS_MAP = null;

function getStaticStopCoordsMap() {
  if (!STATIC_STOP_COORDS_MAP) {
    STATIC_STOP_COORDS_MAP = new Map();

    const filePath = path.join(__dirname, '../data/stops_for_gemini_enrichment.json');
    if (fs.existsSync(filePath)) {
      try {
        const stopsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const s of stopsData) {
          if (s.name && s.latitude && s.longitude) {
            STATIC_STOP_COORDS_MAP.set(normalizeStopName(s.name), {
              lat: Number(s.latitude),
              lng: Number(s.longitude),
              name: s.name
            });
          }
        }
      } catch (err) {
        console.error('Error loading stops_for_gemini_enrichment.json:', err.message);
      }
    }

    try {
      const { TRICITY_LOCATION_DB, SECTOR_COORDINATES } = require('./geocodingService');
      if (TRICITY_LOCATION_DB) {
        for (const [key, item] of Object.entries(TRICITY_LOCATION_DB)) {
          STATIC_STOP_COORDS_MAP.set(normalizeStopName(key), {
            lat: Number(item.lat),
            lng: Number(item.lng),
            name: item.name
          });
        }
      }
      if (SECTOR_COORDINATES) {
        for (const [secNum, s] of Object.entries(SECTOR_COORDINATES)) {
          STATIC_STOP_COORDS_MAP.set(`sector ${secNum}`, {
            lat: Number(s.lat),
            lng: Number(s.lng),
            name: s.name
          });
        }
      }
    } catch (err) {

    }
  }
  return STATIC_STOP_COORDS_MAP;
}

function buildStopCoordsMap(allStops = []) {
  const map = new Map(getStaticStopCoordsMap());
  if (Array.isArray(allStops)) {
    for (const stop of allStops) {
      if (stop.name && stop.location && Array.isArray(stop.location.coordinates)) {
        const norm = normalizeStopName(stop.name);

        if (!map.has(norm)) {
          map.set(norm, {
            lat: Number(stop.location.coordinates[1]),
            lng: Number(stop.location.coordinates[0]),
            name: stop.name
          });
        }
      }
    }
  }
  return map;
}

function calculateTravelTimeMinutes(distanceKm, speedKmh = CONFIG.AVG_BUS_SPEED_KMH) {
  if (!distanceKm || distanceKm <= 0) return 2;
  const rawMinutes = (distanceKm / speedKmh) * 60;
  return Math.max(2, Math.round(rawMinutes));
}

function normalizeStopName(name) {
  if (!name) return '';
  let s = String(name).trim().toLowerCase().replace(/[-_.,/]/g, ' ').replace(/\s+/g, ' ');
  if (!s.includes('towards')) {
    if (s.includes('17') && s.includes('isbt')) return 'isbt 17';
    if (s.includes('43') && s.includes('isbt')) return 'isbt 43';
  } else {
    const parts = s.split('towards');
    const baseStop = parts[0].trim();
    if (baseStop) return baseStop;
  }
  if (s.includes('pgi')) return 'pgi';
  if (s.includes('railway') && s.includes('station')) return 'railway station';
  if (s.includes('mani') && s.includes('majra')) return 'manimajra';
  if (s === 'kharar' || s === 'kharar bus stand' || s === 'kharar stand') return 'kharar';
  if (s.includes('mundi kharar')) return 'mundi kharar';
  if (s.includes('kila chungi')) return 'kila chungi';
  if (s.includes('bansawali chungi')) return 'bansawali chungi';
  if (s.includes('desumajra') || s.includes('nijjar')) return 'desumajra';
  if (s.includes('kfc')) return 'kfc';
  if (s.includes('daun')) return 'daun';
  if (s.includes('balongi')) return 'balongi';
  if (s.includes('dera') && s.includes('bassi')) return 'dera bassi';
  if (s.includes('ram') && s.includes('darbar')) return 'ram darbar';
  if (s.includes('nada') && s.includes('sahib')) return 'nada sahib';
  if (s.includes('mansa') && s.includes('devi')) return 'mansa devi';
  return s;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function formatMinutesToTimeStr(totalMinutes) {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return '08:00 AM';
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(norm / 60);
  const minutes = norm % 60;

  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const hStr = String(hours12).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  return `${hStr}:${mStr} ${ampm}`;
}

function isRouteActiveAtTime(directionOrRoute, departureMinutes) {
  if (!directionOrRoute || departureMinutes === null || departureMinutes === undefined) return true;

  if (directionOrRoute.active_until) {
    const untilMins = parseTimeToMinutes(directionOrRoute.active_until);
    if (untilMins !== null && departureMinutes > untilMins) return false;
  }
  if (directionOrRoute.active_after) {
    const afterMins = parseTimeToMinutes(directionOrRoute.active_after);
    if (afterMins !== null && departureMinutes < afterMins) return false;
  }

  const window = directionOrRoute.time_window || directionOrRoute.operating_window || directionOrRoute.operatingTime;
  if (window) {
    if (window.start) {
      const startMins = parseTimeToMinutes(window.start);
      if (startMins !== null && departureMinutes < startMins) return false;
    }
    if (window.end) {
      const endMins = parseTimeToMinutes(window.end);
      if (endMins !== null && departureMinutes > endMins) return false;
    }
  }

  return true;
}

function stopsMatch(name1, name2) {
  const n1 = normalizeStopName(name1);
  const n2 = normalizeStopName(name2);
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

function findDirectRoutes(sourceStopName, destStopName, departureMinutes = null) {
  const data = loadRoutesData();
  const directRoutes = [];

  for (const r of data.routes) {
    if (!isRouteActiveAtTime(r, departureMinutes)) continue;

    for (const dirKey of ['going', 'returning']) {
      const dir = r[dirKey];
      if (!dir || !dir.stops) continue;
      if (!isRouteActiveAtTime(dir, departureMinutes)) continue;

      const stops = dir.stops;
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < stops.length; i++) {
        if (startIndex === -1 && stopsMatch(stops[i].name, sourceStopName)) {
          startIndex = i;
        } else if (startIndex !== -1 && stopsMatch(stops[i].name, destStopName)) {
          endIndex = i;
          break;
        }
      }

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const boardingStop = stops[startIndex];
        const dropStop = stops[endIndex];
        const distance = parseFloat(Math.abs(dropStop.distance_km - boardingStop.distance_km).toFixed(1));
        const estimatedTime = calculateTravelTimeMinutes(distance);
        const intermediateStops = stops.slice(startIndex, endIndex + 1).map(s => s.name.trim());

        directRoutes.push({
          type: 'direct',
          busNumber: r.route_number,
          busNumbers: [r.route_number],
          direction: dirKey === 'going' ? 'Outbound' : 'Return',
          from: boardingStop.name.trim(),
          to: dropStop.name.trim(),
          boardingStop: boardingStop.name.trim(),
          dropStop: dropStop.name.trim(),
          boardingDistanceKm: boardingStop.distance_km || 0,
          intermediateStopsCount: intermediateStops.length - 2,
          stops: intermediateStops,
          distance: distance,
          totalDistance: distance,
          estimatedTime: estimatedTime,
          totalEstimatedTime: estimatedTime,
          transfers: 0,
          transferStops: []
        });
      }
    }
  }

  const uniqueDirect = [];
  const seenBuses = new Set();
  for (const dr of directRoutes) {
    if (!seenBuses.has(dr.busNumber)) {
      seenBuses.add(dr.busNumber);
      uniqueDirect.push(dr);
    }
  }

  return uniqueDirect;
}

function findTransferRoutes(sourceStopName, destStopName, directBuses = [], departureMinutes = null) {
  const data = loadRoutesData();
  const transferRoutes = [];

  const directBusNumbers = new Set(
    (directBuses || [])
      .map(dr => (typeof dr === 'string' ? dr : dr.busNumber))
      .filter(Boolean)
  );

  const firstLegs = [];
  for (const r of data.routes) {
    if (directBusNumbers.has(r.route_number)) {
      continue;
    }
    if (!isRouteActiveAtTime(r, departureMinutes)) continue;

    for (const dirKey of ['going', 'returning']) {
      const dir = r[dirKey];
      if (!dir || !dir.stops) continue;
      if (!isRouteActiveAtTime(dir, departureMinutes)) continue;

      const stops = dir.stops;
      let startIndex = -1;

      for (let i = 0; i < stops.length; i++) {
        if (stopsMatch(stops[i].name, sourceStopName)) {
          startIndex = i;
          break;
        }
      }

      if (startIndex !== -1) {

        const destIndex = stops.findIndex((s, idx) => idx > startIndex && stopsMatch(s.name, destStopName));
        if (destIndex !== -1) {
          continue;
        }

        for (let j = startIndex + 1; j < stops.length; j++) {
          const tStop = stops[j];
          if (stopsMatch(tStop.name, destStopName)) {
            break;
          }

          firstLegs.push({
            route: r,
            direction: dirKey,
            startIndex,
            transferIndex: j,
            transferStopName: tStop.name.trim(),
            boardingDistanceKm: stops[startIndex].distance_km || 0,
            leg1Stops: stops.slice(startIndex, j + 1),
            leg1Distance: parseFloat(Math.abs(tStop.distance_km - stops[startIndex].distance_km).toFixed(1))
          });
        }
      }
    }
  }

  for (const leg1 of firstLegs) {
    const leg1Time = calculateTravelTimeMinutes(leg1.leg1Distance);
    const leg2DepMinutes = departureMinutes !== null
      ? departureMinutes + leg1Time + CONFIG.TRANSFER_WAIT_MINUTES
      : null;

    for (const r2 of data.routes) {
      if (r2.route_number === leg1.route.route_number) continue;
      if (!isRouteActiveAtTime(r2, leg2DepMinutes)) continue;

      for (const dirKey2 of ['going', 'returning']) {
        const dir2 = r2[dirKey2];
        if (!dir2 || !dir2.stops) continue;
        if (!isRouteActiveAtTime(dir2, leg2DepMinutes)) continue;

        const stops2 = dir2.stops;
        let tIndex2 = -1;
        let dIndex2 = -1;

        for (let k = 0; k < stops2.length; k++) {
          if (tIndex2 === -1 && stopsMatch(stops2[k].name, leg1.transferStopName)) {
            tIndex2 = k;
          } else if (tIndex2 !== -1 && stopsMatch(stops2[k].name, destStopName)) {
            dIndex2 = k;
            break;
          }
        }

        if (tIndex2 !== -1 && dIndex2 !== -1 && dIndex2 > tIndex2) {
          const leg2Stops = stops2.slice(tIndex2, dIndex2 + 1);

          if (leg2Stops.some(s => stopsMatch(s.name, sourceStopName))) {
            continue;
          }

          const leg2Distance = parseFloat(Math.abs(stops2[dIndex2].distance_km - stops2[tIndex2].distance_km).toFixed(1));
          const totalDistance = parseFloat((leg1.leg1Distance + leg2Distance).toFixed(1));

          const leg1Time = calculateTravelTimeMinutes(leg1.leg1Distance);
          const leg2Time = calculateTravelTimeMinutes(leg2Distance);
          const totalEstimatedTime = leg1Time + CONFIG.TRANSFER_WAIT_MINUTES + leg2Time;

          transferRoutes.push({
            type: 'transfer',
            busNumbers: [leg1.route.route_number, r2.route_number],
            transfers: 1,
            transferStops: [leg1.transferStopName],
            boardingDistanceKm: leg1.boardingDistanceKm || 0,
            totalDistance: totalDistance,
            totalEstimatedTime: totalEstimatedTime,
            transferWaitMinutes: CONFIG.TRANSFER_WAIT_MINUTES,
            legs: [
              {
                busNumber: leg1.route.route_number,
                from: leg1.leg1Stops[0].name.trim(),
                to: leg1.transferStopName,
                boardingStop: leg1.leg1Stops[0].name.trim(),
                dropStop: leg1.transferStopName,
                boardingDistanceKm: leg1.boardingDistanceKm || 0,
                distance: leg1.leg1Distance,
                estimatedTime: leg1Time,
                stops: leg1.leg1Stops.map(s => s.name.trim())
              },
              {
                busNumber: r2.route_number,
                from: leg1.transferStopName,
                to: stops2[dIndex2].name.trim(),
                boardingStop: leg1.transferStopName,
                dropStop: stops2[dIndex2].name.trim(),
                boardingDistanceKm: stops2[tIndex2].distance_km || 0,
                distance: leg2Distance,
                estimatedTime: leg2Time,
                stops: leg2Stops.map(s => s.name.trim())
              }
            ]
          });
        }
      }
    }
  }

  const uniqueTransfer = [];
  const seenSignatures = new Set();

  transferRoutes.sort((a, b) => a.totalEstimatedTime - b.totalEstimatedTime);

  for (const tr of transferRoutes) {
    const sig = `${tr.busNumbers[0]}->${tr.transferStops[0]}->${tr.busNumbers[1]}`;
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      uniqueTransfer.push(tr);
      if (uniqueTransfer.length >= 8) break;
    }
  }

  return uniqueTransfer;
}

async function formatJourneyForUi(routeObj, idPrefix, index, sourceInfo, destInfo, departureMinutes = null, customStopCoordsMap = null) {
  const coordsMap = customStopCoordsMap || getStaticStopCoordsMap();
  const isDirect = routeObj.transfers === 0;

  let totalFareAmount = 0;
  let fareBreakdown = [];
  let fareResult;

  if (isDirect) {
    const directDist = routeObj.distance || routeObj.totalDistance || 0;
    fareResult = await calculateFare(directDist, 'ordinary');
    totalFareAmount = fareResult.amount || 0;
    fareBreakdown = [
      {
        ticketNumber: 1,
        busNumber: routeObj.busNumber,
        from: sourceInfo.stopName,
        to: destInfo.stopName,
        distanceKm: directDist,
        fare: fareResult.formatted,
        fareAmount: fareResult.amount
      }
    ];
  } else {
    const legsList = routeObj.legs || [];
    let breakdownTextParts = [];
    for (let i = 0; i < legsList.length; i++) {
      const leg = legsList[i];
      const legDist = leg.distance || 0;
      const legFare = await calculateFare(legDist, 'ordinary');
      const legAmount = legFare.amount || 0;
      totalFareAmount += legAmount;
      leg.fare = legFare.formatted;
      leg.fareAmount = legAmount;
      fareBreakdown.push({
        ticketNumber: i + 1,
        busNumber: leg.busNumber,
        from: leg.from,
        to: leg.to,
        distanceKm: legDist,
        fare: legFare.formatted,
        fareAmount: legAmount
      });
      breakdownTextParts.push(`Bus ${leg.busNumber}: ${legFare.formatted}`);
    }
    fareResult = {
      amount: totalFareAmount,
      formatted: `₹${totalFareAmount}`,
      currency: 'INR',
      breakdownText: breakdownTextParts.join(' + ') + ` = ₹${totalFareAmount}`,
      ticketCount: legsList.length
    };
  }

  let depMin = departureMinutes;
  if (depMin === null) {
    const ist = getCurrentIndiaTime();
    depMin = ist.totalMinutes;
  }

  const primaryBus = isDirect ? routeObj.busNumber : routeObj.legs?.[0]?.busNumber;
  const boardingDist = routeObj.boardingDistanceKm || 0;

  const scheduleInfo = calculateNextBusArrival({
    routeNumber: primaryBus,
    distanceToBoardingKm: boardingDist,
    departureMinutes: depMin,
    busSpeedKmh: CONFIG.AVG_BUS_SPEED_KMH
  });

  const effectiveDepMin = (scheduleInfo.isServiceActive || scheduleInfo.serviceStatus === 'before_first_bus')
    ? scheduleInfo.nextBusMinutes
    : depMin;

  const depTimeStr = formatMinutesToTimeStr(effectiveDepMin);
  const arrTimeStr = formatMinutesToTimeStr(effectiveDepMin + (routeObj.totalEstimatedTime || routeObj.estimatedTime));

  let summarySegments = [];
  let detailedSteps = [];
  let leg1DepStr = depTimeStr;
  let leg1ArrStr = arrTimeStr;
  let actualTransferWait = 5;
  let leg2DepStr = depTimeStr;
  let finalArrStr = arrTimeStr;

  const walkToStopMeters = sourceInfo.distanceKm ? Math.round(sourceInfo.distanceKm * 1000) : (sourceInfo.isExactMatch ? 60 : 250);
  const isConnectRide = sourceInfo.distanceKm && sourceInfo.distanceKm > 1.2;
  const connectMinutes = isConnectRide
    ? Math.max(8, Math.round(sourceInfo.distanceKm * 2))
    : (sourceInfo.isExactMatch ? 1 : Math.max(1, Math.round(walkToStopMeters / 80)));

  if (isDirect) {
    summarySegments = [
      {
        type: isConnectRide ? 'auto' : 'walk',
        label: isConnectRide ? 'Auto / Cab' : (sourceInfo.isExactMatch ? 'Board' : 'Walk'),
        duration: isConnectRide ? `~${connectMinutes} min` : `${connectMinutes} min`,
        time: depTimeStr
      },
      { type: 'bus', label: `Bus ${routeObj.busNumber}`, duration: `${routeObj.estimatedTime} min`, routeCode: routeObj.busNumber, time: depTimeStr },
      { type: 'walk', label: `Arrive ~${arrTimeStr}`, duration: '1 min', time: arrTimeStr }
    ];

    detailedSteps = [
      {
        stepIndex: 1,
        type: isConnectRide ? 'auto' : 'walk',
        title: isConnectRide
          ? `Take Auto / Cab / Transit to ${routeObj.boardingStop}`
          : (sourceInfo.isExactMatch ? `Board at ${routeObj.boardingStop}` : `Walk to ${routeObj.boardingStop}`),
        time: depTimeStr,
        duration: isConnectRide ? `~${connectMinutes} min` : `${connectMinutes} min`,
        instruction: isConnectRide
          ? `Take an auto, e-rickshaw, or cab from ${sourceInfo.query || 'your location'} to ${routeObj.boardingStop} (${sourceInfo.distanceKm.toFixed(1)} km, ~${connectMinutes} min). Board CTU Bus ${routeObj.busNumber} here at ${depTimeStr}.`
          : (sourceInfo.isExactMatch
            ? `Head to platform/bay for Bus ${routeObj.busNumber} at ${routeObj.boardingStop}. Departure at ${depTimeStr}.`
            : `Walk from ${sourceInfo.query} to the nearest bus stop at ${routeObj.boardingStop} (${sourceInfo.distanceKm} km). Departure at ${depTimeStr}.`)
      },
      {
        stepIndex: 2,
        type: 'bus',
        title: `Take Direct Bus ${routeObj.busNumber}`,
        time: `${depTimeStr} → ${arrTimeStr}`,
        lineCode: routeObj.busNumber,
        routeName: `${routeObj.boardingStop} → ${routeObj.dropStop}`,
        duration: `${routeObj.estimatedTime} min`,
        stopsCount: routeObj.intermediateStopsCount || (routeObj.stops?.length || 2) - 2,
        instruction: `Board CTU Bus ${routeObj.busNumber} at ${depTimeStr}. Ride for ${routeObj.distance} km across ${routeObj.stops?.length || 0} stops. Alight at ${routeObj.dropStop} at approx ${arrTimeStr}.`
      },
      {
        stepIndex: 3,
        type: 'walk',
        title: `Arrive at ${destInfo.query}`,
        time: arrTimeStr,
        duration: '1 min',
        instruction: `Arrive at destination ${destInfo.query} at approx ${arrTimeStr}.`
      }
    ];
  } else {
    const leg1 = routeObj.legs[0];
    const leg2 = routeObj.legs[1];
    const transferStop = routeObj.transferStops[0];

    leg1DepStr = depTimeStr;
    const leg1ArrMin = effectiveDepMin + leg1.estimatedTime;
    leg1ArrStr = formatMinutesToTimeStr(leg1ArrMin);

    const leg2BoardingDist = leg2.boardingDistanceKm || 0;
    const leg2Schedule = calculateNextBusArrival({
      routeNumber: leg2.busNumber,
      distanceToBoardingKm: leg2BoardingDist,
      departureMinutes: leg1ArrMin + (routeObj.transferWaitMinutes || 5),
      busSpeedKmh: CONFIG.AVG_BUS_SPEED_KMH
    });

    const leg2DepMin = (leg2Schedule.isServiceActive || leg2Schedule.serviceStatus === 'before_first_bus')
      ? leg2Schedule.nextBusMinutes
      : leg1ArrMin + (routeObj.transferWaitMinutes || 5);

    leg2DepStr = formatMinutesToTimeStr(leg2DepMin);
    actualTransferWait = Math.max(2, leg2DepMin - leg1ArrMin);
    const finalArrMin = leg2DepMin + leg2.estimatedTime;
    finalArrStr = formatMinutesToTimeStr(finalArrMin);

    summarySegments = [
      ...(isConnectRide ? [{ type: 'auto', label: 'Auto / Cab', duration: `~${connectMinutes} min`, time: depTimeStr }] : []),
      { type: 'bus', label: `Bus ${leg1.busNumber}`, duration: `${leg1.estimatedTime} min`, routeCode: leg1.busNumber, time: leg1DepStr },
      { type: 'transfer', label: `Change @ ${transferStop}`, duration: `${actualTransferWait} min`, time: leg1ArrStr },
      { type: 'bus', label: `Bus ${leg2.busNumber}`, duration: `${leg2.estimatedTime} min`, routeCode: leg2.busNumber, time: leg2DepStr }
    ];

    detailedSteps = [
      ...(isConnectRide ? [{
        stepIndex: 1,
        type: 'auto',
        title: `Take Auto / Cab / Transit to ${leg1.from}`,
        time: depTimeStr,
        duration: `~${connectMinutes} min`,
        instruction: `Take an auto, e-rickshaw, or cab from ${sourceInfo.query || 'your location'} to ${leg1.from} (${sourceInfo.distanceKm.toFixed(1)} km, ~${connectMinutes} min). Connect to CTU Bus ${leg1.busNumber}.`
      }] : []),
      {
        stepIndex: isConnectRide ? 2 : 1,
        type: 'bus',
        title: `Take Bus ${leg1.busNumber} from ${leg1.from}`,
        time: `${leg1DepStr} → ${leg1ArrStr}`,
        lineCode: leg1.busNumber,
        routeName: `${leg1.from} → ${transferStop}`,
        duration: `${leg1.estimatedTime} min`,
        stopsCount: leg1.stops?.length || 0,
        fare: leg1.fare || '₹10',
        fareAmount: leg1.fareAmount || 10,
        instruction: `Board CTU Bus ${leg1.busNumber} at ${leg1.from} at ${leg1DepStr}. Ride ${leg1.distance} km towards ${transferStop}, arriving at ~${leg1ArrStr}. (Ticket: ${leg1.fare || '₹10'})`
      },
      {
        stepIndex: isConnectRide ? 3 : 2,
        type: 'transfer',
        title: `Transfer at ${transferStop}`,
        time: `${leg1ArrStr} → ${leg2DepStr}`,
        duration: `${actualTransferWait} min`,
        instruction: `Alight from Bus ${leg1.busNumber} at ${transferStop} at ${leg1ArrStr}. Wait ~${actualTransferWait} min. Board connecting Bus ${leg2.busNumber} at ${leg2DepStr}.`
      },
      {
        stepIndex: isConnectRide ? 4 : 3,
        type: 'bus',
        title: `Take Bus ${leg2.busNumber} to ${leg2.to}`,
        time: `${leg2DepStr} → ${finalArrStr}`,
        lineCode: leg2.busNumber,
        routeName: `${transferStop} → ${leg2.to}`,
        duration: `${leg2.estimatedTime} min`,
        stopsCount: leg2.stops?.length || 0,
        fare: leg2.fare || '₹10',
        fareAmount: leg2.fareAmount || 10,
        instruction: `Board connecting CTU Bus ${leg2.busNumber} at ${leg2DepStr}. Ride ${leg2.distance} km and alight at ${leg2.to} at approx ${finalArrStr}. (Ticket: ${leg2.fare || '₹10'})`
      }
    ];
  }

  const allRouteStops = isDirect
    ? (routeObj.stops || [])
    : [
        ...(routeObj.legs?.[0]?.stops || []),
        ...(routeObj.legs?.[1]?.stops ? routeObj.legs[1].stops.slice(1) : [])
      ];

  const nominalDuration = routeObj.totalEstimatedTime || routeObj.estimatedTime;
  const trafficInfo = calculateCorridorTraffic({
    stops: allRouteStops,
    distanceKm: routeObj.totalDistance || routeObj.distance,
    nominalMinutes: nominalDuration,
    departureMinutes: effectiveDepMin
  });
  const trafficArrTimeStr = formatMinutesToTimeStr(effectiveDepMin + trafficInfo.trafficDurationMinutes);

  const { SECTOR_COORDINATES: secCoordsTable } = require('./geocodingService');
  const stopDetails = allRouteStops.map((stopName, sIdx) => {
    const norm = normalizeStopName(stopName);
    let c = coordsMap.get(norm);
    if (!c && secCoordsTable) {
      const mDiv = stopName.match(/sector\s*(\d+)\s*[\/&]\s*(\d+)/i);
      if (mDiv) {
        const s1 = secCoordsTable[parseInt(mDiv[1], 10)];
        const s2 = secCoordsTable[parseInt(mDiv[2], 10)];
        if (s1 && s2) {
          c = { lat: parseFloat(((s1.lat + s2.lat) / 2).toFixed(4)), lng: parseFloat(((s1.lng + s2.lng) / 2).toFixed(4)), name: stopName };
        } else if (s1) {
          c = { lat: s1.lat, lng: s1.lng, name: stopName };
        }
      } else {
        const mSingle = stopName.match(/sector\s*(\d+)/i);
        if (mSingle && secCoordsTable[parseInt(mSingle[1], 10)]) {
          const s = secCoordsTable[parseInt(mSingle[1], 10)];
          c = { lat: s.lat, lng: s.lng, name: stopName };
        }
      }
    }
    return {
      name: stopName,
      lat: c ? c.lat : 30.7333,
      lng: c ? c.lng : 76.7794,
      order: sIdx + 1,
      isBoarding: sIdx === 0,
      isAlighting: sIdx === allRouteStops.length - 1,
      isTransfer: !isDirect && routeObj.transferStops?.some(ts => normalizeStopName(ts) === norm)
    };
  });

  const boardingStopName = isDirect ? routeObj.boardingStop : routeObj.legs[0].boardingStop;
  const alightingStopName = isDirect ? routeObj.dropStop : routeObj.legs[1].dropStop;

  const checkpoints = [
    {
      id: 'cp-start-walk',
      checkpointIndex: 1,
      type: isConnectRide ? 'transit_connect' : 'walk_to_stop',
      title: isConnectRide ? `Connect to ${boardingStopName} (Auto / Cab / Transit)` : `Walk to ${boardingStopName}`,
      from: sourceInfo.query || 'Your Location',
      to: boardingStopName,
      distanceMeters: walkToStopMeters,
      distanceText: isConnectRide ? `${sourceInfo.distanceKm.toFixed(1)} km` : `${walkToStopMeters} m`,
      duration: isConnectRide ? `~${connectMinutes} min ride` : (sourceInfo.isExactMatch ? '1 min walk' : `${connectMinutes} min walk`),
      instruction: isConnectRide
        ? `Take an auto, e-rickshaw, or cab from ${sourceInfo.query || 'your location'} to ${boardingStopName} (${sourceInfo.distanceKm.toFixed(1)} km, ~${connectMinutes} min). Bus departs at ${depTimeStr}.`
        : `Head to ${boardingStopName} (${walkToStopMeters} m from you). Bus departs at ${depTimeStr}.`,
      status: 'active'
    },
    ...(isDirect ? [
      {
        id: 'cp-bus-leg',
        checkpointIndex: 2,
        type: 'bus_ride',
        title: `Ride CTU Bus ${routeObj.busNumber}`,
        busNumber: routeObj.busNumber,
        from: boardingStopName,
        to: alightingStopName,
        distanceKm: routeObj.distance,
        distanceText: `${routeObj.distance} km`,
        nominalDuration: `${routeObj.estimatedTime} min`,
        trafficDuration: `${trafficInfo.trafficDurationMinutes} min`,
        departureTime: depTimeStr,
        arrivalTime: arrTimeStr,
        trafficArrivalTime: trafficArrTimeStr,
        stopsCount: routeObj.intermediateStopsCount || Math.max(1, (routeObj.stops?.length || 2) - 2),
        intermediateStops: routeObj.stops || [],
        instruction: `Board Bus ${routeObj.busNumber}. Ride across ${routeObj.stops?.length || 0} stops to ${alightingStopName}.`,
        status: 'upcoming'
      }
    ] : [
      {
        id: 'cp-leg-1',
        checkpointIndex: 2,
        type: 'bus_ride',
        title: `Ride Bus ${routeObj.legs[0].busNumber} to ${routeObj.transferStops[0]}`,
        busNumber: routeObj.legs[0].busNumber,
        from: routeObj.legs[0].from,
        to: routeObj.transferStops[0],
        distanceKm: routeObj.legs[0].distance,
        distanceText: `${routeObj.legs[0].distance} km`,
        duration: `${routeObj.legs[0].estimatedTime} min`,
        fare: routeObj.legs[0].fare || '₹10',
        fareAmount: routeObj.legs[0].fareAmount || 10,
        departureTime: leg1DepStr,
        arrivalTime: leg1ArrStr,
        stopsCount: routeObj.legs[0].stops?.length || 0,
        intermediateStops: routeObj.legs[0].stops || [],
        instruction: `Board CTU Bus ${routeObj.legs[0].busNumber} at ${routeObj.legs[0].from}. Alight at ${routeObj.transferStops[0]}. (Ticket: ${routeObj.legs[0].fare || '₹10'})`,
        status: 'upcoming'
      },
      {
        id: 'cp-transfer',
        checkpointIndex: 3,
        type: 'transfer_hub',
        title: `Interchange at ${routeObj.transferStops[0]}`,
        hub: routeObj.transferStops[0],
        waitMinutes: actualTransferWait,
        connectingBus: routeObj.legs[1].busNumber,
        connectingDepartureTime: leg2DepStr,
        instruction: `Transfer at ${routeObj.transferStops[0]}. Wait ~${actualTransferWait} min for Bus ${routeObj.legs[1].busNumber}.`,
        status: 'upcoming'
      },
      {
        id: 'cp-leg-2',
        checkpointIndex: 4,
        type: 'bus_ride',
        title: `Ride Bus ${routeObj.legs[1].busNumber} to ${routeObj.legs[1].to}`,
        busNumber: routeObj.legs[1].busNumber,
        from: routeObj.transferStops[0],
        to: routeObj.legs[1].to,
        distanceKm: routeObj.legs[1].distance,
        distanceText: `${routeObj.legs[1].distance} km`,
        duration: `${routeObj.legs[1].estimatedTime} min`,
        fare: routeObj.legs[1].fare || '₹10',
        fareAmount: routeObj.legs[1].fareAmount || 10,
        departureTime: leg2DepStr,
        arrivalTime: finalArrStr,
        stopsCount: routeObj.legs[1].stops?.length || 0,
        intermediateStops: routeObj.legs[1].stops || [],
        instruction: `Board connecting Bus ${routeObj.legs[1].busNumber}. Ride ${routeObj.legs[1].distance} km to ${routeObj.legs[1].to}. (Ticket: ${routeObj.legs[1].fare || '₹10'})`,
        status: 'upcoming'
      }
    ]),
    {
      id: 'cp-arrive',
      checkpointIndex: isDirect ? 3 : 5,
      type: 'arrive_destination',
      title: `Arrive at ${destInfo.query}`,
      to: destInfo.query,
      instruction: `Arrive at destination ${destInfo.query} at approx ${trafficInfo.delayMinutes > 2 ? trafficArrTimeStr : arrTimeStr}.`,
      status: 'upcoming'
    }
  ];

  const originInfo = {
    query: sourceInfo.query || sourceInfo.stopName,
    stopName: sourceInfo.stopName,
    isExactMatch: sourceInfo.isExactMatch,
    distanceKm: sourceInfo.distanceKm || 0,
    lat: sourceInfo.coordinates?.lat || sourceInfo.lat || (sourceInfo.matchedStop?.location?.coordinates?.[1]) || null,
    lng: sourceInfo.coordinates?.lng || sourceInfo.lng || (sourceInfo.matchedStop?.location?.coordinates?.[0]) || null,
    resolvedAddress: sourceInfo.resolvedAddress || sourceInfo.stopName
  };

  const destinationInfo = {
    query: destInfo.query || destInfo.stopName,
    stopName: destInfo.stopName,
    isExactMatch: destInfo.isExactMatch,
    distanceKm: destInfo.distanceKm || 0,
    lat: destInfo.coordinates?.lat || destInfo.lat || (destInfo.matchedStop?.location?.coordinates?.[1]) || null,
    lng: destInfo.coordinates?.lng || destInfo.lng || (destInfo.matchedStop?.location?.coordinates?.[0]) || null,
    resolvedAddress: destInfo.resolvedAddress || destInfo.stopName
  };

  return {
    id: `${idPrefix}-${index + 1}`,
    origin: sourceInfo.query || sourceInfo.stopName,
    destination: destInfo.query || destInfo.stopName,
    originInfo,
    destinationInfo,
    startLocation: {
      name: sourceInfo.query || sourceInfo.stopName,
      resolvedName: sourceInfo.resolvedAddress || sourceInfo.stopName,
      lat: originInfo.lat,
      lng: originInfo.lng,
      isExactMatch: sourceInfo.isExactMatch,
      distanceKm: sourceInfo.distanceKm || 0
    },
    destinationLocation: {
      name: destInfo.query || destInfo.stopName,
      resolvedName: destInfo.resolvedAddress || destInfo.stopName,
      lat: destinationInfo.lat,
      lng: destinationInfo.lng,
      isExactMatch: destInfo.isExactMatch,
      distanceKm: destInfo.distanceKm || 0
    },
    type: isDirect ? 'direct' : 'transfer',
    tag: isDirect ? 'DIRECT BUS' : 'BUS CHANGE',
    departureTime: depTimeStr,
    arrivalTime: arrTimeStr,
    trafficArrivalTime: trafficArrTimeStr,
    scheduleSummary: `${depTimeStr} → ${arrTimeStr}`,
    totalTime: `${routeObj.totalEstimatedTime || routeObj.estimatedTime} min`,
    totalTimeMinutes: routeObj.totalEstimatedTime || routeObj.estimatedTime,
    trafficTotalTime: `${trafficInfo.trafficDurationMinutes} min`,
    trafficTotalTimeMinutes: trafficInfo.trafficDurationMinutes,
    fare: fareResult.formatted,
    fareAmount: totalFareAmount,
    fareBreakdown,
    ticketCount: isDirect ? 1 : (routeObj.legs?.length || 1),
    fareSummary: isDirect
      ? `${fareResult.formatted} (1 ticket)`
      : `${fareBreakdown.map(b => `${b.busNumber}: ${b.fare}`).join(' + ')} = ${fareResult.formatted} (${fareBreakdown.length} tickets)`,
    walkingTime: isConnectRide ? `~${connectMinutes} min auto/cab` : (isDirect ? (sourceInfo.isExactMatch ? '1 min' : '3 min') : '4 min'),
    isFirstMileConnect: isConnectRide,
    firstMileDistanceKm: sourceInfo.distanceKm || 0,
    distanceKm: routeObj.totalDistance || routeObj.distance,
    transfersCount: isDirect ? 'Direct • 0 transfers' : `${routeObj.transfers} transfer (${routeObj.transferStops.join(', ')})`,
    transfersNum: routeObj.transfers || 0,
    busNumber: routeObj.busNumber || routeObj.busNumbers?.[0] || 'CTU Express',
    busNumbers: routeObj.busNumbers || (routeObj.busNumber ? [routeObj.busNumber] : []),
    transferStops: routeObj.transferStops || [],
    legs: (routeObj.legs || []).map((l) => ({
      ...l,
      stopDetails: (l.stops || []).map((sName, sI) => {
        const norm = normalizeStopName(sName);
        const c = coordsMap.get(norm);
        return {
          name: sName,
          lat: c ? c.lat : 30.7333,
          lng: c ? c.lng : 76.7794,
          order: sI + 1
        };
      })
    })),
    stops: routeObj.stops || [],
    stopDetails,
    checkpoints,
    trafficInfo,
    highlight: isDirect,
    scheduleInfo: {
      nextBusInMinutes: scheduleInfo.waitMinutes,
      nextBusTime: scheduleInfo.nextBusTime,
      frequencyDisplay: scheduleInfo.frequencyDisplay,
      operatingHoursDisplay: scheduleInfo.operatingHoursDisplay,
      upcomingDepartures: scheduleInfo.upcomingDepartures,
      isServiceActive: scheduleInfo.isServiceActive,
      serviceStatus: scheduleInfo.serviceStatus,
      notice: scheduleInfo.notice
    },
    summarySegments,
    detailedSteps
  };
}

async function calculateJourneys({ origin, destination, preferences = {}, departureTime = null }) {

  if (!origin || !destination) {
    throw new Error('Both source and destination must be provided.');
  }

  const explicitTime = departureTime || preferences.departureTime || preferences.time || null;
  const istNow = getCurrentIndiaTime();
  let departureMinutes = parseTimeToMinutes(explicitTime);
  if (departureMinutes === null || preferences.timingMode === 'now') {
    departureMinutes = istNow.totalMinutes;
  }
  const departureTimeStr = formatMinutesToTimeStr(departureMinutes);

  const origRaw = typeof origin === 'string' ? origin.trim().toLowerCase() : '';
  const destRaw = typeof destination === 'string' ? destination.trim().toLowerCase() : '';

  if (origRaw && destRaw && origRaw === destRaw) {
    return {
      isSameLocation: true,
      message: 'The source and destination are the same.',
      departureTime: departureTimeStr,
      directRoutes: [],
      transferRoutes: [],
      availableRoutes: []
    };
  }

  let allStops = [];
  const mongoose = require('mongoose');
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      allStops = await Stop.find({}).lean();
    } catch (e) {}
  }
  const sourceMatch = await matchLocation(origin, allStops);
  const destMatch = await matchLocation(destination, allStops);

  if (!sourceMatch) {
    return {
      locationNotFound: true,
      notFoundType: 'source',
      message: `Location '${typeof origin === 'string' ? origin : 'Source'}' not found in the current CTU data.`,
      departureTime: departureTimeStr,
      directRoutes: [],
      transferRoutes: [],
      availableRoutes: []
    };
  }

  if (!destMatch) {
    return {
      locationNotFound: true,
      notFoundType: 'destination',
      message: `Location '${typeof destination === 'string' ? destination : 'Destination'}' not found in the current CTU data.`,
      departureTime: departureTimeStr,
      directRoutes: [],
      transferRoutes: [],
      availableRoutes: []
    };
  }

  if (sourceMatch.stopName.toLowerCase() === destMatch.stopName.toLowerCase()) {
    return {
      isSameLocation: true,
      message: `Both locations correspond to the same bus stop (${sourceMatch.stopName}).`,
      sourceStop: sourceMatch,
      destinationStop: destMatch,
      departureTime: departureTimeStr,
      directRoutes: [],
      transferRoutes: [],
      availableRoutes: []
    };
  }

  const rawDirect = findDirectRoutes(sourceMatch.stopName, destMatch.stopName, departureMinutes);
  const rawTransfer = findTransferRoutes(sourceMatch.stopName, destMatch.stopName, rawDirect, departureMinutes);

  const stopCoordsMap = buildStopCoordsMap(allStops);

  const directUi = await Promise.all(
    rawDirect.map((r, i) => formatJourneyForUi(r, 'dir', i, sourceMatch, destMatch, departureMinutes, stopCoordsMap))
  );

  const transferUi = await Promise.all(
    rawTransfer.map((r, i) => formatJourneyForUi(r, 'xfr', i, sourceMatch, destMatch, departureMinutes, stopCoordsMap))
  );

  const availableRoutes = [...directUi, ...transferUi];

  return {
    source: typeof origin === 'string' ? origin : sourceMatch.stopName,
    destination: typeof destination === 'string' ? destination : destMatch.stopName,
    departureTime: departureTimeStr,
    departureMinutes,
    indiaTime: istNow.timeStr12,
    timingMode: preferences.timingMode || (explicitTime ? 'later' : 'now'),
    sourceStop: {
      name: sourceMatch.stopName,
      isExactMatch: sourceMatch.isExactMatch,
      distanceKm: sourceMatch.distanceKm,
      lat: sourceMatch.lat || sourceMatch.coordinates?.lat || null,
      lng: sourceMatch.lng || sourceMatch.coordinates?.lng || null,
      resolvedAddress: sourceMatch.resolvedAddress || sourceMatch.stopName,
      note: sourceMatch.note
    },
    destinationStop: {
      name: destMatch.stopName,
      isExactMatch: destMatch.isExactMatch,
      distanceKm: destMatch.distanceKm,
      lat: destMatch.lat || destMatch.coordinates?.lat || null,
      lng: destMatch.lng || destMatch.coordinates?.lng || null,
      resolvedAddress: destMatch.resolvedAddress || destMatch.stopName,
      note: destMatch.note
    },
    directRoutes: rawDirect,
    transferRoutes: rawTransfer,
    directUi,
    transferUi,
    availableRoutes,
    journeys: availableRoutes,
    config: {
      averageSpeedKmh: CONFIG.AVG_BUS_SPEED_KMH,
      transferWaitMinutes: CONFIG.TRANSFER_WAIT_MINUTES
    }
  };
}

module.exports = {
  calculateJourneys,
  findDirectRoutes,
  findTransferRoutes,
  formatJourneyForUi,
  buildStopCoordsMap,
  calculateTravelTimeMinutes,
  parseTimeToMinutes,
  formatMinutesToTimeStr,
  normalizeStopName,
  CONFIG
};

