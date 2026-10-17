const fs = require('fs');
const path = require('path');
const { TRICITY_LOCATION_DB, SECTOR_COORDINATES } = require('../services/geocodingService');

const routesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ctu_distance_routes.json'), 'utf8'));
const enrichment = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stops_for_gemini_enrichment.json'), 'utf8'));

const enrichMap = new Map();
enrichment.forEach(s => enrichMap.set(s.name.trim().toLowerCase(), s));

const uniqueStops = new Set();
for (const r of routesData.routes) {
  for (const dir of ['going', 'returning']) {
    if (!r[dir]?.stops) continue;
    for (const st of r[dir].stops) {
      uniqueStops.add(st.name.trim());
    }
  }
}

console.log(`Total unique stops in ctu_distance_routes.json: ${uniqueStops.size}`);

const suspicious = [];
for (const stopName of uniqueStops) {
  const norm = stopName.toLowerCase();
  const en = enrichMap.get(norm);
  const db = TRICITY_LOCATION_DB[norm];

  const lng = db ? db.lng : (en ? en.longitude : null);
  const lat = db ? db.lat : (en ? en.latitude : null);

  let isSuspicious = false;
  let reason = '';

  if (norm.includes('towards') && norm.includes('43') && lng && Math.abs(lng - 76.745) < 0.01 && !norm.includes('attawa') && !norm.includes('44') && !norm.includes('42')) {
    isSuspicious = true;
    reason = 'Stop has "towards 43" and got placed at ISBT 43';
  } else if ((norm.includes('daun') || norm.includes('kfc') || norm.includes('kharar') || norm.includes('chungi') || norm.includes('balongi')) && lng && lng > 76.75) {
    isSuspicious = true;
    reason = 'Kharar/Balongi/Daun stop placed in Chandigarh east (> 76.75)';
  } else if ((norm.includes('chappar') || norm.includes('landran') || norm.includes('santemajra') || norm.includes('lakhnaur')) && lng && lng > 76.75) {
    isSuspicious = true;
    reason = 'Mohali/Landran stop placed in Chandigarh east (> 76.75)';
  } else if (norm.includes('phase 6') && lng && lng > 76.75) {
    isSuspicious = true;
    reason = 'Phase 6 Mohali placed in Chandigarh east (> 76.75)';
  } else if (norm.includes('isbt mohali') && lat && lat < 30.71) {
    isSuspicious = true;
    reason = 'ISBT Mohali placed in Phase 8 (Sector 62)';
  } else if ((norm.includes('manimajra') || norm.includes('mani majra') || norm.includes('housing board') || norm.includes('kalagram')) && lng && lng < 76.79) {
    isSuspicious = true;
    reason = 'Mani Majra/Kalagram stop placed west of 76.79';
  } else if ((norm.includes('kishangarh') || norm.includes('lake') || norm.includes('golf')) && lng && lng < 76.79) {
    isSuspicious = true;
    reason = 'Kishangarh/Lake stop placed west of 76.79';
  }

  if (isSuspicious) {
    suspicious.push({ stopName, lng, lat, reason });
  }
}

console.log(`Found ${suspicious.length} suspicious stops:`);
suspicious.forEach(s => console.log(`- "${s.stopName}" [${s.lng}, ${s.lat}]: ${s.reason}`));

