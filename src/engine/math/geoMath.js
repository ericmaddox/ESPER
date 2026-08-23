/**
 * ESPER 3D Geospatial Engine - Spatial & Geometric Mathematics Utilities
 * Zero external dependencies, pure WGS84 geodesic & tactical spatial math
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EARTH_RADIUS = 6371000; // Radius of Earth in meters

/**
 * Standard Tactical Standoff & Cordon Presets (Generic / Industry Standard)
 */
export const STANDOFF_PRESETS = {
  SWAT_BARRICADE: {
    id: 'swat-barricade',
    name: 'SWAT Barricade / High Threat',
    hotRadius: 150, // 150m Inner Cordon
    warmRadius: 300, // 300m Command Post / Staging
    coldRadius: 600, // 600m Outer Containment
    description: 'High-risk warrant & active barricade cordon zones'
  },
  BOMB_IED_STANDOFF: {
    id: 'bomb-ied',
    name: 'IED / Bomb Squad Standoff',
    hotRadius: 300, // 300m Blast Hazard Zone
    warmRadius: 500, // 500m Bomb Tech Staging
    coldRadius: 1000, // 1000m Mandatory Evacuation Perimeter
    description: 'Mandatory explosive fragmentation standoff'
  },
  HAZMAT_ISOLATION: {
    id: 'hazmat-isolation',
    name: 'HAZMAT / Toxic Isolation',
    hotRadius: 500, // 500m Hot Exclusion Zone
    warmRadius: 1000, // 1000m Decontamination Zone
    coldRadius: 2000, // 2000m Downwind Shelter-in-Place
    description: 'Hazardous chemical & toxic release containment'
  },
  CIVIL_PERIMETER: {
    id: 'civil-perimeter',
    name: 'Active Scene / Perimeter',
    hotRadius: 75, // 75m Direct Scene
    warmRadius: 175, // 175m Staging
    coldRadius: 350, // 350m Perimeter Traffic Control
    description: 'Standard crime scene containment & traffic cordon'
  }
};

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * Calculates geographic bearing in degrees (0-360) between two coordinates
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * RAD;
  const lat1Rad = lat1 * RAD;
  const lat2Rad = lat2 * RAD;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let brng = Math.atan2(y, x) * DEG;
  return (brng + 360) % 360;
}

/**
 * Generates array of circular polygon coordinates around a center point
 */
export function generateGeoCircle(centerLng, centerLat, radiusMeters, steps = 48) {
  const points = [];
  const metersPerDegreeLng = 111320 * Math.cos(centerLat * RAD);
  const metersPerDegreeLat = 110574;

  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);

    const lng = centerLng + dx / metersPerDegreeLng;
    const lat = centerLat + dy / metersPerDegreeLat;

    points.push([lng, lat]);
  }
  return points;
}

/**
 * Generates 3D field-of-view (FOV) cone frustum polygon coordinates
 */
export function generateConeFan(centerLng, centerLat, heading, fovAngle, rangeMeters, steps = 16) {
  const points = [[centerLng, centerLat]];
  const metersPerDegreeLng = 111320 * Math.cos(centerLat * RAD);
  const metersPerDegreeLat = 110574;

  const startAngle = heading - fovAngle / 2;
  const endAngle = heading + fovAngle / 2;

  for (let i = 0; i <= steps; i++) {
    const currentAngle = startAngle + (i * (endAngle - startAngle)) / steps;
    const rad = (90 - currentAngle) * RAD;

    const dx = rangeMeters * Math.cos(rad);
    const dy = rangeMeters * Math.sin(rad);

    const lng = centerLng + dx / metersPerDegreeLng;
    const lat = centerLat + dy / metersPerDegreeLat;

    points.push([lng, lat]);
  }
  points.push([centerLng, centerLat]);
  return points;
}

/**
 * Computes Geodesic Area of a polygon on WGS84 sphere in square meters
 * using the standard spherical trapezoid integration formula
 */
export function calculatePolygonArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;

  // If coordinates are wrapped in a FeatureCollection or polygon ring array
  const ring =
    Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])
      ? coordinates[0]
      : coordinates;

  if (ring.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    const x1 = p1[0] * RAD;
    const y1 = p1[1] * RAD;
    const x2 = p2[0] * RAD;
    const y2 = p2[1] * RAD;
    area += (x2 - x1) * (2 + Math.sin(y1) + Math.sin(y2));
  }

  area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2.0;
  return Math.round(Math.abs(area));
}

/**
 * Interpolates N evenly spaced geodesic points between Start and End coordinates
 */
export function interpolateGeodesicPoints(startLngLat, endLngLat, steps = 50) {
  const [lng1, lat1] = startLngLat;
  const [lng2, lat2] = endLngLat;
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
    const distanceSoFar = calculateDistance(lat1, lng1, lat, lng);
    points.push({
      lng,
      lat,
      distance: distanceSoFar,
      progress: t
    });
  }

  return points;
}

/**
 * Generates full multi-tier tactical perimeter GeoJSON FeatureCollection
 */
export function generateTacticalPerimeterGeoJSON(
  centerLng,
  centerLat,
  hotRadius,
  warmRadius,
  coldRadius
) {
  const hotCircle = generateGeoCircle(centerLng, centerLat, hotRadius);
  const warmCircle = generateGeoCircle(centerLng, centerLat, warmRadius);
  const coldCircle = generateGeoCircle(centerLng, centerLat, coldRadius);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          zone: 'cold',
          name: 'Outer Containment Cordon',
          radius: coldRadius,
          color: '#06b6d4',
          fillOpacity: 0.08
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coldCircle]
        }
      },
      {
        type: 'Feature',
        properties: {
          zone: 'warm',
          name: 'Command Staging / Triage',
          radius: warmRadius,
          color: '#f59e0b',
          fillOpacity: 0.12
        },
        geometry: {
          type: 'Polygon',
          coordinates: [warmCircle]
        }
      },
      {
        type: 'Feature',
        properties: {
          zone: 'hot',
          name: 'Hot Zone / Inner Threat',
          radius: hotRadius,
          color: '#ef4444',
          fillOpacity: 0.22
        },
        geometry: {
          type: 'Polygon',
          coordinates: [hotCircle]
        }
      }
    ]
  };
}

/**
 * Smart formatting for distances (meters, feet, km, miles)
 */
export function formatDistance(meters, unit = 'metric') {
  if (meters === undefined || meters === null || isNaN(meters)) return '--';
  if (unit === 'imperial') {
    const feet = meters * 3.28084;
    if (feet >= 5280) {
      return `${(feet / 5280).toFixed(2)} mi`;
    }
    return `${Math.round(feet)} ft`;
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Smart formatting for areas (m², km², sq ft, acres)
 */
export function formatArea(sqMeters, unit = 'metric') {
  if (sqMeters === undefined || sqMeters === null || isNaN(sqMeters)) return '--';
  if (unit === 'imperial') {
    const sqFeet = sqMeters * 10.7639;
    const acres = sqMeters * 0.000247105;
    if (acres >= 1) {
      return `${acres.toFixed(2)} acres`;
    }
    return `${Math.round(sqFeet).toLocaleString()} sq ft`;
  }

  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
  return `${Math.round(sqMeters).toLocaleString()} m²`;
}
