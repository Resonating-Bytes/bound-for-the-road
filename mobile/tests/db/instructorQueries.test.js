jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

import {
  isInstructorProfileComplete,
  isInstructorSchoolOnboardingDone,
  setInstructorSchoolOnboardingDone,
  upsertUser,
} from '../../src/db/queries';
import { initTestDb, resetTestDb } from '../helpers/testDb';

describe('instructor profile queries', () => {
  beforeEach(() => {
    resetTestDb();
    initTestDb();
  });

  test('instructor profile requires name and school onboarding step', () => {
    const user = upsertUser({
      id: 'inst-1',
      role: 'instructor',
      legalName: 'Pat Instructor',
      displayName: 'Pat',
    });
    expect(isInstructorProfileComplete(user)).toBe(false);
    setInstructorSchoolOnboardingDone('inst-1', true);
    expect(isInstructorProfileComplete({ ...user, id: 'inst-1' })).toBe(true);
    expect(isInstructorSchoolOnboardingDone('inst-1')).toBe(true);
  });
});
