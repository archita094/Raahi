
const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE_PATH = path.join(__dirname, '../data/routing_cache.json');
let inMemoryRoutingCache = null;

function loadRoutingCache() {
  if (inMemoryRoutingCache) return inMemoryRoutingCache;
  inMemoryRoutingCache = new Map();
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        inMemoryRoutingCache.set(k, v);
      }
    }
  } catch (err) {
    console.warn('[RoutingService] Could not load disk cache:', err.message);
  }
  return inMemoryRoutingCache;
}

function saveRoutingCache() {
  if (!inMemoryRoutingCache) return;
  try {
    const obj = {};
    for (const [k, v] of inMemoryRoutingCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[RoutingService] Could not save disk cache:', err.message);
  }
}

function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function fetchFromOsrm(coordinatesString, mode = 'driving', continueStraight = false) {
  return new Promise((resolve) => {
    let url = `https://router.project-osrm.org/route/v1/${mode}/${coordinatesString}?overview=full&geometries=geojson`;
    if (continueStraight) {
      url += '&continue_straight=true';
    }

    const req = https.get(url, {
      agent: false,
      headers: {
        'User-Agent': 'RaahiTransitPlanner/1.0 (transit-planner@raahi.app)'
      },
      timeout: 5000
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        req.destroy();
        try {
          const json = JSON.parse(raw);
          if (json.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
            const r = json.routes[0];

            const leafletCoords = (r.geometry?.coordinates || []).map(([lon, lat]) => [lat, lon]);
            resolve({
              code: 'Ok',
              distanceMeters: Math.round(r.distance),
              durationSeconds: Math.round(r.duration),
              geometry: leafletCoords,
              summary: r.legs?.[0]?.summary || ''
            });
            return;
          }
        } catch (e) {

        }
        resolve({ code: 'Error', geometry: null });
      });
    });

    req.on('error', () => {
      req.destroy();
      resolve({ code: 'NetworkError', geometry: null });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ code: 'Timeout', geometry: null });
    });
  });
}

function pruneBacktrackingSpikes(coords) {
  if (!Array.isArray(coords) || coords.length < 5) return coords;
  let pts = coords.map(p => [Number(p[0]), Number(p[1])]);
  let changed = true;
  let passes = 0;

  while (changed && passes < 3) {
    changed = false;
    passes++;
    const cleaned = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let shortcutIdx = -1;
      const maxLookahead = Math.min(pts.length, i + 90);
      for (let j = i + 10; j < maxLookahead; j++) {
        const d = calculateHaversineMeters(pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
        if (d < 70) {
          let loopDist = 0;
          for (let k = i; k < j; k++) {
            loopDist += calculateHaversineMeters(pts[k][0], pts[k + 1][0], pts[k + 1][1], pts[k + 1][1]);
          }

          if (loopDist > 260) {
            shortcutIdx = j;
            break;
          }
        }
      }
      if (shortcutIdx !== -1) {
        i = shortcutIdx;
        changed = true;
      } else {
        i++;
        if (i < pts.length) cleaned.push(pts[i]);
      }
    }
    pts = cleaned;
  }
  return pts;
}

class RoutingService {
  constructor() {
    this.cache = loadRoutingCache();
  }

  async getRoadCorridorRoute(stops = []) {
    if (!Array.isArray(stops) || stops.length < 2) {
      return {
        geometry: null,
        baselineDistanceMeters: 0,
        baselineDurationSeconds: 0,
        isApproximation: true,
        isUnavailable: false
      };
    }

    const coordsStr = stops.map(s => `${s.lng.toFixed(4)},${s.lat.toFixed(4)}`).join(';');
    const cacheKey = `road:${coordsStr}`;

    if (this.cache.has(cacheKey)) {
      const hit = this.cache.get(cacheKey);

      if (hit && hit.geometry && hit.geometry.length > 0) {
        return {
          ...hit,
          isApproximation: true
        };
      }
    }

    let sampledStops = stops;
    if (stops.length > 5) {
      const anchors = [stops[0]];
      const keyHubKeywords = ['isbt', 'railway', 'pgi', 'furniture chowk', 'tribune chowk', 'housing board', 'transport chowk', 'aroma', 'kissan bhawan'];
      const keyHubs = [];

      for (let i = 1; i < stops.length - 1; i++) {
        const s = stops[i];
        const sName = (s.name || '').toLowerCase();
        if (keyHubKeywords.some(k => sName.includes(k))) {
          keyHubs.push(s);
        }
      }

      if (keyHubs.length > 0) {
        for (const hub of keyHubs) {
          const last = anchors[anchors.length - 1];
          if (calculateHaversineMeters(last.lat, last.lng, hub.lat, hub.lng) > 1200) {
            anchors.push(hub);
          }
        }
      } else {
        const targetCount = Math.min(6, stops.length);
        const step = (stops.length - 1) / (targetCount - 1);
        for (let i = 1; i < targetCount - 1; i++) {
          const idx = Math.min(stops.length - 2, Math.round(i * step));
          anchors.push(stops[idx]);
        }
      }

      anchors.push(stops[stops.length - 1]);
      sampledStops = anchors;
    }

    const osrmCoordsStr = sampledStops.map(s => `${s.lng.toFixed(5)},${s.lat.toFixed(5)}`).join(';');
    const result = await fetchFromOsrm(osrmCoordsStr, 'driving', true);

    if (result.code === 'Ok' && Array.isArray(result.geometry) && result.geometry.length > 0) {
      const cleanedGeometry = pruneBacktrackingSpikes(result.geometry);

      let cleanedDistMeters = 0;
      for (let i = 0; i < cleanedGeometry.length - 1; i++) {
        cleanedDistMeters += calculateHaversineMeters(
          cleanedGeometry[i][0], cleanedGeometry[i][1],
          cleanedGeometry[i + 1][0], cleanedGeometry[i + 1][1]
        );
      }

      const straightDist = calculateHaversineMeters(
        stops[0].lat, stops[0].lng,
        stops[stops.length - 1].lat, stops[stops.length - 1].lng
      );

      let finalGeometry = cleanedGeometry;
      let finalDistance = cleanedDistMeters > 0 ? cleanedDistMeters : result.distanceMeters;
      let finalDuration = result.durationSeconds;

      if (stops.length > 2 && straightDist > 2500 && finalDistance > straightDist * 2.2) {
        const directCoordsStr = `${stops[0].lng.toFixed(5)},${stops[0].lat.toFixed(5)};${stops[stops.length - 1].lng.toFixed(5)},${stops[stops.length - 1].lat.toFixed(5)}`;
        const directResult = await fetchFromOsrm(directCoordsStr, 'driving', true);
        if (directResult.code === 'Ok' && Array.isArray(directResult.geometry) && directResult.geometry.length > 0) {
          finalGeometry = pruneBacktrackingSpikes(directResult.geometry);
          finalDistance = directResult.distanceMeters;
          finalDuration = directResult.durationSeconds;
        }
      }

      const data = {
        geometry: finalGeometry,
        baselineDistanceMeters: Math.round(finalDistance),
        baselineDurationSeconds: Math.round(finalDuration),
        isApproximation: true,
        isUnavailable: false
      };
      this.cache.set(cacheKey, data);
      saveRoutingCache();
      return data;
    }

    return {
      geometry: null,
      baselineDistanceMeters: 0,
      baselineDurationSeconds: 0,
      isApproximation: true,
      isUnavailable: true,
      errorReason: result.code
    };
  }

  async getWalkingRoute(fromCoords, toCoords) {
    if (!fromCoords || !toCoords || !fromCoords.lat || !toCoords.lat) {
      return {
        geometry: null,
        distanceMeters: 0,
        durationMinutes: 0,
        distanceText: '0 m',
        durationText: '0 min',
        geometryUnavailable: true
      };
    }

    const straightDistM = calculateHaversineMeters(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
    const isConnect = straightDistM > 1200;

    const estCircuity = isConnect ? 1.18 : 1.25;
    const estMeters = Math.round(straightDistM * estCircuity);

    const estMinutes = isConnect
      ? Math.max(8, Math.round((estMeters / 1000) * 2))
      : Math.max(1, Math.round(estMeters / 80));

    const cacheKey = `walk:${fromCoords.lng.toFixed(4)},${fromCoords.lat.toFixed(4)};${toCoords.lng.toFixed(4)},${toCoords.lat.toFixed(4)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let routeGeometry = null;
    let actualMeters = estMeters;
    let actualMinutes = estMinutes;

    const coordsStr = `${fromCoords.lng.toFixed(5)},${fromCoords.lat.toFixed(5)};${toCoords.lng.toFixed(5)},${toCoords.lat.toFixed(5)}`;

    const osrmMode = isConnect ? 'driving' : 'foot';
    const osrmRes = await fetchFromOsrm(coordsStr, osrmMode, isConnect);

    if (osrmRes.code === 'Ok' && Array.isArray(osrmRes.geometry) && osrmRes.geometry.length > 0) {
      routeGeometry = osrmRes.geometry;
      actualMeters = osrmRes.distanceMeters;
      actualMinutes = isConnect
        ? Math.max(8, Math.round((actualMeters / 1000) * 2))
        : Math.max(1, Math.round(osrmRes.durationSeconds / 60));
    }

    const res = {
      geometry: (routeGeometry && routeGeometry.length > 0) ? routeGeometry : [[Number(fromCoords.lat), Number(fromCoords.lng)], [Number(toCoords.lat), Number(toCoords.lng)]],
      distanceMeters: actualMeters,
      durationMinutes: actualMinutes,
      distanceText: actualMeters >= 1000 ? `${(actualMeters / 1000).toFixed(1)} km` : `${actualMeters} m`,
      durationText: isConnect ? `~${actualMinutes} min ride` : `${actualMinutes} min walk`,
      geometryUnavailable: routeGeometry === null
    };

    this.cache.set(cacheKey, res);
    saveRoutingCache();
    return res;
  }

  getTrafficEstimate({ scheduledMinutes = 30, baselineMinutes = null, departureMinutes = null } = {}) {
    const liveTrafficApiKey = process.env.LIVE_TRAFFIC_API_KEY || null;

    if (!liveTrafficApiKey) {
      return {
        available: false,
        provider: 'none',
        trafficDurationMinutes: null,
        trafficDelayMinutes: 0,
        status: 'timetable_estimated',
        note: 'Live traffic provider not active. Timetable schedule applied.'
      };
    }

    return {
      available: false,
      provider: 'unsupported',
      trafficDurationMinutes: null,
      trafficDelayMinutes: 0,
      status: 'timetable_estimated'
    };
  }
}

const routingService = new RoutingService();

module.exports = {
  routingService,
  RoutingService
};

