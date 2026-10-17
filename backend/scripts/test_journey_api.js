const http = require('http');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testPlan() {
  console.log('Testing POST /api/routes/plan for Kharar -> Railway Station (Chandigarh)...');
  const planRes = await postJson('/api/routes/plan', {
    source: 'Kharar',
    destination: 'Railway Station (Chandigarh)'
  });

  const route = planRes.data.recommendedRoute || planRes.data.selectedRoute;
  console.log(`Route has ${route.legs.length} legs. Transfers: ${route.transfersCount}`);
  for (let i = 0; i < route.legs.length; i++) {
    const leg = route.legs[i];
    console.log(`\nLeg ${i+1}: Route ${leg.busNumber || leg.routeNumber} (${leg.from} -> ${leg.to})`);
    console.log(`  Stops count: ${leg.stops?.length}`);
    leg.stops?.forEach((s, idx) => {
      console.log(`    ${idx+1}. ${s.name || s} [${s.coordinates || s.lng ? [s.lng, s.lat] : ''}]`);
    });
  }

  console.log('\nEnriching journey with /api/routing/enrich-journey...');
  const enrichRes = await postJson('/api/routing/enrich-journey', { journey: route });
  console.log('Enrich success:', enrichRes.success);
  if (enrichRes.success && enrichRes.data?.legs) {
    for (let i = 0; i < enrichRes.data.legs.length; i++) {
      const el = enrichRes.data.legs[i];
      console.log(`\n=== Enriched Leg ${i+1}: Route ${el.routeNumber || el.busNumber} ===`);
      console.log(`Geometry points: ${el.routeGeometry?.coordinates?.length}`);
      console.log(`Rendered stops count: ${el.stops?.length}`);
      el.stops?.forEach((s, idx) => {
        console.log(`  ${idx+1}. ${s.name} [${s.coordinates}]`);
      });
    }
  }
}

testPlan().catch(console.error);

