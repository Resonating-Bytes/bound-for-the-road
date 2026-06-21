import {
  borderLightnessDelta,
  deriveHeaderBorderFromBackground,
  headerBorderDistanceFromMid,
  HEADER_BORDER_TUNING,
} from '../../src/theme/colorMath';
import { LUMINANCE_THRESHOLD, relativeLuminance } from '../../src/theme/contrast';
import { HEADER_THEME_PRESETS } from '../../src/theme/presets';

describe('colorMath preset header border', () => {
  test('distance from mid is zero at luminance threshold', () => {
    expect(headerBorderDistanceFromMid(LUMINANCE_THRESHOLD, true)).toBe(0);
    expect(headerBorderDistanceFromMid(LUMINANCE_THRESHOLD, false)).toBe(0);
  });

  test('distance increases toward black and white', () => {
    expect(headerBorderDistanceFromMid(0.1, true)).toBeGreaterThan(
      headerBorderDistanceFromMid(0.3, true),
    );
    expect(headerBorderDistanceFromMid(0.9, false)).toBeGreaterThan(
      headerBorderDistanceFromMid(0.6, false),
    );
  });

  test('borderLightnessDelta is base at midpoint and base + extra at extremes', () => {
    expect(borderLightnessDelta(6, 16, 0)).toBe(6);
    expect(borderLightnessDelta(6, 16, 1)).toBe(22);
    expect(borderLightnessDelta(3, 7, 0.5)).toBe(6.5);
  });

  test('farther from mid on dark side yields larger border shift', () => {
    const midnight = HEADER_THEME_PRESETS.find((p) => p.id === 'midnight');
    const charcoal = HEADER_THEME_PRESETS.find((p) => p.id === 'charcoal');
    const midnightDist = headerBorderDistanceFromMid(
      relativeLuminance(midnight.headerBackground),
      true,
    );
    const charcoalDist = headerBorderDistanceFromMid(
      relativeLuminance(charcoal.headerBackground),
      true,
    );
    expect(midnightDist).toBeGreaterThan(charcoalDist);
  });

  test('near-midpoint preset still differs from background at distance zero', () => {
    const atThreshold = deriveHeaderBorderFromBackground('#737373', {
      ...HEADER_BORDER_TUNING,
      darkHeaderBaseLightnessDelta: 6,
      darkHeaderExtraLightnessDelta: 16,
    });
    expect(atThreshold).not.toBe('#737373');
  });
});
