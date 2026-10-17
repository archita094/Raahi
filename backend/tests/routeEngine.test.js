const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { importDistanceRoutes } = require('../scripts/import_distance_routes');
const { calculateJourneys } = require('../services/routeEngine');
const { optimizeAndCategorizeJourneys } = require('../services/optimizerService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await importDistanceRoutes();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Route Engine & Optimizer Core Tests', () => {
  test('calculates direct bus routes between known stops', async () => {
    const result = await calculateJourneys({
      origin: 'ISBT 43',
      destination: 'ISBT 17'
    });

    expect(result).toBeDefined();
    expect(result.journeys.length).toBeGreaterThan(0);
    const firstJourney = result.journeys[0];
    expect(firstJourney.summarySegments).toBeDefined();
    expect(firstJourney.detailedSteps.length).toBeGreaterThan(0);
  });

  test('calculates 1-transfer routes when needed', async () => {
    const result = await calculateJourneys({
      origin: 'Kharar',
      destination: 'PGI'
    });

    expect(result).toBeDefined();
    expect(result.journeys.length).toBeGreaterThan(0);
  });

  test('correctly counts bus transfers excluding walk steps', async () => {
    const result = await calculateJourneys({
      origin: 'ISBT 43',
      destination: 'ISBT 17'
    });

    const journey = result.journeys[0];
    const busCount = journey.summarySegments.filter(s => s.type === 'bus').length;
    const expectedTransfers = Math.max(0, busCount - 1);

    expect(journey.transfersNum).toBe(expectedTransfers);
  });

  test('optimizer categorizes cheapest, fastest, shortest, and recommended routes', async () => {
    const rawResult = await calculateJourneys({
      origin: 'ISBT 43',
      destination: 'ISBT 17'
    });

    const categorized = optimizeAndCategorizeJourneys(rawResult.journeys, 'balanced');

    expect(categorized.recommendedRoute).toBeDefined();
    expect(categorized.cheapestRoute).toBeDefined();
    expect(categorized.fastestRoute).toBeDefined();
  });

  test('calculates journey times based on requested departureTime', async () => {
    const result = await calculateJourneys({
      origin: 'Kharar',
      destination: 'ISBT 17',
      departureTime: '08:30'
    });

    expect(result).toBeDefined();
    expect(result.departureTime).toBe('08:30 AM');
    expect(result.journeys.length).toBeGreaterThan(0);

    const directJourney = result.journeys.find(j => j.transfersNum === 0);
    expect(directJourney).toBeDefined();
    expect(directJourney.departureTime).toMatch(/(AM|PM)/);
    expect(directJourney.scheduleInfo).toBeDefined();
    expect(directJourney.scheduleInfo.nextBusTime).toBeDefined();
    expect(directJourney.scheduleInfo.frequencyDisplay).toBeDefined();
    expect(directJourney.arrivalTime).toBeDefined();
    expect(directJourney.arrivalTime).toMatch(/(AM|PM)/);
  });

  test('plans journey from Chandigarh University to ISBT 17 matching Kharar stop with first-mile connectivity', async () => {
    const result = await calculateJourneys({
      origin: 'chandigarh university',
      destination: 'isbt 17'
    });

    expect(result).toBeDefined();
    expect(result.sourceStop).toBeDefined();
    expect(result.sourceStop.name).toBe('Kharar');
    expect(result.sourceStop.isExactMatch).toBe(false);
    expect(result.sourceStop.distanceKm).toBeGreaterThan(5);
    expect(result.destinationStop.name).toBe('ISBT 17');
    expect(result.destinationStop.isExactMatch).toBe(true);

    expect(result.availableRoutes.length).toBeGreaterThan(0);
    const route = result.availableRoutes[0];
    expect(route.checkpoints.length).toBeGreaterThan(0);
    expect(route.checkpoints[0].type).toBe('transit_connect');
    expect(route.checkpoints[0].title).toContain('Kharar');
  });
});

