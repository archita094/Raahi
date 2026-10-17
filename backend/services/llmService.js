
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

function generateDeterministicExplanation({ sourceStop, destinationStop, directRoutes, transferRoutes }) {
  const parts = [];

  if (directRoutes && directRoutes.length > 0) {
    const bestDirect = directRoutes[0];
    parts.push(
      `🚌 Direct Bus: Take Bus ${bestDirect.busNumber} directly from ${sourceStop.name} to ${destinationStop.name}. Total travel time is approximately ${bestDirect.estimatedTime} min across ${bestDirect.distance} km with 0 transfers.`
    );
  }

  if (transferRoutes && transferRoutes.length > 0) {
    const bestTransfer = transferRoutes[0];
    const b1 = bestTransfer.legs[0];
    const b2 = bestTransfer.legs[1];
    const xfr = bestTransfer.transferStops[0];
    parts.push(
      `🔄 Bus Change: Board Bus ${b1.busNumber} from ${sourceStop.name} to ${xfr} (${b1.estimatedTime} min), then transfer to Bus ${b2.busNumber} towards ${destinationStop.name} (${b2.estimatedTime} min). Total journey time is ~${bestTransfer.totalEstimatedTime} min across ${bestTransfer.totalDistance} km (includes ~${bestTransfer.transferWaitMinutes || 5} min transfer wait).`
    );
  }

  if (directRoutes.length > 0 && transferRoutes.length > 0) {
    const dirTime = directRoutes[0].estimatedTime;
    const xfrTime = transferRoutes[0].totalEstimatedTime;
    if (xfrTime < dirTime) {
      parts.push(`💡 Comparison: Changing buses via ${transferRoutes[0].transferStops[0]} saves roughly ${dirTime - xfrTime} minutes compared to the direct bus.`);
    } else if (dirTime < xfrTime) {
      parts.push(`💡 Comparison: The direct bus is both faster by ${xfrTime - dirTime} minutes and requires zero transfers.`);
    } else {
      parts.push(`💡 Comparison: Both options have similar travel times (~${dirTime} min). Direct offers a seamless ride without transfers.`);
    }
  }

  return parts.join('\n\n');
}

async function generateRouteExplanation({ sourceStop, destinationStop, directRoutes, transferRoutes, retrievedFacts = [] }) {

  const fallback = generateDeterministicExplanation({ sourceStop, destinationStop, directRoutes, transferRoutes });

  if (!GEMINI_API_KEY) {
    return {
      text: fallback,
      source: 'deterministic-engine'
    };
  }

  const prompt = `
You are Raahi, an expert transit assistant for Chandigarh CTU bus commuters.
Explain the following calculated CTU route options to the commuter in 2-3 concise, helpful sentences.

STRICT ACCURACY RULES:
1. ONLY use the exact bus numbers, stops, distances, and times provided below.
2. NEVER invent, assume, or alter any bus number, stop name, or travel time.
3. Compare the Direct Bus option vs the Bus Change option factually without bias.

CALCULATED TRANSIT DATA:
- Source: ${sourceStop.name} (${sourceStop.isExactMatch ? 'Exact bus stop' : `Nearest bus stop, ${sourceStop.distanceKm} km away`})
- Destination: ${destinationStop.name} (${destinationStop.isExactMatch ? 'Exact bus stop' : `Nearest bus stop, ${destinationStop.distanceKm} km away`})

DIRECT ROUTES (0 transfers):
${directRoutes.map(d => `- Bus ${d.busNumber}: ${d.from} to ${d.to}, Distance: ${d.distance} km, Time: ${d.estimatedTime} min`).join('\n') || 'None available'}

BUS CHANGE ROUTES (1 transfer):
${transferRoutes.slice(0, 2).map(t => `- Bus ${t.busNumbers[0]} (${t.legs[0].from} to ${t.transferStops[0]}, ${t.legs[0].estimatedTime} min) -> Transfer at ${t.transferStops[0]} -> Bus ${t.busNumbers[1]} (to ${t.legs[1].to}, ${t.legs[1].estimatedTime} min). Total Distance: ${t.totalDistance} km, Total Time: ${t.totalEstimatedTime} min`).join('\n') || 'None available'}

VERIFIED CTU FACTS:
${retrievedFacts.map(f => `- ${f.content}`).join('\n')}

Provide a natural, friendly summary. Include a brief comparison highlighting the tradeoff between zero-transfers vs travel time.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.2 }
      })
    });

    if (!response.ok) {
      return { text: fallback, source: 'deterministic-fallback' };
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (generatedText) {
      return { text: generatedText, source: 'gemini-ai' };
    }
    return { text: fallback, source: 'deterministic-fallback' };
  } catch (err) {
    console.warn('[LLM] Gemini request failed, using deterministic explanation:', err.message);
    return { text: fallback, source: 'deterministic-fallback' };
  }
}

module.exports = {
  generateRouteExplanation,
  generateDeterministicExplanation
};

