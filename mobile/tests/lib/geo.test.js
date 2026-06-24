import { distanceMeters, isWithinRadiusMeters, pickClosestAdultWithinRadius } from '../../src/lib/geo';

describe('geo', () => {
  test('distanceMeters is zero for identical points', () => {
    expect(distanceMeters(41.88, -87.63, 41.88, -87.63)).toBe(0);
  });

  test('pickClosestAdultWithinRadius chooses nearest within radius', () => {
    const teenLat = 41.88;
    const teenLon = -87.63;
    const responses = new Map([
      ['adult-a', { latitude: 41.881, longitude: -87.63 }],
      ['adult-b', { latitude: 41.8802, longitude: -87.63 }],
    ]);
    expect(
      pickClosestAdultWithinRadius(teenLat, teenLon, responses, ['adult-a', 'adult-b'], 400),
    ).toBe('adult-b');
  });

  test('pickClosestAdultWithinRadius ignores adults outside radius', () => {
    const responses = new Map([
      ['adult-a', { latitude: 42.5, longitude: -88.0 }],
      ['adult-b', { latitude: 41.8802, longitude: -87.63 }],
    ]);
    expect(
      pickClosestAdultWithinRadius(41.88, -87.63, responses, ['adult-a', 'adult-b'], 400),
    ).toBe('adult-b');
  });
});
