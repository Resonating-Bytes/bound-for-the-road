import { useRef, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/time';
import {
  getUserById,
  upsertUser,
  deleteAllUserData,
  listSessionIdsForTeen,
  isProfileCompleteForRole,
  isProfileComplete,
  isRoleChosen,
  setRoleChosen,
  hasActiveLink,
  setLinkInviteDeferred,
  maybeMarkRoleChosenFromRemote,
} from '../db/queries';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { signInWithGoogleOAuth } from '../lib/googleAuth';
import { fetchRemoteLinks } from '../lib/links';
import { syncProfileToSupabase } from '../lib/profileSync';
import { unregisterCurrentDevicePushToken } from '../lib/pushTokens';
import { deleteRemoteAccount } from '../lib/deleteAccount';
import { cancelSessionNotificationsForIds } from '../utils/notifications';
import { firstTokenFromLegalName } from '../utils/names';

const MOCK_USER_KEY = '@boundfortheroad/mockUserId';

const AuthContext = createContext(null);

function mapRemoteUser(row) {
  if (!row) return null;
  const legalName = row.legal_name ?? '';
  return {
    id: row.id,
    role: row.role ?? 'teen',
    legalName,
    displayName: row.display_name?.trim() || firstTokenFromLegalName(legalName),
    email: row.email ?? null,
    dateOfBirth: row.date_of_birth ?? null,
    stateCode: row.state_code ?? 'IL',
    permitIssueDate: row.permit_issue_date ?? null,
  };
}

function oauthLegalName(authUser) {
  const meta = authUser.user_metadata ?? {};
  return meta.full_name ?? meta.name ?? meta.legal_name ?? '';
}

function ensureLocalUserFromAuth(authUser, remoteProfile) {
  const existing = getUserById(authUser.id);
  const remote = mapRemoteUser(remoteProfile);
  const roleLockedLocally = existing?.id && isRoleChosen(existing.id);
  const oauthLegal = oauthLegalName(authUser);
  const oauthDisplay = firstTokenFromLegalName(oauthLegal);
  if (existing) {
    const merged = {
      ...existing,
      role: roleLockedLocally ? existing.role : (remote?.role ?? existing.role),
      legalName: existing.legalName || remote?.legalName || oauthLegal,
      displayName: existing.displayName || remote?.displayName || oauthDisplay,
      email: existing.email || authUser.email || remote?.email || null,
      dateOfBirth: existing.dateOfBirth ?? remote?.dateOfBirth ?? null,
      stateCode: existing.stateCode ?? remote?.stateCode ?? 'IL',
      permitIssueDate: existing.permitIssueDate ?? remote?.permitIssueDate ?? null,
    };
    return upsertUser(merged);
  }

  return upsertUser({
    id: authUser.id,
    role: remote?.role ?? 'teen',
    legalName: remote?.legalName || oauthLegal,
    displayName: remote?.displayName || oauthDisplay,
    email: authUser.email ?? remote?.email ?? null,
    dateOfBirth: remote?.dateOfBirth ?? null,
    stateCode: remote?.stateCode ?? 'IL',
    permitIssueDate: remote?.permitIssueDate ?? null,
  });
}

async function fetchRemoteProfile(userId) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from('users')
    .select('id, role, legal_name, display_name, email, date_of_birth, state_code, permit_issue_date')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [linked, setLinked] = useState(false);
  const [roleChosen, setRoleChosenFlag] = useState(false);
  const [ready, setReady] = useState(false);
  const isSigningOutRef = useRef(false);
  const isSavingRoleRef = useRef(false);

  const syncRoleChosenFromDb = useCallback((id) => {
    if (!id) {
      setRoleChosenFlag(false);
      return false;
    }
    const chosen = isRoleChosen(id);
    setRoleChosenFlag((was) => was || chosen);
    return chosen;
  }, []);

  const refreshLinks = useCallback(async (id) => {
    if (!id || !isSupabaseConfigured()) {
      setLinked(hasActiveLink(id));
      return hasActiveLink(id);
    }
    try {
      const rows = await fetchRemoteLinks(id);
      const isLinked = rows.length > 0;
      if (isLinked) {
        setLinkInviteDeferred(id, false);
      }
      setLinked(isLinked);
      return isLinked;
    } catch (e) {
      console.warn('Failed to refresh links:', e.message);
      const local = hasActiveLink(id);
      setLinked(local);
      return local;
    }
  }, []);

  const applyAuthUser = useCallback(
    async (authUser) => {
      if (isSavingRoleRef.current) {
        return getUserById(authUser.id);
      }

      const hadLocalProfile = Boolean(getUserById(authUser.id));
      const remoteProfile = await fetchRemoteProfile(authUser.id);
      const row = ensureLocalUserFromAuth(authUser, remoteProfile);
      if (hadLocalProfile && row.role === 'teen' && isProfileComplete(row)) {
        setRoleChosen(authUser.id);
      } else {
        maybeMarkRoleChosenFromRemote(authUser.id, remoteProfile);
      }
      setUserId(authUser.id);
      setUser(row);
      syncRoleChosenFromDb(authUser.id);
      await refreshLinks(authUser.id);
      return row;
    },
    [refreshLinks, syncRoleChosenFromDb],
  );

  const refreshUser = useCallback((id) => {
    if (!id) {
      setUser(null);
      return null;
    }
    const row = getUserById(id);
    setUser(row);
    return row;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await getSupabase().auth.getSession();
          if (mounted && data.session?.user) {
            await applyAuthUser(data.session.user);
          }
        } else {
          const stored = await AsyncStorage.getItem(MOCK_USER_KEY);
          if (mounted && stored) {
            setUserId(stored);
            refreshUser(stored);
            setLinked(hasActiveLink(stored));
          }
        }
      } catch (e) {
        console.warn('Auth init failed:', e);
      } finally {
        if (mounted) setReady(true);
      }
    }

    init();

    if (!isSupabaseConfigured()) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (!mounted || isSigningOutRef.current) return;
      if (session?.user) {
        applyAuthUser(session.user);
      } else {
        setUserId(null);
        setUser(null);
        setLinked(false);
        setRoleChosenFlag(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyAuthUser, refreshUser]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || linked) return undefined;
    const timer = setInterval(() => {
      refreshLinks(userId);
    }, 3000);
    return () => clearInterval(timer);
  }, [userId, linked, refreshLinks]);

  const mockSignIn = useCallback(async () => {
    const stored = await AsyncStorage.getItem(MOCK_USER_KEY);
    let id = stored;
    if (!id) {
      id = generateId();
      await AsyncStorage.setItem(MOCK_USER_KEY, id);
    }
    setUserId(id);
    refreshUser(id);
    syncRoleChosenFromDb(id);
    setLinked(hasActiveLink(id));
    return id;
  }, [refreshUser, syncRoleChosenFromDb]);

  const signInWithGoogle = useCallback(async () => {
    const session = await signInWithGoogleOAuth();
    if (!session?.user) return null;
    await applyAuthUser(session.user);
    return session;
  }, [applyAuthUser]);

  const signOut = useCallback(async () => {
    isSigningOutRef.current = true;
    const signingOutUserId = userId;
    setUserId(null);
    setUser(null);
    setLinked(false);
    setRoleChosenFlag(false);
    try {
      if (signingOutUserId) {
        await unregisterCurrentDevicePushToken(signingOutUserId);
      }
      if (isSupabaseConfigured()) {
        const { error } = await getSupabase().auth.signOut({ scope: 'local' });
        if (error) console.warn('Sign out failed:', error.message);
        const { data } = await getSupabase().auth.getSession();
        if (data.session) {
          await getSupabase().auth.signOut({ scope: 'global' });
        }
      } else {
        await AsyncStorage.removeItem(MOCK_USER_KEY);
      }
    } catch (e) {
      console.warn('Sign out failed:', e.message);
    } finally {
      const { data } = isSupabaseConfigured()
        ? await getSupabase().auth.getSession()
        : { data: { session: null } };
      if (!data.session) {
        isSigningOutRef.current = false;
      } else {
        setTimeout(() => {
          isSigningOutRef.current = false;
        }, 500);
      }
    }
  }, []);

  const saveRole = useCallback(
    (role) => {
      isSavingRoleRef.current = true;
      const row = upsertUser({
        ...getUserById(userId),
        id: userId,
        role,
        legalName: getUserById(userId)?.legalName ?? '',
        displayName: getUserById(userId)?.displayName ?? '',
        email: getUserById(userId)?.email ?? null,
        dateOfBirth: getUserById(userId)?.dateOfBirth ?? null,
        stateCode: getUserById(userId)?.stateCode ?? 'IL',
        permitIssueDate: getUserById(userId)?.permitIssueDate ?? null,
      });
      setRoleChosen(userId);
      setRoleChosenFlag(true);
      setUser(row);
      syncProfileToSupabase(row)
        .catch((e) => {
          console.warn('Supabase role sync failed:', e.message);
        })
        .finally(() => {
          isSavingRoleRef.current = false;
        });
      return Promise.resolve(row);
    },
    [userId],
  );

  const saveProfile = useCallback(
    async (profile) => {
      const row = upsertUser({ ...profile, id: userId, role: profile.role ?? user?.role ?? 'teen' });
      setUser(row);
      try {
        await syncProfileToSupabase(row);
      } catch (e) {
        console.warn('Supabase profile sync failed:', e.message);
      }
      return row;
    },
    [userId, user?.role],
  );

  const deleteAllData = useCallback(async () => {
    isSigningOutRef.current = true;
    const deletingUserId = userId;
    setUserId(null);
    setUser(null);
    setLinked(false);
    setRoleChosenFlag(false);
    try {
      if (deletingUserId) {
        await unregisterCurrentDevicePushToken(deletingUserId);
        const sessionIds = listSessionIdsForTeen(deletingUserId);
        await cancelSessionNotificationsForIds(sessionIds);
        deleteAllUserData(deletingUserId);
      }
      if (isSupabaseConfigured()) {
        const { error } = await getSupabase().auth.signOut({ scope: 'local' });
        if (error) console.warn('Sign out failed:', error.message);
        const { data } = await getSupabase().auth.getSession();
        if (data.session) {
          await getSupabase().auth.signOut({ scope: 'global' });
        }
      } else {
        await AsyncStorage.removeItem(MOCK_USER_KEY);
      }
    } catch (e) {
      console.warn('Delete all data failed:', e.message);
    } finally {
      const { data } = isSupabaseConfigured()
        ? await getSupabase().auth.getSession()
        : { data: { session: null } };
      if (!data.session) {
        isSigningOutRef.current = false;
      } else {
        setTimeout(() => {
          isSigningOutRef.current = false;
        }, 500);
      }
    }
  }, [userId]);

  const deleteMyAccount = useCallback(async () => {
    isSigningOutRef.current = true;
    const deletingUserId = userId;
    setUserId(null);
    setUser(null);
    setLinked(false);
    setRoleChosenFlag(false);
    try {
      if (deletingUserId) {
        await unregisterCurrentDevicePushToken(deletingUserId);
      }
      if (isSupabaseConfigured()) {
        await deleteRemoteAccount();
      }
      if (deletingUserId) {
        const sessionIds = listSessionIdsForTeen(deletingUserId);
        await cancelSessionNotificationsForIds(sessionIds);
        deleteAllUserData(deletingUserId);
      }
      if (isSupabaseConfigured()) {
        const { error } = await getSupabase().auth.signOut({ scope: 'local' });
        if (error) console.warn('Sign out after account delete failed:', error.message);
      } else {
        await AsyncStorage.removeItem(MOCK_USER_KEY);
      }
    } catch (e) {
      console.warn('Delete account failed:', e.message);
      throw e;
    } finally {
      const { data } = isSupabaseConfigured()
        ? await getSupabase().auth.getSession()
        : { data: { session: null } };
      if (!data.session) {
        isSigningOutRef.current = false;
      } else {
        setTimeout(() => {
          isSigningOutRef.current = false;
        }, 500);
      }
    }
  }, [userId]);

  const profileComplete = isProfileCompleteForRole(user);
  const requiresLink = isSupabaseConfigured();
  const onboardingComplete = profileComplete && (!requiresLink || linked);

  const value = useMemo(
    () => ({
      userId,
      user,
      ready,
      linked,
      roleChosen,
      profileComplete,
      onboardingComplete,
      requiresLink,
      supabaseAuth: isSupabaseConfigured(),
      signInWithGoogle,
      mockSignIn,
      signOut,
      saveRole,
      saveProfile,
      deleteAllData,
      deleteMyAccount,
      refreshUser: () => refreshUser(userId),
      refreshLinks: () => refreshLinks(userId),
    }),
    [
      userId,
      user,
      ready,
      linked,
      roleChosen,
      profileComplete,
      onboardingComplete,
      requiresLink,
      signInWithGoogle,
      mockSignIn,
      signOut,
      saveRole,
      saveProfile,
      deleteAllData,
      deleteMyAccount,
      refreshUser,
      refreshLinks,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
