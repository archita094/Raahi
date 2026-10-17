
const Stop = require('../models/Stop');
const { geocode } = require('./geocodingService');

function getHaversineDistanceKm(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

const STOP_ALIAS_MAP = {
  'kharar': 'Kharar',
  'kharar bus stand': 'Kharar',
  'kharar stand': 'Kharar',
  'isbt 17': 'ISBT 17',
  'isbt-17': 'ISBT 17',
  'isbt17': 'ISBT 17',
  'sector 17 isbt': 'ISBT 17',
  'sec 17 isbt': 'ISBT 17',
  'sec 17': 'ISBT 17',
  'sector 17': 'ISBT 17',
  'sec17': 'ISBT 17',
  'sector17': 'ISBT 17',
  '17 isbt': 'ISBT 17',
  '17isbt': 'ISBT 17',
  'isbt 43': 'ISBT 43',
  'isbt-43': 'ISBT 43',
  'isbt43': 'ISBT 43',
  'sector 43 isbt': 'ISBT 43',
  'sec 43 isbt': 'ISBT 43',
  'sec 43': 'ISBT 43',
  'sector 43': 'ISBT 43',
  'sec43': 'ISBT 43',
  'sector43': 'ISBT 43',
  '43 isbt': 'ISBT 43',
  '43isbt': 'ISBT 43',
  'pgi': 'PGI',
  'pgimer': 'PGI',
  'pgimer hospital': 'PGI',
  'railway station': 'Railway Station (Chandigarh)',
  'chandigarh railway station': 'Railway Station (Chandigarh)',
  'manimajra': 'Mani Majra',
  'mani majra': 'Mani Majra',
  'dera bassi': 'Dera Bassi',
  'derabassi': 'Dera Bassi',
  'khuda alisher': 'Khuda Alisher',
  'new airport': 'New Airport',
  'chandigarh airport': 'New Airport',
  'ram darbar': 'Ram Darbar',
  'nada sahib': 'Nada Sahib',
  'nadasahib': 'Nada Sahib',
  'mata mansa devi': 'Mata Mansa Devi',
  'mansa devi': 'Mata Mansa Devi',
  'pec': 'Punjab Engineering College (PEC)',
  'punjab engineering college': 'Punjab Engineering College (PEC)',
  'high court': 'High Court',
  'punjab civil secretariat': 'Punjab Civil Secretariat',
  'secretariat': 'Punjab Civil Secretariat'
};

function normalizeQueryString(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[-_.,/]/g, ' ');

  s = s.replace(/\bisbt(\d+)\b/g, 'isbt $1');

  s = s.replace(/\bsec(\d+)\b/g, 'sector $1');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

async function matchLocation(query, allStops = null) {
  if (!query) return null;

  const stopMap = new Map();

  try {
    const fs = require('fs');
    const path = require('path');
    const fallbackPath = path.join(__dirname, '../data/stops_for_gemini_enrichment.json');
    if (fs.existsSync(fallbackPath)) {
      const raw = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      raw.forEach(s => {
        stopMap.set(s.name.toLowerCase(), {
          name: s.name,
          sector: s.sector,
          location: {
            type: 'Point',
            coordinates: [s.longitude, s.latitude]
          }
        });
      });
    }
  } catch (e) {}

  const mongoose = require('mongoose');
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const dbStops = await Stop.find({}).lean();
      dbStops.forEach(s => {
        stopMap.set(s.name.toLowerCase(), s);
      });
    } catch (e) {}
  }

  try {
    const { TRICITY_LOCATION_DB } = require('./geocodingService');
    for (const [key, item] of Object.entries(TRICITY_LOCATION_DB)) {
      const norm = key.toLowerCase();
      if (stopMap.has(norm)) {
        const existing = stopMap.get(norm);
        existing.location = {
          type: 'Point',
          coordinates: [item.lng, item.lat]
        };
        if (item.sector && !existing.sector) existing.sector = item.sector;
      }
    }
  } catch (e) {}

  allStops = Array.from(stopMap.values());

  if (typeof query === 'object' && query.latitude && query.longitude) {
    const userCoord = [query.longitude, query.latitude];
    let nearest = null;
    let minDistance = Infinity;

    for (const stop of allStops) {
      if (!stop.location || !stop.location.coordinates) continue;
      const d = getHaversineDistanceKm(userCoord, stop.location.coordinates);
      if (d < minDistance) {
        minDistance = d;
        nearest = stop;
      }
    }

    if (nearest && minDistance <= 15.0) {
      const isTransitConnect = minDistance > 1.2;
      return {
        query: `(${query.latitude.toFixed(3)}, ${query.longitude.toFixed(3)})`,
        matchedStop: nearest,
        stopName: nearest.name,
        isExactMatch: false,
        distanceKm: minDistance,
        note: isTransitConnect
          ? `Nearest CTU stop: ${nearest.name} (${minDistance} km via auto/cab)`
          : `Nearest stop: ${nearest.name} (${minDistance} km away)`
      };
    }
    return null;
  }

  const rawQuery = String(query).trim();
  if (!rawQuery) return null;

  const queryLower = rawQuery.toLowerCase();
  const normalized = normalizeQueryString(rawQuery);

  const aliasedName = STOP_ALIAS_MAP[queryLower] || STOP_ALIAS_MAP[normalized];
  if (aliasedName) {
    const exact = allStops.find(s => s.name.toLowerCase() === aliasedName.toLowerCase());
    const coords = exact?.location?.coordinates ? { lat: exact.location.coordinates[1], lng: exact.location.coordinates[0] } : null;
    return {
      query: rawQuery,
      matchedStop: exact || { name: aliasedName },
      stopName: aliasedName,
      isExactMatch: true,
      distanceKm: 0,
      coordinates: coords,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      note: `Exact bus stop`
    };
  }

  const exactStop = allStops.find(s => {
    const sLower = s.name.toLowerCase();
    return sLower === queryLower || sLower === normalized;
  });
  if (exactStop) {
    const coords = exactStop?.location?.coordinates ? { lat: exactStop.location.coordinates[1], lng: exactStop.location.coordinates[0] } : null;
    return {
      query: rawQuery,
      matchedStop: exactStop,
      stopName: exactStop.name,
      isExactMatch: true,
      distanceKm: 0,
      coordinates: coords,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      note: `Exact bus stop`
    };
  }

  const partialStop = allStops.find(s => {
    const sLower = s.name.toLowerCase();
    return sLower.includes(queryLower) || queryLower.includes(sLower) ||
           sLower.includes(normalized) || normalized.includes(sLower);
  });
  if (partialStop) {
    const coords = partialStop?.location?.coordinates ? { lat: partialStop.location.coordinates[1], lng: partialStop.location.coordinates[0] } : null;
    return {
      query: rawQuery,
      matchedStop: partialStop,
      stopName: partialStop.name,
      isExactMatch: true,
      distanceKm: 0,
      coordinates: coords,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      note: `Exact bus stop (${partialStop.name})`
    };
  }

  try {
    const geo = await geocode(rawQuery);
    if (geo && geo.location && geo.location.coordinates) {
      const geoCoord = geo.location.coordinates;
      let nearest = null;
      let minDistance = Infinity;

      for (const stop of allStops) {
        if (!stop.location || !stop.location.coordinates) continue;
        const d = getHaversineDistanceKm(geoCoord, stop.location.coordinates);
        if (d < minDistance) {
          minDistance = d;
          nearest = stop;
        }
      }

      if (nearest && minDistance <= 15.0) {
        const isTransitConnect = minDistance > 1.2;
        return {
          query: rawQuery,
          matchedStop: nearest,
          stopName: nearest.name,
          isExactMatch: false,
          distanceKm: minDistance,
          resolvedAddress: geo.address || geo.name,
          coordinates: { lat: geo.latitude, lng: geo.longitude },
          lat: geo.latitude,
          lng: geo.longitude,
          note: isTransitConnect
            ? `Nearest CTU stop: ${nearest.name} (${minDistance} km via auto/cab)`
            : `Nearest stop: ${nearest.name} (${minDistance} km from ${rawQuery})`
        };
      }
    }
  } catch (err) {

  }

  return null;
}

module.exports = {
  matchLocation,
  getHaversineDistanceKm,
  STOP_ALIAS_MAP
};

