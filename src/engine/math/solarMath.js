/**
 * ESPER 3D Geospatial Engine - Astronomical Solar Position Calculator
 * Computes exact solar azimuth, altitude, and lighting color for any lat/lng at real clock time
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Calculates solar position (azimuth, altitude, isNight) for a given Date and GPS coordinate
 */
export function getSolarPosition(date = new Date(), lat = 34.0522, lng = -118.2437) {
  const dayOfYear = getDayOfYear(date);
  // Use UTC Universal Time for true astronomical solar position worldwide
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Solar declination (degrees)
  const declination = -23.44 * Math.cos(RAD * ((360 / 365) * (dayOfYear + 10)));

  // Equation of Time (minutes)
  const b = RAD * (360 / 365) * (dayOfYear - 81);
  const eqTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // Solar Time in UTC + Longitude offset (15 degrees per hour)
  const solarTime = (utcHours + (eqTime + 4 * lng) / 60 + 24) % 24;

  // Hour Angle (degrees from solar noon)
  const hourAngle = (solarTime - 12) * 15;

  const latRad = lat * RAD;
  const decRad = declination * RAD;
  const haRad = hourAngle * RAD;

  // Solar Altitude (Elevation angle above horizon)
  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * DEG;

  // Solar Azimuth (Compass Direction 0-360)
  const cosAzimuth =
    (Math.sin(decRad) - Math.sin(latRad) * Math.sin(altitude * RAD)) /
    (Math.cos(latRad) * Math.cos(altitude * RAD));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * DEG;

  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }

  const isNight = altitude < -0.833;
  const isTwilight = altitude >= -12 && altitude <= 3;

  // Calculate WebGL light color and intensity
  let lightColor = '#ffffff';
  let intensity = 0.8;

  if (isNight) {
    lightColor = '#0f172a'; // Deep night slate blue
    intensity = 0.25;
  } else if (isTwilight) {
    lightColor = '#fdba74'; // Soft golden amber sunset/dawn
    intensity = 0.55;
  } else {
    lightColor = '#ffffff'; // Pure daylight
    intensity = 0.85;
  }

  return {
    altitude: parseFloat(altitude.toFixed(1)),
    azimuth: parseFloat(azimuth.toFixed(1)),
    isNight,
    isTwilight,
    lightColor,
    intensity
  };
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
