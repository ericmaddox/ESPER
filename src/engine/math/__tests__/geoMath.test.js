import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  generateGeoCircle,
  generateConeFan
} from '../geoMath';

describe('geoMath Utilities', () => {
  describe('calculateDistance', () => {
    it('returns 0 for identical points', () => {
      const dist = calculateDistance(34.0522, -118.2437, 34.0522, -118.2437);
      expect(dist).toBe(0);
    });

    it('accurately computes distance between DTLA and LAX (~19 km)', () => {
      // DTLA: [34.0522, -118.2437], LAX: [33.9416, -118.4085]
      const dist = calculateDistance(34.0522, -118.2437, 33.9416, -118.4085);
      expect(dist).toBeGreaterThan(18000);
      expect(dist).toBeLessThan(21000);
    });
  });

  describe('calculateBearing', () => {
    it('calculates approximately 0° / 360° due North', () => {
      const bearing = calculateBearing(0, 0, 1, 0);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('calculates approximately 90° due East', () => {
      const bearing = calculateBearing(0, 0, 0, 1);
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('calculates approximately 180° due South', () => {
      const bearing = calculateBearing(1, 0, 0, 0);
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('calculates approximately 270° due West', () => {
      const bearing = calculateBearing(0, 1, 0, 0);
      expect(bearing).toBeCloseTo(270, 0);
    });
  });

  describe('generateGeoCircle', () => {
    it('creates a closed polygon ring with steps + 1 points', () => {
      const steps = 36;
      const circle = generateGeoCircle(-118.2437, 34.0522, 500, steps);
      expect(circle).toHaveLength(steps + 1);

      // Verify polygon closes on itself
      const first = circle[0];
      const last = circle[circle.length - 1];
      expect(first[0]).toBeCloseTo(last[0], 5);
      expect(first[1]).toBeCloseTo(last[1], 5);
    });
  });

  describe('generateConeFan', () => {
    it('generates FOV cone coordinates starting and ending at center apex', () => {
      const centerLng = -118.2437;
      const centerLat = 34.0522;
      const steps = 12;
      const cone = generateConeFan(centerLng, centerLat, 90, 60, 300, steps);

      // First and last point must be the center point (1 apex + (steps + 1) arc points + 1 closing apex = steps + 3)
      expect(cone[0]).toEqual([centerLng, centerLat]);
      expect(cone[cone.length - 1]).toEqual([centerLng, centerLat]);
      expect(cone.length).toBe(steps + 3);
    });
  });
});
