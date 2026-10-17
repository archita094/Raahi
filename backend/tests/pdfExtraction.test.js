const { normalizeStopName } = require('../services/pdfImportService');

describe('PDF Timetable Stop Name Normalization & Validation', () => {
  test('normalizes sector names correctly', () => {
    expect(normalizeStopName('Sec-17')).toBe('Sector 17 Market');
    expect(normalizeStopName('17Mkt')).toBe('Sector 17 ISBT');
    expect(normalizeStopName('ISBT-17')).toBe('Sector 17 ISBT');
    expect(normalizeStopName('ISBT-43')).toBe('Sector 43 ISBT');
  });

  test('normalizes landmark names correctly', () => {
    expect(normalizeStopName('PGI')).toBe('PGIMER Hospital');
    expect(normalizeStopName('New OPD')).toBe('PGIMER Hospital');
    expect(normalizeStopName('R/Stn')).toBe('Chandigarh Railway Station');
    expect(normalizeStopName('M.Majra')).toBe('Manimajra Bus Stand');
    expect(normalizeStopName('Elante')).toBe('Elante Mall');
  });

  test('handles null and edge case stop names', () => {
    expect(normalizeStopName(null)).toBe('Sector 17 ISBT');
    expect(normalizeStopName('   ')).toBe('Sector 17 ISBT');
  });
});

