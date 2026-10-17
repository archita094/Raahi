const fs = require('fs');
const path = require('path');

const routesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ctu_distance_routes.json'), 'utf8'));
const enrichment = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stops_for_gemini_enrichment.json'), 'utf8'));

const enrichMap = new Map();
enrichment.forEach(s => enrichMap.set(s.name.trim().toLowerCase(), s));

const uniqueStops = [];
const seen = new Set();
for (const r of routesData.routes) {
  for (const dir of ['going', 'returning']) {
    if (!r[dir]?.stops) continue;
    for (const st of r[dir].stops) {
      const name = st.name.trim();
      const norm = name.toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueStops.push(name);
      }
    }
  }
}

console.log(`Checking all ${uniqueStops.length} stops...`);
const list = [];
for (const name of uniqueStops) {
  const norm = name.toLowerCase();
  const en = enrichMap.get(norm);
  list.push({ name, lng: en?.longitude, lat: en?.latitude, sector: en?.sector });
}

fs.writeFileSync(path.join(__dirname, '../data/all_251_stops_audit.json'), JSON.stringify(list, null, 2));
console.log('Saved to data/all_251_stops_audit.json');

