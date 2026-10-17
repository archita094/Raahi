const fs = require('fs');
const path = require('path');
const { geocode } = require('../services/geocodingService');

async function run() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ctu_distance_routes.json'), 'utf8'));

  const stopMap = new Map();

  data.routes.forEach(r => {
    ['going', 'returning'].forEach(dir => {
      if (r[dir] && r[dir].stops) {
        r[dir].stops.forEach(s => {
          const name = s.name.trim();
          if (!stopMap.has(name)) {
            stopMap.set(name, {
              name,
              routes: new Set(),
              appearances: 0
            });
          }
          const entry = stopMap.get(name);
          entry.appearances++;
          entry.routes.add(`${r.route_number} (${dir})`);
        });
      }
    });
  });

  const stopList = Array.from(stopMap.values()).map(entry => ({
    name: entry.name,
    appearances: entry.appearances,
    routes: Array.from(entry.routes)
  })).sort((a, b) => b.appearances - a.appearances);

  console.log(`Routes count: ${data.routes.length}`);
  console.log(`Unique stops count: ${stopList.length}`);

  const enrichedStops = [];
  for (const item of stopList) {
    const geo = await geocode(item.name);
    enrichedStops.push({
      name: item.name,
      sector: geo.sector || null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      isResolvedOffline: !!(geo.sector || (geo.name && geo.name !== item.name)),
      routes: item.routes
    });
  }

  const resolved = enrichedStops.filter(s => s.isResolvedOffline);
  console.log(`Stops with direct/sector match in local geocoder: ${resolved.length}/${stopList.length}`);

  const outputPath = path.join(__dirname, '../data/stops_for_gemini_enrichment.json');
  fs.writeFileSync(outputPath, JSON.stringify(enrichedStops, null, 2));
  console.log(`Saved stops list to: ${outputPath}`);
}

run().catch(console.error);

