
const fs = require('fs');
const path = require('path');

let KNOWLEDGE_DOCS = null;

function buildKnowledgeBase() {
  if (KNOWLEDGE_DOCS) return KNOWLEDGE_DOCS;

  const dataPath = path.join(__dirname, '../data/ctu_distance_routes.json');
  if (!fs.existsSync(dataPath)) {
    KNOWLEDGE_DOCS = [];
    return KNOWLEDGE_DOCS;
  }

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const docs = [];

  for (const r of raw.routes) {
    const goingStops = r.going?.stops?.map(s => s.name) || [];
    const returnStops = r.returning?.stops?.map(s => s.name) || [];
    const maxDist = Math.max(
      r.going?.stops?.slice(-1)[0]?.distance_km || 0,
      r.returning?.stops?.slice(-1)[0]?.distance_km || 0
    );

    docs.push({
      id: `route-${r.route_number}`,
      type: 'route',
      routeNumber: r.route_number,
      title: `CTU Bus Route ${r.route_number}`,
      content: `CTU Bus Route ${r.route_number} operates between ${r.going?.from || ''} and ${r.going?.to || ''}. Outbound path covers ${goingStops.length} stops (${goingStops.slice(0, 5).join(', ')} ... ${goingStops.slice(-3).join(', ')}). Return path covers ${returnStops.length} stops. Total one-way route distance is ${maxDist} km.`,
      metadata: {
        routeNumber: r.route_number,
        from: r.going?.from,
        to: r.going?.to,
        distanceKm: maxDist,
        stops: Array.from(new Set([...goingStops, ...returnStops]))
      }
    });
  }

  KNOWLEDGE_DOCS = docs;
  return KNOWLEDGE_DOCS;
}

function retrieveTransitContext(sourceStop, destStop, activeBuses = []) {
  const docs = buildKnowledgeBase();
  const busSet = new Set((activeBuses || []).map(b => String(b).toUpperCase()));
  const sLower = (sourceStop || '').toLowerCase();
  const dLower = (destStop || '').toLowerCase();

  const matched = docs.filter(doc => {

    if (busSet.has(doc.routeNumber.toUpperCase())) {
      return true;
    }

    const stopsLower = (doc.metadata?.stops || []).map(s => s.toLowerCase());
    const hasSource = stopsLower.some(s => s.includes(sLower) || sLower.includes(s));
    const hasDest = stopsLower.some(s => s.includes(dLower) || dLower.includes(s));
    return hasSource || hasDest;
  });

  return matched.slice(0, 5);
}

module.exports = {
  buildKnowledgeBase,
  retrieveTransitContext
};

