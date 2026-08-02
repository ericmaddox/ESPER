/**
 * ESPER 3D Geospatial Engine - Geocoding & Spatial Search Service
 * Powered by OpenStreetMap Nominatim with local query caching
 */

const CACHE = new Map();

/**
 * Searches for a location query string and returns array of geocoded results
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();
  if (CACHE.has(cleanQuery)) {
    return CACHE.get(cleanQuery);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ESPER-3D-Geospatial-Engine/2.0'
      }
    });

    if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
    const data = await res.json();

    const results = data.map(item => ({
      id: item.place_id,
      name: item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
      category: item.class,
      boundingbox: item.boundingbox
    }));

    CACHE.set(cleanQuery, results);
    return results;
  } catch (err) {
    console.warn('Geocoding search error:', err);
    return [];
  }
}

/**
 * Reverse geocodes lat/lng coordinates to human readable address
 */
export async function reverseGeocode(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ESPER-3D-Geospatial-Engine/2.0'
      }
    });

    if (!res.ok) throw new Error(`Reverse geocoding error: ${res.status}`);
    const data = await res.json();

    const result = {
      address: data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      building: data.address?.building || data.address?.amenity || null,
      road: data.address?.road || '',
      suburb: data.address?.suburb || data.address?.neighbourhood || '',
      city: data.address?.city || data.address?.town || 'Los Angeles'
    };

    CACHE.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
    return {
      address: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      building: null,
      road: '',
      suburb: '',
      city: ''
    };
  }
}
