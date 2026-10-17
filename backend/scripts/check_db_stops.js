const mongoose = require('mongoose');
const Stop = require('../models/Stop');
const { TRICITY_LOCATION_DB } = require('../services/geocodingService');

async function checkAll() {
  await mongoose.connect('mongodb://127.0.0.1:27017/raahi');
  const stops = await Stop.find({}).lean();
  console.log(`Found ${stops.length} stops in DB.`);

  let fixCount = 0;
  for (const s of stops) {
    const norm = s.normalizedName;
    if (TRICITY_LOCATION_DB[norm]) {
      const truth = TRICITY_LOCATION_DB[norm];
      const curLng = s.location.coordinates[0];
      const curLat = s.location.coordinates[1];
      const dist = Math.hypot(curLng - truth.lng, curLat - truth.lat);
      if (dist > 0.003) {
        console.log(`STOP MISMATCH: "${s.name}" (norm: "${norm}") -> DB coords: [${curLng}, ${curLat}], TRICITY_LOCATION_DB coords: [${truth.lng}, ${truth.lat}], dist: ${dist.toFixed(4)}`);
        fixCount++;
      }
    }
  }
  console.log(`Total stops with discrepancy vs TRICITY_LOCATION_DB: ${fixCount}`);
  process.exit(0);
}
checkAll();

