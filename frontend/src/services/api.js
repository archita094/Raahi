const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      const err = new Error(data.error?.message || `API error: ${response.status}`);
      err.code = data.error?.code;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.warn(`[API] Request failed for ${endpoint}:`, err.message);
    throw err;
  }
}

export async function searchStops(query) {
  try {
    const res = await apiRequest(`/stops/search?q=${encodeURIComponent(query || '')}`);
    return res.data || [];
  } catch (err) {
    return [];
  }
}

export async function fetchAutocompleteApi(query) {
  try {
    const res = await apiRequest(`/routing/autocomplete?q=${encodeURIComponent(query || '')}`);
    return res.data || [];
  } catch (err) {
    return [];
  }
}

export async function getNearbyStops(latitude, longitude, radius = 2000) {
  try {
    const res = await apiRequest(`/stops/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    return res.data || [];
  } catch (err) {
    return [];
  }
}

export async function planJourney(origin, destination, preferences = { priority: 'balanced' }) {
  const payload = {
    origin,
    destination,
    timingMode: preferences.timingMode || (preferences.departureTime ? 'later' : 'now'),
    departureTime: preferences.departureTime || preferences.time || null,
    preferences
  };

  const res = await apiRequest('/routes/plan', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return res.data;
}

export async function getWalkingRouteApi(fromLat, fromLng, toLat, toLng) {
  try {
    const res = await apiRequest(`/routing/walk?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
    return res.data;
  } catch (err) {
    return {
      geometry: null,
      distanceMeters: 0,
      durationMinutes: 0,
      distanceText: '',
      durationText: '',
      geometryUnavailable: true
    };
  }
}

export async function getRoadCorridorRouteApi(stops) {
  try {
    const res = await apiRequest('/routing/road-corridor', {
      method: 'POST',
      body: JSON.stringify({ stops })
    });
    return res.data;
  } catch (err) {
    return { geometry: null, isUnavailable: true };
  }
}

export async function enrichJourneyGeometryApi(journey, userLocation, destination, origin) {
  try {
    const res = await apiRequest('/routing/enrich-journey', {
      method: 'POST',
      body: JSON.stringify({ journey, userLocation, destination, origin })
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Could not enrich journey geometry:', err.message);
    return journey;
  }
}

export const planJourneyApi = planJourney;

