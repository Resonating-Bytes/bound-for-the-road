import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/time';
import { getUserById, upsertUser, deleteAllUserData, isProfileComplete } from '../db/queries';

const AUTH_USER_KEY = '@teendriver/authUserId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback((id) => {
    if (!id) {
      setUser(null);
      return;
    }
    setUser(getUserById(id));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (stored) {
          setUserId(stored);
          try {
            refreshUser(stored);
          } catch (e) {
            console.warn('Failed to load user profile:', e);
          }
        }
      } catch (e) {
        console.warn('AsyncStorage unavailable:', e);
      } finally {
        setReady(true);
      }
    })();
  }, [refreshUser]);

  const mockSignIn = useCallback(async () => {
    const stored = await AsyncStorage.getItem(AUTH_USER_KEY);
    let id = stored;
    if (!id) {
      id = generateId();
      await AsyncStorage.setItem(AUTH_USER_KEY, id);
    }
    setUserId(id);
    refreshUser(id);
    return id;
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setUserId(null);
    setUser(null);
  }, []);

  const saveProfile = useCallback(
    (profile) => {
      const row = upsertUser({ ...profile, id: userId, role: 'teen' });
      setUser(row);
      return row;
    },
    [userId],
  );

  const deleteAllData = useCallback(async () => {
    if (userId) {
      deleteAllUserData(userId);
    }
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setUserId(null);
    setUser(null);
  }, [userId]);

  const value = useMemo(
    () => ({
      userId,
      user,
      ready,
      profileComplete: isProfileComplete(user),
      mockSignIn,
      signOut,
      saveProfile,
      deleteAllData,
      refreshUser: () => refreshUser(userId),
    }),
    [userId, user, ready, mockSignIn, signOut, saveProfile, deleteAllData, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
