import { useRef, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/time';
import { getUserById, upsertUser, deleteAllUserData, isProfileComplete } from '../db/queries';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { signInWithGoogleOAuth } from '../lib/googleAuth';

const MOCK_USER_KEY = '@boundfortheroad/mockUserId';

const AuthContext = createContext(null);

function displayNameFromAuthUser(authUser) {
  const meta = authUser.user_metadata ?? {};
  return meta.full_name ?? meta.name ?? meta.legal_name ?? '';
}

function ensureLocalUserFromAuth(authUser) {
  const existing = getUserById(authUser.id);
  if (existing) {
    if (!existing.email && authUser.email) {
      return upsertUser({ ...existing, email: authUser.email });
    }
    return existing;
  }
  return upsertUser({
    id: authUser.id,
    role: 'teen',
    legalName: displayNameFromAuthUser(authUser),
    email: authUser.email ?? null,
  });
}

async function syncProfileToSupabase(profile) {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase()
    .from('users')
    .update({
      legal_name: profile.legalName,
      email: profile.email ?? null,
      date_of_birth: profile.dateOfBirth ?? null,
      state_code: profile.stateCode ?? 'IL',
      permit_issue_date: profile.permitIssueDate ?? null,
      role: profile.role ?? 'teen',
    })
    .eq('id', profile.id);
  if (error) {
    console.warn('Supabase profile sync failed:', error.message);
  }
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const isSigningOutRef = useRef(false);

  const applyAuthUser = useCallback((authUser) => {
    const row = ensureLocalUserFromAuth(authUser);
    setUserId(authUser.id);
    setUser(row);
    return row;
  }, []);

  const refreshUser = useCallback((id) => {
    if (!id) {
      setUser(null);
      return;
    }
    setUser(getUserById(id));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await getSupabase().auth.getSession();
          if (mounted && data.session?.user) {
            applyAuthUser(data.session.user);
          }
        } else {
          const stored = await AsyncStorage.getItem(MOCK_USER_KEY);
          if (mounted && stored) {
            setUserId(stored);
            refreshUser(stored);
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
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyAuthUser, refreshUser]);

  const mockSignIn = useCallback(async () => {
    const stored = await AsyncStorage.getItem(MOCK_USER_KEY);
    let id = stored;
    if (!id) {
      id = generateId();
      await AsyncStorage.setItem(MOCK_USER_KEY, id);
    }
    setUserId(id);
    refreshUser(id);
    return id;
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async () => {
    const session = await signInWithGoogleOAuth();
    if (!session?.user) return null;
    applyAuthUser(session.user);
    return session;
  }, [applyAuthUser]);

  const signOut = useCallback(async () => {
    isSigningOutRef.current = true;
    try {
      if (isSupabaseConfigured()) {
        const { error } = await getSupabase().auth.signOut();
        if (error) console.warn('Sign out failed:', error.message);
      } else {
        await AsyncStorage.removeItem(MOCK_USER_KEY);
      }
    } catch (e) {
      console.warn('Sign out failed:', e.message);
    } finally {
      setUserId(null);
      setUser(null);
      isSigningOutRef.current = false;
    }
  }, []);

  const saveProfile = useCallback(
    (profile) => {
      const row = upsertUser({ ...profile, id: userId, role: profile.role ?? 'teen' });
      setUser(row);
      syncProfileToSupabase(row);
      return row;
    },
    [userId],
  );

  const deleteAllData = useCallback(async () => {
    isSigningOutRef.current = true;
    try {
      if (userId) {
        deleteAllUserData(userId);
      }
      if (isSupabaseConfigured()) {
        const { error } = await getSupabase().auth.signOut();
        if (error) console.warn('Sign out failed:', error.message);
      } else {
        await AsyncStorage.removeItem(MOCK_USER_KEY);
      }
    } catch (e) {
      console.warn('Delete all data failed:', e.message);
    } finally {
      setUserId(null);
      setUser(null);
      isSigningOutRef.current = false;
    }
  }, [userId]);

  const value = useMemo(
    () => ({
      userId,
      user,
      ready,
      profileComplete: isProfileComplete(user),
      supabaseAuth: isSupabaseConfigured(),
      signInWithGoogle,
      mockSignIn,
      signOut,
      saveProfile,
      deleteAllData,
      refreshUser: () => refreshUser(userId),
    }),
    [
      userId,
      user,
      ready,
      signInWithGoogle,
      mockSignIn,
      signOut,
      saveProfile,
      deleteAllData,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
