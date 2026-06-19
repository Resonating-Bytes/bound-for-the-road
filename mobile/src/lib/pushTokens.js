import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getSupabase, isSupabaseConfigured } from './supabase';

const STORED_TOKEN_KEY = '@boundfortheroad/pushToken';

async function readStoredPushToken(userId) {
  try {
    const raw = await AsyncStorage.getItem(STORED_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId || !parsed?.token) return null;
    return parsed.token;
  } catch {
    return null;
  }
}

async function writeStoredPushToken(userId, token) {
  await AsyncStorage.setItem(STORED_TOKEN_KEY, JSON.stringify({ userId, token }));
}

async function clearStoredPushToken() {
  await AsyncStorage.removeItem(STORED_TOKEN_KEY);
}

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

async function ensureAndroidApprovalChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('approvals', {
    name: 'Session approvals',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function getDevicePushToken() {
  if (!Device.isDevice) {
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      'Expo push project ID missing. Run `eas init` and add extra.eas.projectId to app.json.',
    );
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  await ensureAndroidApprovalChannel();

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResponse.data ?? null;
}

export async function registerPushToken(userId) {
  if (!isSupabaseConfigured() || !userId) return null;

  const token = await getDevicePushToken();
  if (!token) return null;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const { error } = await getSupabase().rpc('register_push_token', {
    p_token: token,
    p_platform: platform,
  });

  if (error) {
    console.warn('Push token registration failed:', error.message);
    return null;
  }

  await writeStoredPushToken(userId, token);
  return token;
}

export async function unregisterPushToken(userId, token) {
  if (!isSupabaseConfigured() || !userId || !token) return;

  const { error } = await getSupabase()
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) {
    console.warn('Push token removal failed:', error.message);
  }
}

export async function unregisterCurrentDevicePushToken(userId) {
  if (!userId) return;
  try {
    const storedToken = await readStoredPushToken(userId);
    const token = storedToken ?? (await getDevicePushToken());
    if (token) {
      await unregisterPushToken(userId, token);
    }
    await clearStoredPushToken();
  } catch {
    // Best effort on sign-out
  }
}

export { STORED_TOKEN_KEY, getExpoProjectId };
