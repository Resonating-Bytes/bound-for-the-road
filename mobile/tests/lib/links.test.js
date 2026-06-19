import { formatInviteCode, normalizeInviteCode } from '../../src/lib/links';

describe('links helpers', () => {
  test('formatInviteCode adds spacing', () => {
    expect(formatInviteCode('482916')).toBe('482 916');
    expect(formatInviteCode('4829')).toBe('482 9');
    expect(formatInviteCode('482')).toBe('482');
  });

  test('normalizeInviteCode strips non-digits', () => {
    expect(normalizeInviteCode('482 916')).toBe('482916');
    expect(normalizeInviteCode('482-916')).toBe('482916');
  });
});
