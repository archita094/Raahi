
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Route = require('../models/Route');
const Stop = require('../models/Stop');
const { geocode, TRICITY_LOCATION_DB } = require('../services/geocodingService');
const { calculateFare } = require('../services/fareService');
const { getRouteSchedule } = require('../services/scheduleService');

function estimateTravelTimeMinutes(distanceKm, stopCount) {
  const driveMinutes = (distanceKm / 22) * 60;
  const dwellMinutes = (stopCount * 40) / 60;
  return Math.round(driveMinutes + dwellMinutes);
}

let activeImportPromise = null;

async function importDistanceRoutes() {
  if (activeImportPromise) {
    return activeImportPromise;
  }

  activeImportPromise = (async () => {
    const jsonPath = path.join(__dirname, '../data/ctu_distance_routes.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Data file not found: ${jsonPath}`);
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`\nImporting ${rawData.routes.length} bidirectional distance routes from user JSON...`);

    console.log('Purging older routes, stops, and fare collections from database...');
    await Route.deleteMany({});
    await Stop.deleteMany({});
    try {
      await mongoose.connection.db.collection('farerules').drop();
      console.log('Dropped legacy farerules collection.');
    } catch (err) {

    }

  const enrichedStopsMap = {};
  const enrichmentFiles = [
    path.join(__dirname, '../data/stops_enriched.json'),
    path.join(__dirname, '../data/stops_for_gemini_enrichment.json')
  ];
  for (const ef of enrichmentFiles) {
    if (fs.existsSync(ef)) {
      const list = JSON.parse(fs.readFileSync(ef, 'utf8'));
      list.forEach(s => {
        if (s.name) {
          enrichedStopsMap[s.name.trim().toLowerCase()] = s;
        }
      });
      break;
    }
  }

  const stopNameToDoc = new Map();
  const stopDocsToInsert = [];

  for (const route of rawData.routes) {
    for (const dir of ['going', 'returning']) {
      if (!route[dir] || !route[dir].stops) continue;
      for (const stop of route[dir].stops) {
        const stopName = stop.name.trim();
        const norm = stopName.toLowerCase();

        if (!stopNameToDoc.has(norm)) {
          let geo = null;
          if (TRICITY_LOCATION_DB[norm]) {
            const hit = TRICITY_LOCATION_DB[norm];
            geo = { longitude: hit.lng, latitude: hit.lat, sector: hit.sector };
          } else if (enrichedStopsMap[norm]) {
            geo = enrichedStopsMap[norm];
          } else {
            geo = await geocode(stopName);
          }

          const lng = geo?.longitude || 76.7794;
          const lat = geo?.latitude || 30.7333;
          const sector = geo?.sector || null;

          const stopDoc = new Stop({
            name: stopName,
            normalizedName: norm,
            sector: sector,
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            source: 'CTU JSON'
          });

          stopDocsToInsert.push(stopDoc);
          stopNameToDoc.set(norm, stopDoc);
        }
      }
    }
  }

  try {
    await Stop.insertMany(stopDocsToInsert, { ordered: false });
    console.log(`Inserted ${stopDocsToInsert.length} unique stops into MongoDB (source: 'CTU JSON').`);
  } catch (err) {
    if (err.code !== 11000 && !err.message?.includes('E11000')) {
      throw err;
    }
  }

  const parsedRoutesForJson = [];
  const routeDocsToInsert = [];

  for (const route of rawData.routes) {
    const routeNumber = route.route_number;
    const sched = getRouteSchedule(routeNumber);
    const directions = [];

    for (const dir of ['going', 'returning']) {
      if (!route[dir] || !route[dir].stops) continue;
      const dirData = route[dir];
      const stopIds = [];
      const stopNames = [];
      let totalDistance = 0;

      dirData.stops.forEach(s => {
        const norm = s.name.trim().toLowerCase();
        const doc = stopNameToDoc.get(norm);
        if (doc) stopIds.push(doc._id);
        stopNames.push(s.name.trim());
        if (s.distance_km > totalDistance) {
          totalDistance = s.distance_km;
        }
      });

      const estMinutes = estimateTravelTimeMinutes(totalDistance, stopNames.length);
      const fareInfo = await calculateFare(totalDistance, 'ordinary');

      directions.push({
        directionName: dir === 'going' ? 'Outbound' : 'Return',
        from: dirData.from,
        to: dirData.to,
        stops: stopIds,
        stopNames: stopNames,
        distanceKm: totalDistance,
        estimatedDurationMinutes: estMinutes,
        fare: fareInfo.formatted,
        operatingTime: {
          start: sched?.firstBusRaw || '06:00 AM',
          end: sched?.lastBusRaw || '09:00 PM'
        },
        rawTimeText: sched?.frequencyRaw || '20 min'
      });
    }

    const maxDist = Math.max(...directions.map(d => d.distanceKm || 0));
    const freqVal = sched?.frequencyMinutes || 25;

    const routeDoc = new Route({
      routeNumber: routeNumber,
      description: `${directions[0]?.from} to ${directions[0]?.to} (via ${directions[0]?.stopNames?.slice(1, -1)?.slice(0, 3)?.join(', ')})`,
      directions: directions,
      distanceKm: maxDist,
      frequencyMinutes: { min: freqVal, max: freqVal },
      source: 'CTU JSON'
    });

    routeDocsToInsert.push(routeDoc);

    parsedRoutesForJson.push({
      routeNumber: routeNumber,
      source: directions[0]?.from,
      destination: directions[0]?.to,
      description: `${directions[0]?.from} to ${directions[0]?.to}`,
      stops: directions[0]?.stopNames,
      returnStops: directions[1]?.stopNames,
      distanceKm: maxDist,
      frequencyMinutes: { min: freqVal, max: freqVal },
      frequencyDisplay: sched?.frequencyRaw || `${freqVal} min`,
      firstBus: sched?.firstBusRaw || '06:00 AM',
      lastBus: sched?.lastBusRaw || '09:00 PM',
      estimatedTimeMinutes: directions[0]?.estimatedDurationMinutes,
      fare: directions[0]?.fare
    });
  }

  await Route.insertMany(routeDocsToInsert);
  console.log(`Inserted ${routeDocsToInsert.length} routes into MongoDB (source: 'CTU JSON').`);

  const exportPath = path.join(__dirname, '../data/routes_parsed.json');
  fs.writeFileSync(exportPath, JSON.stringify(parsedRoutesForJson, null, 2));
  console.log(`Saved ${parsedRoutesForJson.length} routes to ${exportPath}`);

    return {
      routesImported: routeDocsToInsert.length,
      stopsImported: stopDocsToInsert.length
    };
  })().finally(() => {
    activeImportPromise = null;
  });

  return activeImportPromise;
}

async function run() {
  let mongoServer = null;
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/raahi';

  try {
    console.log('Connecting to MongoDB at:', uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    console.log('Local MongoDB not running. Using MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to MongoMemoryServer:', uri);
  }

  try {
    const result = await importDistanceRoutes();
    console.log('\n========================================');
    console.log('IMPORT SUCCESSFUL:');
    console.log(`Routes processed: ${result.routesImported}`);
    console.log(`Stops indexed:    ${result.stopsImported}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { importDistanceRoutes };

