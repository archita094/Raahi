const mongoose = require('mongoose');
const Stop = require('../models/Stop');
const Route = require('../models/Route');

async function inspectLeg2() {
  await mongoose.connect('mongodb://127.0.0.1:27017/raahi');
  const routes = await Route.find({ routeNumber: { $in: ['11', '10', '14', '20'] } }).populate('directions.stops').lean();
  for (const r of routes) {
    console.log(`\n================ ROUTE ${r.routeNumber} ================`);
    for (const d of r.directions) {
      console.log(`--- ${d.from} -> ${d.to} ---`);
      d.stops.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.name} [${s.location.coordinates}] (sector: ${s.sector})`);
      });
    }
  }
  process.exit(0);
}
inspectLeg2();

