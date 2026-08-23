/**
 * ESPER 3D Geospatial Engine - Air Support Division (ASD) Orbit Simulator
 * High-performance requestAnimationFrame flight physics & FLIR footprint projection
 */

import { generateConeFan } from '../math/geoMath';

export class ASDTelemetryEngine {
  constructor() {
    this.animFrameId = null;
    this.center = [-118.257, 34.046]; // Default DTLA
    this.altitudeMeters = 250; // ~820 ft AGL
    this.orbitRadiusMeters = 450;
    this.speedKnots = 65;
    this.currentAngleDeg = 0;
    this.callsign = 'AIR-SUPPORT-1';
    this.onTick = null;
    this.lastTimestamp = null;
  }

  /**
   * Starts FLIR orbiting search pattern around a target location
   */
  startOrbit(centerLng, centerLat, onTickCallback) {
    this.stopOrbit();
    this.center = [centerLng, centerLat];
    this.onTick = onTickCallback;
    this.currentAngleDeg = 0;
    this.lastTimestamp = performance.now();

    const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
    const metersPerDegreeLat = 110574;

    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.lastTimestamp) / 1000);
      this.lastTimestamp = now;

      // Angular velocity in deg/sec
      // speed in m/s = speedKnots * 0.514444
      const speedMs = this.speedKnots * 0.514444;
      const circumference = 2 * Math.PI * this.orbitRadiusMeters;
      const degPerSec = (speedMs / circumference) * 360;

      this.currentAngleDeg = (this.currentAngleDeg + degPerSec * dt) % 360;

      const rad = (this.currentAngleDeg * Math.PI) / 180;
      const dx = this.orbitRadiusMeters * Math.cos(rad);
      const dy = this.orbitRadiusMeters * Math.sin(rad);

      const lng = this.center[0] + dx / metersPerDegreeLng;
      const lat = this.center[1] + dy / metersPerDegreeLat;

      // Heading is perpendicular/tangent to orbit radius (counter-clockwise)
      const heading = (this.currentAngleDeg + 90) % 360;

      // Sensor Ground Projection FOV
      // Points toward orbit center
      const sensorBearing = (this.currentAngleDeg + 180) % 360;
      const sensorFootprint = generateConeFan(
        lng,
        lat,
        sensorBearing,
        45,
        this.orbitRadiusMeters * 1.1,
        12
      );

      const telemetry = {
        callsign: this.callsign,
        latitude: lat,
        longitude: lng,
        altitudeFeet: Math.round(this.altitudeMeters * 3.28084),
        headingDeg: Math.round(heading),
        groundSpeedKnots: this.speedKnots,
        flirTarget: this.center,
        sensorFootprint
      };

      if (this.onTick) {
        this.onTick(telemetry);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Updates orbit center to a new incident location
   */
  setTarget(centerLng, centerLat) {
    this.center = [centerLng, centerLat];
  }

  /**
   * Stops orbit simulation and animation loop
   */
  stopOrbit() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.lastTimestamp = null;
  }
}
