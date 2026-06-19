import {
  getFirstName,
  getLastInitial,
  shortDisplayNames,
  shortDisplayNamesForTeens,
  shortDisplayNameForTeen,
} from '../../src/utils/displayName';

describe('displayName', () => {
  test('getFirstName uses first token', () => {
    expect(getFirstName('Jane Marie Doe')).toBe('Jane');
    expect(getFirstName('  Alex  ')).toBe('Alex');
    expect(getFirstName('')).toBe('Driver');
  });

  test('getLastInitial uses last token', () => {
    expect(getLastInitial('Jane Doe')).toBe('D');
    expect(getLastInitial('Alex')).toBe('');
  });

  test('shortDisplayNames uses first name when unique', () => {
    expect(shortDisplayNames(['Jane Doe', 'Alex Smith'])).toEqual(['Jane', 'Alex']);
  });

  test('shortDisplayNames disambiguates duplicate first names', () => {
    expect(shortDisplayNames(['Eric Miller', 'Eric Smith', 'Sam Jones'])).toEqual([
      'Eric M.',
      'Eric S.',
      'Sam',
    ]);
  });

  test('shortDisplayNamesForTeens uses first name when unique', () => {
    const teens = [
      { teenUserId: 'a', name: 'Jane Doe' },
      { teenUserId: 'b', name: 'Alex Smith' },
    ];
    expect(shortDisplayNamesForTeens(teens)).toEqual(['Jane', 'Alex']);
  });

  test('shortDisplayNamesForTeens disambiguates duplicate first names', () => {
    const teens = [
      { teenUserId: 'a', name: 'Eric Miller' },
      { teenUserId: 'b', name: 'Eric Smith' },
      { teenUserId: 'c', name: 'Sam Jones' },
    ];
    expect(shortDisplayNamesForTeens(teens)).toEqual(['Eric M.', 'Eric S.', 'Sam']);
  });

  test('shortDisplayNameForTeen matches switcher label', () => {
    const teens = [
      { teenUserId: 'a', name: 'Eric Miller' },
      { teenUserId: 'b', name: 'Eric Smith' },
    ];
    expect(shortDisplayNameForTeen(teens, 'b')).toBe('Eric S.');
    expect(shortDisplayNameForTeen(teens, 'missing')).toBe('Driver');
  });
});
