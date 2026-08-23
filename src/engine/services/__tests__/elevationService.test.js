import { describe, it, expect } from 'vitest';
import {
  lngLatToTile,
  decodeTerrariumElevation,
  sampleElevationProfile,
  calculateLineOfSight
} from '../elevationService';

describe('elevationService & 3D LOS', () => {
  describe('decodeTerrariumElevation', () => {
    it('accurately decodes known Terrarium RGB values', () => {
      // (128 * 256 + 0 + 0) - 32768 = 32768 - 32768 = 0 meters (Sea Level)
      expect(decodeTerrariumElevation(128, 0, 0)).toBe(0);

      // (128 * 256 + 100 + 0) - 32768 = 100 meters
      expect(decodeTerrariumElevation(128, 100, 0)).toBe(100);

      // (130 * 256 + 0 + 0) - 32768 = 33280 - 32768 = 512 meters
      expect(decodeTerrariumElevation(130, 0, 0)).toBe(512);
    });
  });

  describe('lngLatToTile', () => {
    it('calculates valid tile coordinates and pixel offsets for Los Angeles', () => {
      const tile = lngLatToTile(-118.2437, 34.0522, 14);
      expect(tile.z).toBe(14);
      expect(tile.x).toBeGreaterThan(0);
      expect(tile.y).toBeGreaterThan(0);
      expect(tile.pixelX).toBeGreaterThanOrEqual(0);
      expect(tile.pixelX).toBeLessThan(256);
      expect(tile.pixelY).toBeGreaterThanOrEqual(0);
      expect(tile.pixelY).toBeLessThan(256);
    });
  });

  describe('sampleElevationProfile', () => {
    it('samples an elevation profile along a path', async () => {
      const start = [-118.25, 34.05];
      const end = [-118.24, 34.06];
      const result = await sampleElevationProfile(start, end, 20);

      expect(result.totalDistance).toBeGreaterThan(500);
      expect(result.profile).toHaveLength(21);
      expect(typeof result.minElevation).toBe('number');
      expect(typeof result.maxElevation).toBe('number');
    });
  });

  describe('calculateLineOfSight', () => {
    it('calculates 3D line-of-sight between observer on high vantage and ground target', async () => {
      const observer = { lng: -118.25, lat: 34.05, heightAboveGround: 100 }; // 100m rooftop
      const target = { lng: -118.245, lat: 34.052, heightAboveGround: 2 };

      const los = await calculateLineOfSight(observer, target, 25);

      expect(typeof los.clearLineOfSight).toBe('boolean');
      expect(los.totalDistance).toBeGreaterThan(0);
      expect(typeof los.slopeAngle).toBe('number');
      expect(los.observerAltitude).toBeGreaterThan(los.targetAltitude);
      expect(los.profile).toHaveLength(26);
    });
  });
});
