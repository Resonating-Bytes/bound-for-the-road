import {
  deleteUserAliasLocal,
  getUserAlias,
  listPendingUserAliasSync,
  listUserAliasesForOwner,
  markUserAliasSynced,
  upsertUserAliasLocal,
} from '../db/queries';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { clampName, MAX_NICKNAME_LENGTH } from '../utils/names';

export async function pullUserAliasesFromRemote(ownerUserId) {
  if (!isSupabaseConfigured() || !ownerUserId) return;

  const { data, error } = await getSupabase()
    .from('user_aliases')
    .select('target_user_id, nickname')
    .eq('owner_user_id', ownerUserId);

  if (error) throw error;

  const remoteTargets = new Set();
  for (const row of data ?? []) {
    remoteTargets.add(row.target_user_id);
    const pending = getUserAlias(ownerUserId, row.target_user_id);
    if (pending?.syncStatus !== 'synced') continue;
    upsertUserAliasLocal(ownerUserId, row.target_user_id, row.nickname, 'synced');
  }

  for (const local of listUserAliasesForOwner(ownerUserId)) {
    if (local.syncStatus !== 'synced') continue;
    if (!remoteTargets.has(local.targetUserId)) {
      deleteUserAliasLocal(ownerUserId, local.targetUserId);
    }
  }
}

export async function saveUserNickname(ownerUserId, targetUserId, nickname) {
  const trimmed = clampName(nickname, MAX_NICKNAME_LENGTH);
  if (!trimmed) {
    throw new Error('Nickname cannot be empty.');
  }

  upsertUserAliasLocal(ownerUserId, targetUserId, trimmed, 'pending_upsert');

  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await getSupabase().rpc('upsert_user_alias', {
    p_target_user_id: targetUserId,
    p_nickname: trimmed,
  });
  if (error) throw error;
  markUserAliasSynced(ownerUserId, targetUserId);
}

export async function removeUserNickname(ownerUserId, targetUserId) {
  const existing = getUserAlias(ownerUserId, targetUserId);
  const tombstoneNickname = existing?.nickname ?? 'removed';
  upsertUserAliasLocal(ownerUserId, targetUserId, tombstoneNickname, 'pending_delete');

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await getSupabase().rpc('delete_user_alias', {
      p_target_user_id: targetUserId,
    });
    if (error) throw error;
    deleteUserAliasLocal(ownerUserId, targetUserId);
  } catch (e) {
    throw e;
  }
}

export async function syncPendingUserAliases(ownerUserId) {
  if (!isSupabaseConfigured() || !ownerUserId) return;

  await pullUserAliasesFromRemote(ownerUserId);

  const pending = listPendingUserAliasSync(ownerUserId);
  for (const row of pending) {
    try {
      if (row.syncStatus === 'pending_delete') {
        const { error } = await getSupabase().rpc('delete_user_alias', {
          p_target_user_id: row.targetUserId,
        });
        if (error) throw error;
        deleteUserAliasLocal(ownerUserId, row.targetUserId);
      } else if (row.syncStatus === 'pending_upsert') {
        const { error } = await getSupabase().rpc('upsert_user_alias', {
          p_target_user_id: row.targetUserId,
          p_nickname: row.nickname,
        });
        if (error) throw error;
        markUserAliasSynced(ownerUserId, row.targetUserId);
      }
    } catch {
      // Retry on next sync
    }
  }
}

export function getLocalNickname(ownerUserId, targetUserId) {
  const row = getUserAlias(ownerUserId, targetUserId);
  if (!row || row.syncStatus === 'pending_delete') return null;
  return row.nickname?.trim() || null;
}
