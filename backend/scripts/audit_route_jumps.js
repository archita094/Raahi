const fs = require('fs');
const path = require('path');

const routesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ctu_distance_routes.json'), 'utf8'));
const enrichment = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stops_for_gemini_enrichment.json'), 'utf8'));
const { TRICITY_LOCATION_DB } = require('../services/geocodingService');

const enrichMap = new Map();
enrichment.forEach(s => enrichMap.set(s.name.trim().toLowerCase(), s));

function getCoords(name) {
  const norm = name.trim().toLowerCase();
  if (TRICITY_LOCATION_DB[norm]) {
    return [TRICITY_LOCATION_DB[norm].lng, TRICITY_LOCATION_DB[norm].lat];
  }
  const en = enrichMap.get(norm);
  if (en && en.longitude && en.latitude) {
    return [en.longitude, en.latitude];
  }
  return null;
}

function haversine(c1, c2) {
  const R = 6371;
  const dLat = (c2[1] - c1[1]) * Math.PI / 180;
  const dLng = (c2[0] - c1[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(c1[1]*Math.PI/180) * Math.cos(c2[1]*Math.PI/180) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

console.log('=== ROUTE STOP-TO-STOP DISTANCE AUDIT ===');
for (const r of routesData.routes) {
  for (const dir of ['going', 'returning']) {
    if (!r[dir]?.stops) continue;
    const stops = r[dir].stops;
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i+1];
      const c1 = getCoords(s1.name);
      const c2 = getCoords(s2.name);
      if (!c1 || !c2) {
        console.log(`[${r.route_number} ${dir}] Missing coords: ${!c1 ? s1.name : s2.name}`);
        continue;
      }
      const dist = haversine(c1, c2);
      if (dist > 3.0) {
        console.log(`[${r.route_number} ${dir}] Large jump (${dist.toFixed(2)} km): "${s1.name}" [${c1}] -> "${s2.name}" [${c2}]`);
      }
    }
  }
}

