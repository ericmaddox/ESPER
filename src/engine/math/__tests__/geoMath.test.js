import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  generateGeoCircle,
  generateConeFan,
  calculatePolygonArea,
  interpolateGeodesicPoints,
  generateTacticalPerimeterGeoJSON,
  formatDistance,
  formatArea,
  STANDOFF_PRESETS
} from '../geoMath';

describe('geoMath Utilities & Tactical Math', () => {
  describe('calculateDistance', () => {
    it('returns 0 for identical points', () => {
      const dist = calculateDistance(34.0522, -118.2437, 34.0522, -118.2437);
      expect(dist).toBe(0);
    });

    it('accurately computes distance between DTLA and LAX (~19 km)', () => {
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
      const steps = 48;
      const circle = generateGeoCircle(-118.2437, 34.0522, 500, steps);
      expect(circle).toHaveLength(steps + 1);

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
      const steps = 16;
      const cone = generateConeFan(centerLng, centerLat, 90, 60, 300, steps);

      expect(cone[0]).toEqual([centerLng, centerLat]);
      expect(cone[cone.length - 1]).toEqual([centerLng, centerLat]);
      expect(cone.length).toBe(steps + 3);
    });
  });

  describe('calculatePolygonArea', () => {
    it('returns positive area for a standard bounding box polygon', () => {
      // ~1km x ~1km box
      const box = [
        [-118.25, 34.05],
        [-118.24, 34.05],
        [-118.24, 34.06],
        [-118.25, 34.06],
        [-118.25, 34.05]
      ];
      const area = calculatePolygonArea(box);
      expect(area).toBeGreaterThan(500000);
      expect(area).toBeLessThan(2000000);
    });

    it('returns 0 for empty or invalid coords', () => {
      expect(calculatePolygonArea([])).toBe(0);
      expect(calculatePolygonArea([[-118, 34]])).toBe(0);
    });
  });

  describe('interpolateGeodesicPoints', () => {
    it('generates N + 1 interpolated points between start and end', () => {
      const start = [-118.2437, 34.0522];
      const end = [-118.4085, 33.9416];
      const steps = 20;
      const pts = interpolateGeodesicPoints(start, end, steps);

      expect(pts).toHaveLength(steps + 1);
      expect(pts[0].lng).toBeCloseTo(start[0], 4);
      expect(pts[0].lat).toBeCloseTo(start[1], 4);
      expect(pts[steps].lng).toBeCloseTo(end[0], 4);
      expect(pts[steps].lat).toBeCloseTo(end[1], 4);
      expect(pts[steps].distance).toBeGreaterThan(18000);
    });
  });

  describe('generateTacticalPerimeterGeoJSON', () => {
    it('creates 3 concentric zone polygons (cold, warm, hot)', () => {
      const geojson = generateTacticalPerimeterGeoJSON(-118.25, 34.05, 100, 250, 500);
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(3);
      expect(geojson.features[0].properties.zone).toBe('cold');
      expect(geojson.features[1].properties.zone).toBe('warm');
      expect(geojson.features[2].properties.zone).toBe('hot');
    });
  });

  describe('formatDistance and formatArea', () => {
    it('formats metric and imperial distances', () => {
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(2500)).toBe('2.50 km');
      expect(formatDistance(100, 'imperial')).toBe('328 ft');
      expect(formatDistance(5000, 'imperial')).toBe('3.11 mi');
      expect(formatDistance(null)).toBe('--');
    });

    it('formats metric and imperial areas', () => {
      expect(formatArea(5000)).toBe('5,000 m²');
      expect(formatArea(1500000)).toBe('1.50 km²');
      expect(formatArea(10000, 'imperial')).toBe('2.47 acres');
      expect(formatArea(null)).toBe('--');
    });
  });

  describe('STANDOFF_PRESETS', () => {
    it('contains valid tactical presets with positive radiuses', () => {
      expect(STANDOFF_PRESETS.SWAT_BARRICADE.hotRadius).toBe(150);
      expect(STANDOFF_PRESETS.BOMB_IED_STANDOFF.hotRadius).toBe(300);
      expect(STANDOFF_PRESETS.HAZMAT_ISOLATION.coldRadius).toBe(2000);
    });
  });
});
