import {
  listLinkedAdultIdsForTeen,
  resolveSessionSubmitPushRecipients,
} from '../../src/lib/proximityPush';

jest.mock('../../src/db/queries', () => ({
  getActiveLinksForUser: jest.fn(),
}));

import { getActiveLinksForUser } from '../../src/db/queries';

describe('proximityPush', () => {
  beforeEach(() => {
    getActiveLinksForUser.mockReset();
  });

  test('listLinkedAdultIdsForTeen returns adult ids for teen links', () => {
    getActiveLinksForUser.mockReturnValue([
      { teenUserId: 'teen-1', adultUserId: 'adult-a', status: 'active' },
      { teenUserId: 'teen-1', adultUserId: 'adult-b', status: 'active' },
      { teenUserId: 'teen-2', adultUserId: 'teen-1', status: 'active' },
    ]);

    expect(listLinkedAdultIdsForTeen('teen-1')).toEqual(['adult-a', 'adult-b']);
  });

  describe('resolveSessionSubmitPushRecipients', () => {
    const linked = ['adult-a', 'adult-b', 'adult-c'];

    test('uses nearby adults when any qualify', () => {
      expect(
        resolveSessionSubmitPushRecipients({
          linkedAdultIds: linked,
          nearbyAdultIds: ['adult-c', 'adult-c'],
        }),
      ).toEqual(['adult-c']);
    });

    test('ignores nearby ids that are not linked', () => {
      expect(
        resolveSessionSubmitPushRecipients({
          linkedAdultIds: linked,
          nearbyAdultIds: ['stranger'],
        }),
      ).toEqual(linked);
    });

    test('falls back to all linked adults when nearby is empty', () => {
      expect(
        resolveSessionSubmitPushRecipients({
          linkedAdultIds: linked,
          nearbyAdultIds: [],
        }),
      ).toEqual(linked);
    });

    test('falls back to all linked adults when nearby omitted', () => {
      expect(
        resolveSessionSubmitPushRecipients({
          linkedAdultIds: linked,
        }),
      ).toEqual(linked);
    });
  });
});
