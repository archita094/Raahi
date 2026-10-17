const {
  parseTimeStringToMinutes,
  parseFrequencyToMinutes,
  formatMinutesToTimeStr,
  getCurrentIndiaTime,
  getRouteSchedule,
  calculateNextBusArrival
} = require('../services/scheduleService');

describe('Schedule Service & Next Bus Engine', () => {
  test('parses various time string formats correctly', () => {
    expect(parseTimeStringToMinutes('6:10 AM')).toBe(370);
    expect(parseTimeStringToMinutes('8:40 PM')).toBe(1240);
    expect(parseTimeStringToMinutes('5:35–6:00 AM')).toBe(335);
    expect(parseTimeStringToMinutes('Not reliably published')).toBeNull();
  });

  test('parses various frequency string formats correctly', () => {
    expect(parseFrequencyToMinutes('20 min')).toBe(20);
    expect(parseFrequencyToMinutes('25–30 min')).toBe(28);
    expect(parseFrequencyToMinutes('75 min')).toBe(75);
    expect(parseFrequencyToMinutes('10 min')).toBe(10);
    expect(parseFrequencyToMinutes('Not reliably published')).toBe(25);
  });

  test('formats minutes to 12-hour AM/PM string', () => {
    expect(formatMinutesToTimeStr(370)).toBe('06:10 AM');
    expect(formatMinutesToTimeStr(720)).toBe('12:00 PM');
    expect(formatMinutesToTimeStr(1240)).toBe('08:40 PM');
  });

  test('getCurrentIndiaTime returns valid IST timestamp', () => {
    const ist = getCurrentIndiaTime();
    expect(ist).toBeDefined();
    expect(ist.hours).toBeGreaterThanOrEqual(0);
    expect(ist.hours).toBeLessThan(24);
    expect(ist.minutes).toBeGreaterThanOrEqual(0);
    expect(ist.minutes).toBeLessThan(60);
    expect(ist.timeStr12).toMatch(/(AM|PM)/);
  });

  test('loads route schedules for authenticated routes', () => {
    const r35B = getRouteSchedule('35B');
    expect(r35B).toBeDefined();
    expect(r35B.route).toBe('35B');
    expect(r35B.lastBusRaw).toBe('8:40 PM');

    const r551 = getRouteSchedule('551');
    expect(r551).toBeDefined();
    expect(r551.frequencyRaw).toBe('10 min');
  });

  test('calculates next bus during normal operational hours', () => {

    const result = calculateNextBusArrival({
      routeNumber: '1',
      distanceToBoardingKm: 0,
      departureMinutes: 400
    });

    expect(result.isServiceActive).toBe(true);
    expect(result.serviceStatus).toBe('active');
    expect(result.nextBusMinutes).toBe(410);
    expect(result.nextBusTime).toBe('06:50 AM');
    expect(result.waitMinutes).toBe(10);
    expect(result.upcomingDepartures.length).toBeGreaterThanOrEqual(1);
    expect(result.upcomingDepartures[0]).toBe('06:50 AM');
    expect(result.upcomingDepartures[1]).toBe('07:10 AM');
  });

  test('calculates intermediate stop offset correctly', () => {

    const result = calculateNextBusArrival({
      routeNumber: '1',
      distanceToBoardingKm: 11,
      departureMinutes: 405
    });

    expect(result.isServiceActive).toBe(true);
    expect(result.transitOffsetMinutes).toBe(30);
    expect(result.nextBusMinutes).toBe(420);
    expect(result.nextBusTime).toBe('07:00 AM');
    expect(result.waitMinutes).toBe(15);
  });

  test('handles departure before first bus of the day', () => {

    const result = calculateNextBusArrival({
      routeNumber: '1',
      distanceToBoardingKm: 0,
      departureMinutes: 300
    });

    expect(result.isServiceActive).toBe(false);
    expect(result.serviceStatus).toBe('before_first_bus');
    expect(result.nextBusMinutes).toBe(370);
    expect(result.nextBusTime).toBe('06:10 AM');
    expect(result.waitMinutes).toBe(70);
  });

  test('handles departure after last bus of the day', () => {

    const result = calculateNextBusArrival({
      routeNumber: '1',
      distanceToBoardingKm: 0,
      departureMinutes: 1320
    });

    expect(result.isServiceActive).toBe(false);
    expect(result.serviceStatus).toBe('ended_for_today');
    expect(result.nextBusTime).toBe('06:10 AM');
    expect(result.notice).toContain('Service concluded for today');
  });
});

