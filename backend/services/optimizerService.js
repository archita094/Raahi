
const DEFAULT_WEIGHTS = {
  balanced: { cost: 0.35, time: 0.35, distance: 0.15, transfers: 0.15 },
  cost: { cost: 0.60, time: 0.20, distance: 0.10, transfers: 0.10 },
  time: { cost: 0.10, time: 0.70, distance: 0.10, transfers: 0.10 },
  walking: { cost: 0.15, time: 0.25, distance: 0.20, transfers: 0.40 }
};

function normalizeValues(arr) {
  if (arr.length === 0) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return arr.map(() => 0.5);
  return arr.map(v => (v - min) / (max - min));
}

function optimizeAndCategorizeJourneys(journeys, priority = 'balanced', customWeights = null) {
  if (!journeys || journeys.length === 0) {
    return {
      availableRoutes: [],
      recommendedRoute: null,
      cheapestRoute: null,
      fastestRoute: null,
      shortestRoute: null,
      fewestTransferRoute: null
    };
  }

  const weights = customWeights || DEFAULT_WEIGHTS[priority] || DEFAULT_WEIGHTS.balanced;

  const costs = journeys.map(j => j.fareAmount || 15);
  const times = journeys.map(j => j.totalTimeMinutes || 30);
  const distances = journeys.map(j => j.distanceKm || 10);
  const transfers = journeys.map(j => j.transfersNum || 0);

  const normCost = normalizeValues(costs);
  const normTime = normalizeValues(times);
  const normDist = normalizeValues(distances);
  const normTrans = normalizeValues(transfers);

  const scoredJourneys = journeys.map((j, idx) => {
    const score = (normCost[idx] * weights.cost) +
                  (normTime[idx] * weights.time) +
                  (normDist[idx] * weights.distance) +
                  (normTrans[idx] * weights.transfers);

    return {
      ...j,
      score: parseFloat(score.toFixed(4))
    };
  });

  scoredJourneys.sort((a, b) => a.score - b.score);

  const cheapestRoute = [...scoredJourneys].sort((a, b) => a.fareAmount - b.fareAmount)[0] || null;
  const fastestRoute = [...scoredJourneys].sort((a, b) => a.totalTimeMinutes - b.totalTimeMinutes)[0] || null;
  const shortestRoute = [...scoredJourneys].sort((a, b) => a.distanceKm - b.distanceKm)[0] || null;
  const fewestTransferRoute = [...scoredJourneys].sort((a, b) => a.transfersNum - b.transfersNum)[0] || null;
  const recommendedRoute = scoredJourneys[0] || null;

  if (recommendedRoute) {
    recommendedRoute.type = 'recommended';
    recommendedRoute.tag = 'RECOMMENDED';
  }
  if (fastestRoute && fastestRoute.id !== recommendedRoute.id) {
    fastestRoute.type = 'fastest';
    fastestRoute.tag = 'FASTEST';
  }
  if (cheapestRoute && cheapestRoute.id !== recommendedRoute.id && cheapestRoute.id !== fastestRoute?.id) {
    cheapestRoute.type = 'cheapest';
    cheapestRoute.tag = 'CHEAPEST';
  }

  return {
    availableRoutes: scoredJourneys,
    recommendedRoute,
    cheapestRoute,
    fastestRoute,
    shortestRoute,
    fewestTransferRoute
  };
}

module.exports = {
  optimizeAndCategorizeJourneys,
  DEFAULT_WEIGHTS
};

