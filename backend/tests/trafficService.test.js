const {
  getTrafficTimeMultiplier,
  calculateCorridorTraffic
} = require('../services/trafficService');

describe('Traffic Service & Dynamic Congestion Engine', () => {
  test('detects evening peak rush hour (IST)', () => {

    const evening = getTrafficTimeMultiplier(1110);
    expect(evening.period).toBe('evening_peak');
    expect(evening.level).toBe('heavy');
    expect(evening.baseMultiplier).toBeGreaterThan(1.2);
  });

  test('detects morning peak rush hour (IST)', () => {

    const morning = getTrafficTimeMultiplier(570);
    expect(morning.period).toBe('morning_peak');
    expect(morning.level).toBe('heavy');
  });

  test('detects off-peak late night traffic', () => {

    const night = getTrafficTimeMultiplier(1410);
    expect(night.period).toBe('off_peak');
    expect(night.level).toBe('light');
    expect(night.baseMultiplier).toBe(1.0);
  });

  test('calculates corridor traffic delays factoring choke points', () => {

    const result = calculateCorridorTraffic({
      stops: ['Kharar', 'Desumajra/Nijjar chowk', 'Aroma', 'ISBT 17'],
      distanceKm: 19.2,
      nominalMinutes: 52,
      departureMinutes: 1110
    });

    expect(result.trafficLevel).toBe('heavy');
    expect(result.delayMinutes).toBeGreaterThan(5);
    expect(result.trafficDurationMinutes).toBe(52 + result.delayMinutes);
    expect(result.chokePoints).toContain('Kharar Highway / Desumajra');
    expect(result.chokePoints).toContain('Aroma Light Point');
    expect(result.statusText).toContain('Heavy');
  });

  test('calculates zero or minimal delay during free-flowing off-peak hours', () => {
    const result = calculateCorridorTraffic({
      stops: ['ISBT 43', 'ISBT 17'],
      distanceKm: 5,
      nominalMinutes: 15,
      departureMinutes: 300
    });

    expect(result.trafficLevel).toBe('light');
    expect(result.delayMinutes).toBeLessThanOrEqual(2);
    expect(result.trafficDurationMinutes).toBeLessThanOrEqual(17);
  });
});

