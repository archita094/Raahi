const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { TRICITY_LOCATION_DB } = require('../services/geocodingService');

async function fixAll() {
  console.log('1. Updating stops_for_gemini_enrichment.json with TRICITY_LOCATION_DB ground truth...');
  const enrichPath = path.join(__dirname, '../data/stops_for_gemini_enrichment.json');
  const enrichList = JSON.parse(fs.readFileSync(enrichPath, 'utf8'));

  let enrichUpdatedCount = 0;
  for (const s of enrichList) {
    const norm = s.name.trim().toLowerCase();
    if (TRICITY_LOCATION_DB[norm]) {
      const truth = TRICITY_LOCATION_DB[norm];
      if (s.longitude !== truth.lng || s.latitude !== truth.lat) {
        enrichUpdatedCount++;
        s.longitude = truth.lng;
        s.latitude = truth.lat;
        if (truth.sector) s.sector = truth.sector;
      }
    }
  }
  fs.writeFileSync(enrichPath, JSON.stringify(enrichList, null, 2), 'utf8');
  console.log(`   Updated ${enrichUpdatedCount} entries in stops_for_gemini_enrichment.json.`);

  console.log('\n2. Re-importing distance routes into MongoDB with ground truth...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/raahi';
  await mongoose.connect(mongoUri);
  console.log(`   Connected to MongoDB: ${mongoUri}`);

  const { importDistanceRoutes } = require('./import_distance_routes');
  await importDistanceRoutes();

  const Stop = require('../models/Stop');
  const allStops = await Stop.find({});
  let dbUpdatedCount = 0;
  for (const st of allStops) {
    const norm = st.normalizedName;
    if (TRICITY_LOCATION_DB[norm]) {
      const truth = TRICITY_LOCATION_DB[norm];
      if (st.location.coordinates[0] !== truth.lng || st.location.coordinates[1] !== truth.lat) {
        st.location.coordinates = [truth.lng, truth.lat];
        if (truth.sector) st.sector = truth.sector;
        await st.save();
        dbUpdatedCount++;
      }
    }
  }
  console.log(`   Directly verified/updated ${dbUpdatedCount} stops in MongoDB.`);

  console.log('\n3. Purging routing cache and geocoding cache...');
  const cachePath = path.join(__dirname, '../data/routing_cache.json');
  if (fs.existsSync(cachePath)) {
    fs.writeFileSync(cachePath, JSON.stringify({}), 'utf8');
    console.log('   Purged routing_cache.json.');
  }
  const geoCachePath = path.join(__dirname, '../data/geocoding_cache.json');
  if (fs.existsSync(geoCachePath)) {
    fs.writeFileSync(geoCachePath, JSON.stringify({}), 'utf8');
    console.log('   Purged geocoding_cache.json.');
  }

  console.log('\n=== FIX COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

fixAll().catch(err => {
  console.error('Error during fix:', err);
  process.exit(1);
});

