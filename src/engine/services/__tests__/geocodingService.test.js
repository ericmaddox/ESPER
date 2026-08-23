import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchLocation, reverseGeocode } from '../geocodingService';

describe('geocodingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchLocation', () => {
    it('returns empty array for empty or short query', async () => {
      const res = await searchLocation('');
      expect(res).toEqual([]);

      const shortRes = await searchLocation('a');
      expect(shortRes).toEqual([]);
    });

    it('parses Nominatim search results properly', async () => {
      const mockApiResponse = [
        {
          place_id: 12345,
          display_name: 'Tokyo Tower, Minato, Tokyo, Japan',
          lat: '35.6586',
          lon: '139.7454',
          type: 'tower',
          class: 'tourism',
          boundingbox: ['35.65', '35.66', '139.74', '139.75']
        }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const results = await searchLocation('Tokyo Tower');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 12345,
        name: 'Tokyo Tower',
        address: 'Tokyo Tower, Minato, Tokyo, Japan',
        latitude: 35.6586,
        longitude: 139.7454,
        type: 'tower',
        category: 'tourism',
        boundingbox: ['35.65', '35.66', '139.74', '139.75']
      });
    });

    it('handles network errors gracefully without crashing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const results = await searchLocation('Error Query 999');
      expect(results).toEqual([]);
    });
  });

  describe('reverseGeocode', () => {
    it('parses reverse geocode response properly', async () => {
      const mockApiResponse = {
        display_name: '100 Main St, Los Angeles, CA',
        address: {
          road: 'Main St',
          suburb: 'Downtown',
          city: 'Los Angeles'
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const result = await reverseGeocode(34.0522, -118.2437);
      expect(result.address).toBe('100 Main St, Los Angeles, CA');
      expect(result.road).toBe('Main St');
      expect(result.suburb).toBe('Downtown');
    });

    it('falls back to GPS coordinate string on failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed'));
      const result = await reverseGeocode(34.12345, -118.54321);
      expect(result.address).toContain('GPS: 34.12345, -118.54321');
    });
  });
});
