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
import { takePendingPasswordRecovery } from '../lib/authCallback';
import {
  signUpWithEmail,
  signInWithEmail,
  resendSignupConfirmation,
  requestPasswordReset,
  completePasswordReset,
} from '../lib/emailAuth';
import { fetchRemoteLinks } from '../lib/links';
import { syncProfileToSupabase, syncProfileToSupabaseAndStamp, fetchRemoteProfile, mergeProfileWithRemote, pullAndApplyRemoteProfile, mapRemoteUser } from '../lib/profileSync';
import { unregisterCurrentDevicePushToken } from '../lib/pushTokens';
import { deleteRemoteAccount } from '../lib/deleteAccount';
import { cancelSessionNotificationsForIds } from '../utils/notifications';
import { firstTokenFromLegalName } from '../utils/names';

const MOCK_USER_KEY = '@boundfortheroad/mockUserId';
const PASSWORD_RECOVERY_KEY = '@boundfortheroad/passwordRecoveryPending';

const AuthContext = createContext(null);

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
  const merged = mergeProfileWithRemote({
    existing,
    remote,
    roleLockedLocally,
    oauthLegalName: oauthLegal,
    oauthDisplayName: oauthDisplay,
    authEmail: authUser.email ?? null,
  });
  return upsertUser({ ...merged, id: authUser.id });
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [linked, setLinked] = useState(false);
  const [roleChosen, setRoleChosenFlag] = useState(false);
  const [ready, setReady] = useState(false);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const isSigningOutRef = useRef(false);
  const isSavingRoleRef = useRef(false);
  const passwordRecoveryActiveRef = useRef(false);

  const enterPasswordRecovery = useCallback(async () => {
    passwordRecoveryActiveRef.current = true;
    setPasswordRecoveryPending(true);
    try {
      await AsyncStorage.setItem(PASSWORD_RECOVERY_KEY, '1');
    } catch (e) {
      console.warn('Failed to persist password recovery flag:', e.message);
    }
  }, []);

  const exitPasswordRecovery = useCallback(async () => {
    passwordRecoveryActiveRef.current = false;
    setPasswordRecoveryPending(false);
    try {
      await AsyncStorage.removeItem(PASSWORD_RECOVERY_KEY);
    } catch (e) {
      console.warn('Failed to clear password recovery flag:', e.message);
    }
  }, []);

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

  const refreshProfileFromRemote = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return refreshUser(userId);
    try {
      const row = await pullAndApplyRemoteProfile(userId, {
        roleLockedLocally: isRoleChosen(userId),
        oauthLegalName: '',
        oauthDisplayName: '',
        authEmail: user?.email ?? null,
      });
      setUser(row);
      return row;
    } catch (e) {
      console.warn('Remote profile refresh failed:', e.message);
      return refreshUser(userId);
    }
  }, [userId, user?.email, refreshUser]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await getSupabase().auth.getSession();
          const recoveryStored = await AsyncStorage.getItem(PASSWORD_RECOVERY_KEY);
          if (mounted && data.session?.user) {
            if (recoveryStored === '1' || takePendingPasswordRecovery()) {
              await enterPasswordRecovery();
            } else {
              await applyAuthUser(data.session.user);
            }
          } else if (mounted && recoveryStored === '1') {
            await exitPasswordRecovery();
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
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (!mounted || isSigningOutRef.current) return;
      if (event === 'PASSWORD_RECOVERY') {
        takePendingPasswordRecovery();
        enterPasswordRecovery();
        return;
      }
      if (session?.user) {
        if (takePendingPasswordRecovery()) {
          enterPasswordRecovery();
          return;
        }
        if (passwordRecoveryActiveRef.current) {
          return;
        }
        applyAuthUser(session.user);
      } else {
        exitPasswordRecovery();
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
  }, [applyAuthUser, enterPasswordRecovery, exitPasswordRecovery, refreshUser]);

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
    await exitPasswordRecovery();
    await applyAuthUser(session.user);
    return session;
  }, [applyAuthUser, exitPasswordRecovery]);

  const signInWithEmailPassword = useCallback(
    async (email, password) => {
      const session = await signInWithEmail(email, password);
      if (!session?.user) return null;
      await exitPasswordRecovery();
      await applyAuthUser(session.user);
      return session;
    },
    [applyAuthUser, exitPasswordRecovery],
  );

  const signUpWithEmailPassword = useCallback(async (email, password) => {
    const result = await signUpWithEmail(email, password);
    if (result.session?.user) {
      await applyAuthUser(result.session.user);
    }
    return result;
  }, [applyAuthUser]);

  const resendSignupConfirmationEmail = useCallback(async (email) => {
    return resendSignupConfirmation(email);
  }, []);

  const requestPasswordResetEmail = useCallback(async (email) => {
    return requestPasswordReset(email);
  }, []);

  const completePasswordRecovery = useCallback(
    async (newPassword) => {
      const authUser = await completePasswordReset(newPassword);
      await exitPasswordRecovery();
      if (authUser) {
        await applyAuthUser(authUser);
      }
      return authUser;
    },
    [applyAuthUser, exitPasswordRecovery],
  );

  const signOut = useCallback(async () => {
    isSigningOutRef.current = true;
    await exitPasswordRecovery();
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
      syncProfileToSupabaseAndStamp(row)
        .then((synced) => {
          if (synced) setUser(synced);
        })
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
        const synced = await syncProfileToSupabaseAndStamp(row);
        setUser(synced ?? row);
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
      passwordRecoveryPending,
      signInWithGoogle,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      resendSignupConfirmation: resendSignupConfirmationEmail,
      requestPasswordResetEmail,
      completePasswordRecovery,
      mockSignIn,
      signOut,
      saveRole,
      saveProfile,
      deleteAllData,
      deleteMyAccount,
      refreshUser: () => refreshUser(userId),
      refreshProfileFromRemote,
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
      passwordRecoveryPending,
      signInWithGoogle,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      resendSignupConfirmationEmail,
      requestPasswordResetEmail,
      completePasswordRecovery,
      mockSignIn,
      signOut,
      saveRole,
      saveProfile,
      deleteAllData,
      deleteMyAccount,
      refreshUser,
      refreshProfileFromRemote,
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
