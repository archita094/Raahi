const fs = require('fs');
const { TRICITY_LOCATION_DB } = require('../services/geocodingService');
const enrichment = JSON.parse(fs.readFileSync(__dirname + '/../data/stops_for_gemini_enrichment.json', 'utf8'));

console.log('Comparing enrichment file with TRICITY_LOCATION_DB:');
let count = 0;
for (const s of enrichment) {
  const norm = s.name.trim().toLowerCase();
  if (TRICITY_LOCATION_DB[norm]) {
    const loc = TRICITY_LOCATION_DB[norm];
    const dLng = Math.abs(s.longitude - loc.lng);
    const dLat = Math.abs(s.latitude - loc.lat);
    if (dLng > 0.003 || dLat > 0.003) {
      console.log(`Discrepancy for "${s.name}": enrichment=[${s.longitude}, ${s.latitude}] vs DB=[${loc.lng}, ${loc.lat}] (diff: lng ${dLng.toFixed(4)}, lat ${dLat.toFixed(4)})`);
      count++;
    }
  }
}
console.log('Total discrepancies:', count);

