
const { getCurrentIndiaTime, parseTimeStringToMinutes, formatMinutesToTimeStr } = require('./scheduleService');

const BOTTLENECK_STOPS = [
  { pattern: /tribune\s*chowk/i, severity: 1.35, delayMin: 6, name: 'Tribune Chowk' },
  { pattern: /aroma/i, severity: 1.25, delayMin: 4, name: 'Aroma Light Point' },
  { pattern: /desumajra|nijjar|mundi\s*kharar|kila\s*chungi/i, severity: 1.30, delayMin: 7, name: 'Kharar Highway / Desumajra' },
  { pattern: /housing\s*board|kalagram/i, severity: 1.25, delayMin: 5, name: 'Housing Board / Kalagram' },
  { pattern: /railway\s*crossing/i, severity: 1.20, delayMin: 4, name: 'Railway Crossing' },
  { pattern: /isbt\s*43/i, severity: 1.15, delayMin: 3, name: 'ISBT 43 Entry' },
  { pattern: /isbt\s*17/i, severity: 1.15, delayMin: 3, name: 'ISBT 17 Corridor' },
  { pattern: /furniture\s*chowk/i, severity: 1.20, delayMin: 4, name: 'Furniture Chowk (UT Border)' }
];

function getTrafficTimeMultiplier(minutesFromMidnight) {
  let mins = minutesFromMidnight;
  if (typeof mins !== 'number' || isNaN(mins)) {
    const ist = getCurrentIndiaTime();
    mins = ist.totalMinutes;
  }

  if (mins >= 1020 && mins <= 1230) {
    return {
      period: 'evening_peak',
      label: 'Evening Peak Rush',
      baseMultiplier: 1.32,
      level: 'heavy'
    };
  }

  if (mins >= 510 && mins <= 660) {
    return {
      period: 'morning_peak',
      label: 'Morning Office Rush',
      baseMultiplier: 1.26,
      level: 'heavy'
    };
  }

  if (mins > 660 && mins < 1020) {
    return {
      period: 'daytime_moderate',
      label: 'Moderate Daytime Traffic',
      baseMultiplier: 1.10,
      level: 'moderate'
    };
  }

  if (mins > 1230 && mins <= 1320) {
    return {
      period: 'late_evening',
      label: 'Light Night Traffic',
      baseMultiplier: 1.05,
      level: 'light'
    };
  }

  return {
    period: 'off_peak',
    label: 'Smooth Free-Flowing Traffic',
    baseMultiplier: 1.0,
    level: 'light'
  };
}

function calculateCorridorTraffic({ stops = [], distanceKm = 10, nominalMinutes = 30, departureMinutes = null }) {
  const timeInfo = getTrafficTimeMultiplier(departureMinutes);

  const chokePointsFound = [];
  let chokeDelay = 0;

  stops.forEach(stopName => {
    for (const bp of BOTTLENECK_STOPS) {
      if (bp.pattern.test(stopName)) {
        if (!chokePointsFound.some(c => c.name === bp.name)) {
          chokePointsFound.push(bp);
          chokeDelay += bp.delayMin;
        }
        break;
      }
    }
  });

  let delayMinutes = 0;
  if (timeInfo.level === 'heavy') {
    const timeDelay = Math.round(nominalMinutes * (timeInfo.baseMultiplier - 1));
    const corridorDelay = Math.round(chokeDelay * 0.7);
    delayMinutes = Math.max(3, timeDelay + corridorDelay);
  } else if (timeInfo.level === 'moderate') {
    const timeDelay = Math.round(nominalMinutes * (timeInfo.baseMultiplier - 1));
    const corridorDelay = Math.round(chokeDelay * 0.35);
    delayMinutes = Math.max(1, timeDelay + corridorDelay);
  } else {

    delayMinutes = Math.min(2, Math.round(chokeDelay * 0.15));
  }

  const trafficDurationMinutes = nominalMinutes + delayMinutes;
  const effectiveSpeedKmh = distanceKm > 0
    ? parseFloat(((distanceKm / (trafficDurationMinutes / 60))).toFixed(1))
    : 22;

  let trafficStatusText = 'Traffic is flowing smoothly.';
  if (timeInfo.level === 'heavy') {
    const bottlenecksStr = chokePointsFound.length > 0
      ? ` at ${chokePointsFound.map(c => c.name).slice(0, 2).join(' & ')}`
      : '';
    trafficStatusText = `Heavy ${timeInfo.label}${bottlenecksStr}. Expect ~+${delayMinutes} min delay.`;
  } else if (timeInfo.level === 'moderate') {
    trafficStatusText = `Moderate traffic along corridor. +${delayMinutes} min adjustment applied.`;
  }

  return {
    trafficLevel: timeInfo.level,
    trafficPeriod: timeInfo.period,
    trafficLabel: timeInfo.label,
    delayMinutes,
    nominalDurationMinutes: nominalMinutes,
    trafficDurationMinutes,
    effectiveSpeedKmh,
    chokePoints: chokePointsFound.map(c => c.name),
    statusText: trafficStatusText
  };
}

module.exports = {
  getTrafficTimeMultiplier,
  calculateCorridorTraffic,
  BOTTLENECK_STOPS
};

