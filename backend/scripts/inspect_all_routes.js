const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/../data/ctu_distance_routes.json', 'utf8'));
console.log('Routes in dataset:');
data.routes.forEach(r => {
  console.log(`${r.route_number}: ${r.going?.from} -> ${r.going?.to} (${r.going?.stops?.length} stops)`);
});

