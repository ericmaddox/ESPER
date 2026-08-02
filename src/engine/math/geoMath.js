/**
 * ESPER 3D Geospatial Engine - Spatial & Geometric Mathematics Utilities
 */

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates geographic bearing in degrees (0-360) between two coordinates
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const lat1Rad = lat1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Generates array of circular polygon coordinates around a center point
 */
export function generateGeoCircle(centerLng, centerLat, radiusMeters, steps = 36) {
  const points = [];
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
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
export function generateConeFan(centerLng, centerLat, heading, fovAngle, rangeMeters, steps = 12) {
  const points = [[centerLng, centerLat]];
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const metersPerDegreeLat = 110574;

  const startAngle = heading - fovAngle / 2;
  const endAngle = heading + fovAngle / 2;

  for (let i = 0; i <= steps; i++) {
    const currentAngle = startAngle + (i * (endAngle - startAngle)) / steps;
    const rad = (90 - currentAngle) * (Math.PI / 180);

    const dx = rangeMeters * Math.cos(rad);
    const dy = rangeMeters * Math.sin(rad);

    const lng = centerLng + dx / metersPerDegreeLng;
    const lat = centerLat + dy / metersPerDegreeLat;

    points.push([lng, lat]);
  }
  points.push([centerLng, centerLat]);
  return points;
}
