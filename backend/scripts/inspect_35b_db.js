const mongoose = require('mongoose');
const Route = require('../models/Route');
const Stop = require('../models/Stop');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/raahi');
  const route = await Route.findOne({ routeNumber: '35B' }).populate('directions.stops').lean();
  for (const dir of route.directions) {
    console.log(`\n=== Direction: ${dir.from} -> ${dir.to} ===`);
    dir.stops.forEach((st, idx) => {
      console.log(`${idx + 1}. ${st.name} -> coords: [${st.location.coordinates}], sector: ${st.sector}`);
    });
  }
  process.exit(0);
}
check();

