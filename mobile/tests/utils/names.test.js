import {
  firstTokenFromLegalName,
  casualLabel,
  clampName,
  limitNameLength,
  MAX_DISPLAY_NAME_LENGTH,
} from '../../src/utils/names';

describe('names', () => {
  test('firstTokenFromLegalName', () => {
    expect(firstTokenFromLegalName('Jane Marie Doe')).toBe('Jane');
    expect(firstTokenFromLegalName('  Alex  ')).toBe('Alex');
    expect(firstTokenFromLegalName('')).toBe('');
  });

  test('limitNameLength preserves internal spaces while typing', () => {
    expect(limitNameLength('Jane ', MAX_DISPLAY_NAME_LENGTH)).toBe('Jane ');
    expect(limitNameLength('Jane Doe', MAX_DISPLAY_NAME_LENGTH)).toBe('Jane Doe');
  });

  test('clampName trims and caps length silently', () => {
    const long = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 10);
    expect(clampName(`  ${long}  `, MAX_DISPLAY_NAME_LENGTH)).toHaveLength(
      MAX_DISPLAY_NAME_LENGTH,
    );
  });

  test('casualLabel prefers nickname over display name', () => {
    expect(
      casualLabel({ nickname: 'Mom', displayName: 'Jane', fallback: 'Linked account' }),
    ).toBe('Mom');
    expect(casualLabel({ displayName: 'Jane', fallback: 'Linked account' })).toBe('Jane');
    expect(casualLabel({ fallback: 'Linked account' })).toBe('Linked account');
  });
});
