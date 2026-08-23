import { describe, it, expect } from 'vitest';
import { getSolarPosition } from '../solarMath';

describe('solarMath Utilities', () => {
  it('calculates solar position with valid altitude and azimuth numbers', () => {
    const testDate = new Date('2026-06-21T12:00:00Z');
    const result = getSolarPosition(testDate, 34.0522, -118.2437);

    expect(typeof result.altitude).toBe('number');
    expect(typeof result.azimuth).toBe('number');
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThanOrEqual(360);
    expect(typeof result.isNight).toBe('boolean');
    expect(typeof result.isTwilight).toBe('boolean');
    expect(typeof result.lightColor).toBe('string');
    expect(typeof result.intensity).toBe('number');
  });

  it('correctly classifies night time when solar altitude is negative', () => {
    // Midnight in London (UTC)
    const midnightLondon = new Date('2026-06-21T00:00:00Z');
    const result = getSolarPosition(midnightLondon, 51.5074, -0.1278);

    expect(result.altitude).toBeLessThan(0);
    expect(result.isNight).toBe(true);
    expect(result.lightColor).toBe('#0f172a');
    expect(result.intensity).toBe(0.25);
  });

  it('correctly provides daytime lighting during local solar noon', () => {
    // Solar noon in London around summer solstice
    const noonLondon = new Date('2026-06-21T12:00:00Z');
    const result = getSolarPosition(noonLondon, 51.5074, -0.1278);

    expect(result.altitude).toBeGreaterThan(50);
    expect(result.isNight).toBe(false);
    expect(result.lightColor).toBe('#ffffff');
    expect(result.intensity).toBe(0.85);
  });
});
