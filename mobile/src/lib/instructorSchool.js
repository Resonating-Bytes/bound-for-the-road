import { getSupabase, isSupabaseConfigured } from './supabase';
import { normalizeInviteCode } from './links';
import {
  clearInstructorSchoolCache,
  getInstructorSchoolCache,
  upsertInstructorSchoolCache,
} from '../db/queries';

function mapSchoolRpc(data) {
  const schoolId = data?.school_id;
  const schoolName = data?.school_name?.trim();
  if (!schoolId || !schoolName) return null;
  return {
    schoolId,
    schoolName,
    onboardingLinkId: data.onboarding_link_id,
  };
}

export async function fetchInstructorSchoolFromRemote() {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_instructor_school');
  if (error) throw error;
  return mapSchoolRpc(data);
}

export async function tryAutoAffiliateInstructor() {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('try_auto_affiliate_instructor');
  if (error) throw error;

  const school = mapSchoolRpc(data);
  if (school) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      upsertInstructorSchoolCache(user.id, school);
    }
  }
  return school;
}

export async function affiliateInstructorWithLinkId(linkId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is required to link to a driving school.');
  }

  const normalized = normalizeInviteCode(linkId);
  if (normalized.length !== 6) {
    throw new Error('Enter the 6-digit code from your driving school.');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('affiliate_instructor_with_link_id', {
    p_link_id: normalized,
  });

  if (error) {
    const message = error.message ?? 'Could not link to school.';
    if (message.includes('invalid_link_id')) {
      throw new Error('School code not found. Check the 6-digit code from your school and try again.');
    }
    if (message.includes('already_affiliated')) {
      throw new Error('You are already linked to a driving school.');
    }
    throw new Error(message);
  }

  const school = mapSchoolRpc(data);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id && school) {
    upsertInstructorSchoolCache(user.id, school);
  }
  return school;
}

export async function getInstructorSchool(instructorUserId) {
  if (!instructorUserId) return null;

  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchInstructorSchoolFromRemote();
      if (remote) {
        upsertInstructorSchoolCache(instructorUserId, remote);
        return remote;
      }
      clearInstructorSchoolCache(instructorUserId);
      return null;
    } catch {
      // Fall back to local cache when offline
    }
  }

  const cached = getInstructorSchoolCache(instructorUserId);
  if (!cached) return null;
  return {
    schoolId: cached.schoolId,
    schoolName: cached.schoolName,
  };
}
