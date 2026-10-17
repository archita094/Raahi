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

function snapPointToPolyline(point, polyline) {
  let minDistanceMeters = Infinity;
  let bestSnapped = [point.lat, point.lng];
  let bestSegmentIdx = 0;
  let bestFrac = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    const dx = (p2[1] - p1[1]) * 96000;
    const dy = (p2[0] - p1[0]) * 111000;
    const segLenSq = dx * dx + dy * dy;

    let t = 0;
    if (segLenSq > 0.0001) {
      const px = (point.lng - p1[1]) * 96000;
      const py = (point.lat - p1[0]) * 111000;
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
    }

    const snapLat = p1[0] + t * (p2[0] - p1[0]);
    const snapLng = p1[1] + t * (p2[1] - p1[1]);

    const distMeters = Math.hypot((point.lat - snapLat) * 111000, (point.lng - snapLng) * 96000);
    if (distMeters < minDistanceMeters) {
      minDistanceMeters = distMeters;
      bestSnapped = [snapLat, snapLng];
      bestSegmentIdx = i;
      bestFrac = t;
    }
  }

  return {
    snapped: bestSnapped,
    distanceMeters: Math.round(minDistanceMeters),
    tTotal: bestSegmentIdx + bestFrac
  };
}

async function run() {
  const planRes = await postJson('/api/routes/plan', {
    source: 'Kharar',
    destination: 'Railway Station (Chandigarh)'
  });
  const journey = planRes.data.recommendedRoute;
  const enrichRes = await postJson('/api/routing/enrich-journey', { journey });

  console.log('Enrich mapSegments count:', enrichRes.data?.mapSegments?.length);
  const busCorridorCoords = [];
  enrichRes.data.mapSegments.forEach(seg => {
    if (seg.type === 'bus' && Array.isArray(seg.geometry)) {
      seg.geometry.forEach(p => busCorridorCoords.push([Number(p[0]), Number(p[1])]));
    }
  });

  console.log(`Total road polyline vertices: ${busCorridorCoords.length}`);
  console.log('\nChecking all stops in stopDetails:');
  const stops = journey.stopDetails || [];
  let renderedCount = 0;
  stops.forEach((s, i) => {
    const snap = snapPointToPolyline(s, busCorridorCoords);
    const passes = snap.distanceMeters <= 1100;
    if (passes) renderedCount++;
    console.log(`${i + 1}. ${s.name} -> dist to road: ${snap.distanceMeters}m [${passes ? 'PASS' : 'EXCLUDED'}]`);
  });
  console.log(`\nRendered stops: ${renderedCount} / ${stops.length}`);
}

run().catch(console.error);

