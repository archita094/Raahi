
import { MOCK_LOCATIONS } from '../data/mockJourneys';
import { fetchAutocompleteApi } from './api';

const cache = new Map();

export async function searchPlacesFree(query) {
  const q = (query || '').trim();
  if (!q) {
    return MOCK_LOCATIONS.slice(0, 6).map((loc, i) => ({
      id: `mock-${i}`,
      name: loc.name,
      detail: loc.detail || 'Chandigarh Tricity Hub',
      lat: loc.location?.coordinates?.[1] || (30.7333 - i * 0.005),
      lng: loc.location?.coordinates?.[0] || (76.7794 + i * 0.005)
    }));
  }

  const cacheKey = q.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const results = [];
  const seenNames = new Set();

  try {
    const localMatches = MOCK_LOCATIONS.filter((loc) => {
      const name = (loc.name || '').toLowerCase();
      const detail = (loc.detail || '').toLowerCase();
      return name.includes(cacheKey) || detail.includes(cacheKey) || cacheKey.includes(name);
    });

    localMatches.forEach((loc, i) => {
      const nameKey = loc.name.toLowerCase();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        results.push({
          id: `local-${i}`,
          name: loc.name,
          detail: loc.detail || 'Chandigarh Transit Stop',
          lat: loc.location?.coordinates?.[1] || 30.7333,
          lng: loc.location?.coordinates?.[0] || 76.7794,
          isLocalTransit: true
        });
      }
    });
  } catch (err) {

  }

  try {
    const backendMatches = await fetchAutocompleteApi(q);
    if (Array.isArray(backendMatches) && backendMatches.length > 0) {
      backendMatches.forEach((item, i) => {
        const nameKey = (item.name || '').toLowerCase();
        if (nameKey && !seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          results.push({
            id: item.id || `api-${i}`,
            name: item.name,
            detail: item.detail || 'Chandigarh Tricity Destination',
            lat: Number(item.lat),
            lng: Number(item.lng),
            isLocalTransit: !!item.isTransitStop
          });
        }
      });
    }
  } catch (err) {
    console.warn('[FreeGeocoder] Backend autocomplete check completed:', err.message);
  }

  if (results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        `${q}, Chandigarh Tricity`
      )}&countrycodes=in&viewbox=76.40,30.95,77.10,30.55&bounded=0&limit=6`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(nomUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          list.forEach((item, idx) => {
            const rawName = item.display_name || item.name || q;
            const parts = rawName.split(',').map((p) => p.trim());
            const shortName = parts[0] || item.name || q;
            const nameKey = shortName.toLowerCase();

            if (!seenNames.has(nameKey)) {
              seenNames.add(nameKey);
              const detail = parts.slice(1, 3).join(', ') || 'Chandigarh Region';
              results.push({
                id: `nom-${idx}-${item.osm_id || Math.random()}`,
                name: shortName,
                detail: detail,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                isLocalTransit: false
              });
            }
          });
        }
      }
    } catch (err) {

    }
  }

  const finalResults = results.slice(0, 8);
  cache.set(cacheKey, finalResults);
  return finalResults;
}

