
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

async function queryGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in backend/.env or environment.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

async function run() {
  const stopsPath = path.join(__dirname, '../data/stops_for_gemini_enrichment.json');
  if (!fs.existsSync(stopsPath)) {
    console.error('stops_for_gemini_enrichment.json not found. Run analyze_distance_routes.js first.');
    return;
  }

  const stops = JSON.parse(fs.readFileSync(stopsPath, 'utf8'));
  console.log(`Loaded ${stops.length} total unique stops.`);

  const stopsToQuery = stops.filter(s => !s.isResolvedOffline);
  console.log(`Stops needing Gemini coordinate lookup: ${stopsToQuery.length}`);

  if (!GEMINI_API_KEY) {
    console.log('\n[INFO] GEMINI_API_KEY is currently not set.');
    console.log('To run coordinate lookup automatically, add your key to backend/.env:');
    console.log('  GEMINI_API_KEY=your_gemini_api_key\n');
    return;
  }

  const batchSize = 25;
  const enrichedMap = {};

  for (let i = 0; i < stopsToQuery.length; i += batchSize) {
    const batch = stopsToQuery.slice(i, i + batchSize).map(s => s.name);
    console.log(`Querying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stopsToQuery.length / batchSize)} (${batch.length} stops)...`);

    const prompt = `
You are a GIS geographic geocoding specialist for the Chandigarh Tricity region (Chandigarh, Mohali, Panchkula, Kharar, Dera Bassi, Zirakpur).
For each of the following bus stop / landmark names, provide the most accurate real-world latitude and longitude (decimal degrees) and the sector/locality.

Bus stops list:
${JSON.stringify(batch)}

Respond ONLY with a valid JSON array of objects with the exact schema:
[
  {
    "name": "Exact Stop Name from list",
    "latitude": 30.xxxx,
    "longitude": 76.xxxx,
    "sector": "Sector or locality name (e.g. 'Phase 2 Mohali', 'Sector 17', 'Zirakpur')"
  }
]
`;

    try {
      const results = await queryGemini(prompt);
      results.forEach(item => {
        enrichedMap[item.name] = {
          latitude: item.latitude,
          longitude: item.longitude,
          sector: item.sector
        };
      });
      console.log(`Batch processed successfully (${results.length} items).`);
    } catch (err) {
      console.error(`Error querying batch:`, err.message);
    }
  }

  const updatedStops = stops.map(s => {
    if (enrichedMap[s.name]) {
      return {
        ...s,
        latitude: enrichedMap[s.name].latitude,
        longitude: enrichedMap[s.name].longitude,
        sector: enrichedMap[s.name].sector,
        isResolvedOffline: true,
        source: 'gemini-api'
      };
    }
    return s;
  });

  const outputPath = path.join(__dirname, '../data/stops_enriched.json');
  fs.writeFileSync(outputPath, JSON.stringify(updatedStops, null, 2));
  console.log(`\nEnriched stops saved to: ${outputPath}`);
}

if (require.main === module) {
  run().catch(console.error);
}

