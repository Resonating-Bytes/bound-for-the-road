import {
  getFirstName,
  shortDisplayNamesForTeens,
  shortDisplayNameForTeen,
} from '../../src/utils/displayName';
import { casualLabel } from '../../src/utils/names';

describe('displayName', () => {
  test('getFirstName uses first token', () => {
    expect(getFirstName('Jane Marie Doe')).toBe('Jane');
    expect(getFirstName('  Alex  ')).toBe('Alex');
    expect(getFirstName('')).toBe('Driver');
  });

  test('shortDisplayNamesForTeens prefers nickname then display name', () => {
    const teens = [
      { teenUserId: 'a', name: 'Jane', displayName: 'Jane', nickname: 'J' },
      { teenUserId: 'b', name: 'Alex', displayName: 'Alex' },
    ];
    expect(shortDisplayNamesForTeens(teens)).toEqual(['J', 'Alex']);
  });

  test('shortDisplayNameForTeen matches switcher label', () => {
    const teens = [
      { teenUserId: 'a', name: 'Eric', displayName: 'Eric' },
      { teenUserId: 'b', name: 'Sam', displayName: 'Sam', nickname: 'Samantha' },
    ];
    expect(shortDisplayNameForTeen(teens, 'b')).toBe('Samantha');
    expect(shortDisplayNameForTeen(teens, 'missing')).toBe('Driver');
  });
});

describe('names casualLabel', () => {
  test('uses nickname, then display name, then fallback', () => {
    expect(casualLabel({ nickname: 'Mom', displayName: 'Jane', fallback: 'X' })).toBe('Mom');
    expect(casualLabel({ displayName: 'Jane', fallback: 'X' })).toBe('Jane');
    expect(casualLabel({ fallback: 'X' })).toBe('X');
  });
});
