
const fs = require('fs');
const path = require('path');

let SCHEDULES_CACHE = null;

function loadSchedules() {
  if (!SCHEDULES_CACHE) {
    const filePath = path.join(__dirname, '../data/ctu_schedules.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const map = new Map();
      data.forEach(item => {
        const routeKey = String(item.route).trim().toUpperCase();
        map.set(routeKey, {
          route: routeKey,
          from: item.from,
          to: item.to,
          goingRoute: item.goingRoute,
          returningRoute: item.returningRoute,
          firstBusRaw: item.firstBus,
          lastBusRaw: item.lastBus,
          frequencyRaw: item.frequency,
          firstBusMinutes: parseTimeStringToMinutes(item.firstBus),
          lastBusMinutes: parseTimeStringToMinutes(item.lastBus),
          frequencyMinutes: parseFrequencyToMinutes(item.frequency)
        });
      });
      SCHEDULES_CACHE = map;
    } else {
      SCHEDULES_CACHE = new Map();
    }
  }
  return SCHEDULES_CACHE;
}

function formatMinutesToTimeStr(totalMinutes) {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return '08:00 AM';
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(norm / 60);
  const minutes = norm % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function parseTimeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  if (clean.toLowerCase().includes('not') || clean.toLowerCase().includes('reliably')) {
    return null;
  }

  let candidate = clean;
  if (candidate.includes('–') || candidate.includes('-')) {
    const parts = candidate.split(/[–-]/);
    const firstPart = parts[0].trim();

    const ampmMatch = candidate.match(/(AM|PM)/i);
    const ampm = ampmMatch ? ampmMatch[1].toUpperCase() : '';
    candidate = firstPart.includes('AM') || firstPart.includes('PM') ? firstPart : `${firstPart} ${ampm}`.trim();
  }

  const match = candidate.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function parseFrequencyToMinutes(freqStr) {
  if (!freqStr || typeof freqStr !== 'string') return 25;
  const clean = freqStr.trim().toLowerCase();
  if (clean.includes('not') || clean.includes('reliably')) {
    return 25;
  }

  const rangeMatch = clean.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1], 10);
    const high = parseInt(rangeMatch[2], 10);
    return Math.round((low + high) / 2);
  }

  const singleMatch = clean.match(/(\d+)/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }

  return 25;
}

function getCurrentIndiaTime() {
  const now = new Date();
  const istString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const parts = istString.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  const totalMinutes = hours * 60 + minutes;

  return {
    hours,
    minutes,
    totalMinutes,
    timeStr24: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    timeStr12: formatMinutesToTimeStr(totalMinutes)
  };
}

function getRouteSchedule(routeNumber) {
  const map = loadSchedules();
  if (!routeNumber) return null;
  const key = String(routeNumber).trim().toUpperCase();
  return map.get(key) || null;
}

function calculateNextBusArrival({ routeNumber, distanceToBoardingKm = 0, departureMinutes, busSpeedKmh = 22 }) {
  const schedule = getRouteSchedule(routeNumber);
  const nowIst = getCurrentIndiaTime();
  const targetMinutes = typeof departureMinutes === 'number' && !isNaN(departureMinutes)
    ? departureMinutes
    : nowIst.totalMinutes;

  const transitOffsetMinutes = distanceToBoardingKm > 0
    ? Math.max(0, Math.round((distanceToBoardingKm / busSpeedKmh) * 60))
    : 0;

  if (!schedule || schedule.firstBusMinutes === null || schedule.lastBusMinutes === null) {

    const fallbackFreq = 25;
    const estWait = fallbackFreq - (targetMinutes % fallbackFreq);
    const nextArrMinutes = (targetMinutes + estWait) % 1440;
    return {
      routeNumber,
      isServiceActive: true,
      serviceStatus: 'active',
      frequencyDisplay: schedule?.frequencyRaw || 'Every 20–25 min',
      operatingHoursDisplay: 'Daytime service (approx. 06:00 AM – 09:00 PM)',
      nextBusMinutes: nextArrMinutes,
      nextBusTime: formatMinutesToTimeStr(nextArrMinutes),
      waitMinutes: estWait,
      transitOffsetMinutes,
      upcomingDepartures: [
        formatMinutesToTimeStr(nextArrMinutes),
        formatMinutesToTimeStr((nextArrMinutes + fallbackFreq) % 1440),
        formatMinutesToTimeStr((nextArrMinutes + fallbackFreq * 2) % 1440)
      ],
      notice: 'Frequency estimated from average CTU operational intervals.'
    };
  }

  const { firstBusMinutes, lastBusMinutes, frequencyMinutes, frequencyRaw, firstBusRaw, lastBusRaw } = schedule;

  const originDepartures = [];
  for (let dep = firstBusMinutes; dep <= lastBusMinutes; dep += frequencyMinutes) {
    originDepartures.push(dep);
  }
  if (originDepartures[originDepartures.length - 1] < lastBusMinutes) {
    originDepartures.push(lastBusMinutes);
  }

  const stopArrivals = originDepartures.map(d => d + transitOffsetMinutes);
  const firstStopArrival = stopArrivals[0];
  const lastStopArrival = stopArrivals[stopArrivals.length - 1];

  const operatingHoursDisplay = `${firstBusRaw} – ${lastBusRaw}`;
  const frequencyDisplay = frequencyRaw ? `Every ${frequencyRaw}` : `Every ${frequencyMinutes} min`;

  if (targetMinutes < firstStopArrival) {
    const wait = firstStopArrival - targetMinutes;
    return {
      routeNumber,
      isServiceActive: false,
      serviceStatus: 'before_first_bus',
      frequencyDisplay,
      operatingHoursDisplay,
      nextBusMinutes: firstStopArrival,
      nextBusTime: formatMinutesToTimeStr(firstStopArrival),
      waitMinutes: wait,
      transitOffsetMinutes,
      upcomingDepartures: stopArrivals.slice(0, 3).map(formatMinutesToTimeStr),
      notice: `First bus of the day reaches this stop at ${formatMinutesToTimeStr(firstStopArrival)} (in ${wait} min).`
    };
  }

  if (targetMinutes > lastStopArrival) {
    const waitTomorrow = (1440 - targetMinutes) + firstStopArrival;
    return {
      routeNumber,
      isServiceActive: false,
      serviceStatus: 'ended_for_today',
      frequencyDisplay,
      operatingHoursDisplay,
      nextBusMinutes: firstStopArrival,
      nextBusTime: formatMinutesToTimeStr(firstStopArrival),
      waitMinutes: waitTomorrow,
      transitOffsetMinutes,
      upcomingDepartures: stopArrivals.slice(0, 3).map(formatMinutesToTimeStr),
      notice: `Service concluded for today (last bus was at ${formatMinutesToTimeStr(lastStopArrival)}). Next bus tomorrow at ${formatMinutesToTimeStr(firstStopArrival)}.`
    };
  }

  const upcoming = stopArrivals.filter(arr => arr >= targetMinutes);
  const nextArrival = upcoming[0] !== undefined ? upcoming[0] : lastStopArrival;
  const waitMinutes = Math.max(0, nextArrival - targetMinutes);

  return {
    routeNumber,
    isServiceActive: true,
    serviceStatus: 'active',
    frequencyDisplay,
    operatingHoursDisplay,
    nextBusMinutes: nextArrival,
    nextBusTime: formatMinutesToTimeStr(nextArrival),
    waitMinutes,
    transitOffsetMinutes,
    upcomingDepartures: upcoming.slice(0, 3).map(formatMinutesToTimeStr),
    notice: waitMinutes === 0
      ? `Bus arriving now at ${formatMinutesToTimeStr(nextArrival)}.`
      : `Next bus in ${waitMinutes} min at ${formatMinutesToTimeStr(nextArrival)}.`
  };
}

module.exports = {
  loadSchedules,
  parseTimeStringToMinutes,
  parseFrequencyToMinutes,
  formatMinutesToTimeStr,
  getCurrentIndiaTime,
  getRouteSchedule,
  calculateNextBusArrival
};

