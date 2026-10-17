const { routingService } = require('../services/routingService');
const { geocode } = require('../services/geocodingService');

describe('RoutingService & GeocodingService', () => {
  test('geocode resolves known Tricity stops with cached coordinates', async () => {
    const kharar = await geocode('Kharar');
    expect(kharar).toBeDefined();
    expect(kharar.latitude).toBeCloseTo(30.7488, 1);
    expect(kharar.longitude).toBeCloseTo(76.6429, 1);

    const isbt43 = await geocode('ISBT 43');
    expect(isbt43).toBeDefined();
    expect(isbt43.latitude).toBeCloseTo(30.7208, 1);
    expect(isbt43.longitude).toBeCloseTo(76.7451, 1);
  });

  test('getRoadCorridorRoute returns road-following approximation through CTU stops', async () => {
    const stops = [
      { lat: 30.7488, lng: 76.6429, name: 'Kharar' },
      { lat: 30.7208, lng: 76.7451, name: 'ISBT 43' }
    ];

    const result = await routingService.getRoadCorridorRoute(stops);
    expect(result).toBeDefined();
    expect(result.isApproximation).toBe(true);
    if (result.geometry) {
      expect(Array.isArray(result.geometry)).toBe(true);
      expect(result.geometry.length).toBeGreaterThan(10);
      expect(result.baselineDistanceMeters).toBeGreaterThan(10000);
    } else {
      expect(result.isUnavailable).toBe(true);
    }
  });

  test('getWalkingRoute calculates distance and duration without fake lines', async () => {
    const userLoc = { lat: 30.7500, lng: 76.6450 };
    const busStop = { lat: 30.7488, lng: 76.6429 };

    const result = await routingService.getWalkingRoute(userLoc, busStop);
    expect(result).toBeDefined();
    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(typeof result.distanceText).toBe('string');
    expect(typeof result.durationText).toBe('string');
  });

  test('traffic estimate strictly distinguishes scheduled from traffic duration', () => {
    const trafficEst = routingService.getTrafficEstimate({
      scheduledMinutes: 37,
      baselineMinutes: 32,
      departureMinutes: 1071
    });

    expect(trafficEst).toBeDefined();

    expect(trafficEst.available).toBe(false);
    expect(trafficEst.trafficDurationMinutes).toBeNull();
    expect(trafficEst.trafficDelayMinutes).toBe(0);
    expect(trafficEst.status).toBe('timetable_estimated');
  });
});

