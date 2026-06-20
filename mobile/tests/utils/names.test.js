import {
  firstTokenFromLegalName,
  casualLabel,
  clampName,
  MAX_DISPLAY_NAME_LENGTH,
} from '../../src/utils/names';

describe('names', () => {
  test('firstTokenFromLegalName', () => {
    expect(firstTokenFromLegalName('Jane Marie Doe')).toBe('Jane');
    expect(firstTokenFromLegalName('  Alex  ')).toBe('Alex');
    expect(firstTokenFromLegalName('')).toBe('');
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
