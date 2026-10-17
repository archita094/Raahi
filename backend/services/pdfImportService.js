const fs = require('fs');
const path = require('path');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const FareRule = require('../models/FareRule');
const { geocode } = require('./geocodingService');

function normalizeStopName(rawName) {
  if (!rawName || !rawName.trim()) return 'Sector 17 ISBT';
  let clean = rawName.trim();

  if (/^isbt[\s\-]?17/i.test(clean) || /^17\s*mkt/i.test(clean) || /^17\/16/i.test(clean)) return 'Sector 17 ISBT';
  if (/^isbt[\s\-]?43/i.test(clean) || /^43\s*mkt/i.test(clean) || /^43\/44/i.test(clean)) return 'Sector 43 ISBT';
  if (/^pgi/i.test(clean) || /^new opd/i.test(clean)) return 'PGIMER Hospital';
  if (/^panjab university/i.test(clean) || /^uni/i.test(clean) || /^pu\b/i.test(clean)) return 'Panjab University (Sector 14)';
  if (/^r\/stn/i.test(clean) || /^r\/station/i.test(clean) || /^railway station/i.test(clean)) return 'Chandigarh Railway Station';
  if (/^m\.majra/i.test(clean) || /^manimajra/i.test(clean) || /^m\/complex/i.test(clean) || /^m\.m\. town/i.test(clean)) return 'Manimajra Bus Stand';
  if (/^elante/i.test(clean)) return 'Elante Mall';
  if (/^ram\s*darbar/i.test(clean) || /^r\/d/i.test(clean)) return 'Ram Darbar';
  if (/^maloya/i.test(clean) || /^new maloya/i.test(clean)) return 'New Maloya Colony';
  if (/^dhanas/i.test(clean)) return 'Dhanas Village';
  if (/^mansa\s*devi/i.test(clean)) return 'Mansa Devi Complex';
  if (/^sukhna/i.test(clean)) return 'Sukhna Lake';
  if (/^rock\s*garden/i.test(clean)) return 'Rock Garden';
  if (/^tribune/i.test(clean)) return 'Tribune Chowk';
  if (/^housing board/i.test(clean) || /^h\/b/i.test(clean)) return 'Housing Board Chowk';

  const secMatch = clean.match(/^(?:sec|sector)[\s\-]*(\d+)/i) || clean.match(/^(\d+)\s*mkt/i);
  if (secMatch) {
    return `Sector ${secMatch[1]} Market`;
  }

  return clean;
}

async function importCTUDataset(customDataPath = null) {
  const jsonPath = customDataPath || path.join(__dirname, '../data/routes_parsed.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Parsed routes dataset file not found at: ${jsonPath}`);
  }

  const rawRoutes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let routesFound = rawRoutes.length;
  let routesImported = 0;
  let stopsFoundCount = 0;
  let duplicatesCount = 0;
  let invalidRecordsCount = 0;
  const errors = [];

  const stopDocMap = new Map();
  const rawToNormalizedMap = new Map();

  for (const route of rawRoutes) {
    if (!route.routeNumber) {
      invalidRecordsCount++;
      continue;
    }

    const routeStops = route.stops || [route.source, route.destination];
    stopsFoundCount += routeStops.length;

    for (const rawStop of routeStops) {
      if (!rawStop) continue;
      const normalized = normalizeStopName(rawStop);
      rawToNormalizedMap.set(rawStop, normalized);

      if (!stopDocMap.has(normalized)) {
        try {
          const geo = await geocode(normalized);
          stopDocMap.set(normalized, {
            name: normalized,
            normalizedName: normalized.toLowerCase(),
            aliases: [rawStop],
            sector: geo.sector,
            location: geo.location
          });
        } catch (e) {
          errors.push(`Geocoding error for stop '${rawStop}': ${e.message}`);
        }
      } else {
        duplicatesCount++;
        const existing = stopDocMap.get(normalized);
        if (!existing.aliases.includes(rawStop)) {
          existing.aliases.push(rawStop);
        }
      }
    }
  }

  await Stop.deleteMany({});
  await Route.deleteMany({});
  await FareRule.deleteMany({});

  const stopDocsList = Array.from(stopDocMap.values());
  const insertedStops = await Stop.insertMany(stopDocsList);

  const stopIdMap = new Map();
  insertedStops.forEach(doc => {
    stopIdMap.set(doc.name, doc._id);
  });

  for (const route of rawRoutes) {
    if (!route.routeNumber) continue;

    const rawStops = route.stops || [route.source, route.destination];
    const forwardStopNames = rawStops.map(s => normalizeStopName(s));

    const forwardStopIds = forwardStopNames
      .map(name => stopIdMap.get(name))
      .filter(id => id != null);

    const fromName = normalizeStopName(route.source);
    const toName = normalizeStopName(route.destination);

    const directions = [{
      from: fromName,
      to: toName,
      stops: forwardStopIds,
      stopNames: forwardStopNames,
      operatingTime: {
        start: route.operatingTime?.start || '06:00 AM',
        end: route.operatingTime?.end || '09:00 PM'
      },
      rawTimeText: route.operatingTime?.raw || null
    }];

    if (fromName.toLowerCase() !== toName.toLowerCase()) {
      const reverseStopNames = [...forwardStopNames].reverse();
      const reverseStopIds = [...forwardStopIds].reverse();
      directions.push({
        from: toName,
        to: fromName,
        stops: reverseStopIds,
        stopNames: reverseStopNames,
        operatingTime: {
          start: route.operatingTime?.start || '06:30 AM',
          end: route.operatingTime?.end || '08:30 PM'
        },
        rawTimeText: route.operatingTime?.raw || null
      });
    }

    const routeDoc = new Route({
      routeNumber: route.routeNumber,
      srNo: route.srNo,
      description: route.description,
      directions: directions,
      frequencyMinutes: route.frequencyMinutes || { min: 20, max: 30 },
      distanceKm: route.distanceKm || 15,
      numberOfBuses: route.numberOfBuses || 4,
      source: route.dataSource || 'CTU timetable',
      sourceDate: route.sourceDate || '2026-07-25'
    });

    await routeDoc.save();
    routesImported++;
  }

  const fareRulesData = [
    { busType: 'all', minDistanceKm: 0, maxDistanceKm: 5, fareAmount: 10 },
    { busType: 'all', minDistanceKm: 5.001, maxDistanceKm: 10, fareAmount: 25 },
    { busType: 'all', minDistanceKm: 10.001, maxDistanceKm: 15, fareAmount: 40 },
    { busType: 'all', minDistanceKm: 15.001, maxDistanceKm: 999, fareAmount: 45 }
  ];
  await FareRule.insertMany(fareRulesData);

  return {
    success: true,
    routesFound,
    routesImported,
    stopsFound: stopsFoundCount,
    stopsImported: insertedStops.length,
    duplicates: duplicatesCount,
    invalidRecords: invalidRecordsCount,
    errors
  };
}

module.exports = {
  importCTUDataset,
  normalizeStopName
};

