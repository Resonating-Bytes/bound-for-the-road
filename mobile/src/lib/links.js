import * as ExpoCrypto from 'expo-crypto';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { upsertLink, getActiveLinksForUser, deleteLink } from '../db/queries';
import { ensureRemoteUserProfile } from './profileSync';
import { getLocalNickname, pullUserAliasesFromRemote, syncPendingUserAliases } from './userAliases';
import { casualLabel, firstTokenFromLegalName } from '../utils/names';

function randomSixDigitCode() {
  const bytes = ExpoCrypto.getRandomBytes(4);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(100000 + (num % 900000));
}

export function formatInviteCode(code) {
  const digits = String(code ?? '').replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function normalizeInviteCode(input) {
  return String(input ?? '').replace(/\D/g, '');
}

function mapRemoteLink(row) {
  return {
    id: row.id,
    teenUserId: row.teen_user_id,
    adultUserId: row.adult_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function syncLinksToLocal(remoteLinks) {
  return remoteLinks.map((row) => upsertLink(mapRemoteLink(row)));
}

export async function fetchRemoteLinks(userId) {
  if (!isSupabaseConfigured()) return getActiveLinksForUser(userId);

  await syncPendingUserAliases(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('links')
    .select('id, teen_user_id, adult_user_id, status, created_at')
    .eq('status', 'active')
    .or(`teen_user_id.eq.${userId},adult_user_id.eq.${userId}`);

  if (error) throw error;

  const remoteRows = data ?? [];
  const remoteIds = new Set(remoteRows.map((row) => row.id));
  syncLinksToLocal(remoteRows);

  for (const link of getActiveLinksForUser(userId)) {
    if (!remoteIds.has(link.id)) {
      deleteLink(link.id);
    }
  }

  return getActiveLinksForUser(userId);
}

export async function createLinkInvite(teenUserId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is required to create invite codes.');
  }

  await ensureRemoteUserProfile(teenUserId);

  const code = randomSixDigitCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('link_invites')
    .insert({
      teen_user_id: teenUserId,
      code,
      expires_at: expiresAt,
    })
    .select('code, expires_at')
    .single();

  if (error) {
    if (error.message?.includes('link_invites_teen_user_id_fkey')) {
      throw new Error('Profile not synced to the server yet. Open Settings, save your profile, and try again.');
    }
    throw error;
  }
  return data;
}

export async function acceptLinkInvite(code) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is required to accept invite codes.');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('accept_link_invite', {
    p_code: normalizeInviteCode(code),
  });

  if (error) {
    const message = error.message ?? 'Could not accept invite code.';
    if (message.includes('accept_link_invite') || message.includes('schema cache')) {
      throw new Error(
        'Linking is not set up on the server yet. In Supabase SQL Editor, run supabase/migrations/20260619120000_link_invite_rpc.sql',
      );
    }
    if (message.includes('invalid_or_expired_code')) {
      throw new Error('Invalid or expired code. Ask the driver to share a new one.');
    }
    if (message.includes('adult_role_required')) {
      throw new Error('Only supervising adult accounts can accept invite codes.');
    }
    throw new Error(message);
  }

  const link = mapRemoteLink(data);
  upsertLink(link);
  return link;
}

export async function fetchLinkedPartners(userId) {
  await syncPendingUserAliases(userId);
  if (isSupabaseConfigured()) {
    try {
      await pullUserAliasesFromRemote(userId);
    } catch {
      // Use local alias cache when offline
    }
  }

  const activeLinks = getActiveLinksForUser(userId);
  if (!activeLinks.length) return [];

  if (!isSupabaseConfigured()) {
    return activeLinks.map((link) => ({
      linkId: link.id,
      partnerId: link.teenUserId === userId ? link.adultUserId : link.teenUserId,
      legalName: 'Linked account',
      displayName: 'Linked account',
      nickname: null,
      name: 'Linked account',
    }));
  }

  const supabase = getSupabase();
  const partners = [];
  for (const link of activeLinks) {
    const partnerId = link.teenUserId === userId ? link.adultUserId : link.teenUserId;
    const { data, error } = await supabase
      .from('users')
      .select('legal_name, display_name')
      .eq('id', partnerId)
      .maybeSingle();

    const legalName = !error && data?.legal_name?.trim() ? data.legal_name.trim() : 'Linked account';
    const displayName =
      !error && data?.display_name?.trim()
        ? data.display_name.trim()
        : firstTokenFromLegalName(legalName);
    const nickname = getLocalNickname(userId, partnerId);
    const name = casualLabel({ nickname, displayName, fallback: 'Linked account' });

    partners.push({
      linkId: link.id,
      partnerId,
      legalName,
      displayName,
      nickname,
      name,
    });
  }
  return partners;
}

export async function fetchLinkedPartnerNames(userId) {
  const partners = await fetchLinkedPartners(userId);
  return partners.map((p) => p.name);
}

export async function removeLink(linkId) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { error } = await supabase.from('links').delete().eq('id', linkId);
    if (error) throw error;
  }
  deleteLink(linkId);
}
