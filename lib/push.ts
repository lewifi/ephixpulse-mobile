// Push notifications client. Works in an EAS dev/build — NOT in Expo Go
// (remote push was removed from Expo Go in SDK 53+). Degrades gracefully:
// in Expo Go it reports 'unsupported' instead of crashing.
import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPT_KEY = 'pulse_push_optin';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://ephix.net';

// Foreground display behaviour.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushStatus = 'unknown' | 'enabled' | 'denied' | 'unsupported';

const isExpoGo = Constants.appOwnership === 'expo';

export async function getOptIn(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(OPT_KEY)) === '1'; } catch { return false; }
}

export async function currentStatus(): Promise<PushStatus> {
  if (!Device.isDevice || isExpoGo) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return (await getOptIn()) ? 'enabled' : 'unknown';
  if (status === 'denied') return 'denied';
  return 'unknown';
}

// Ask permission, get the Expo push token, register it with the backend.
export async function enablePush(): Promise<PushStatus> {
  if (!Device.isDevice || isExpoGo) return 'unsupported';

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'New in Top 25',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#2196F3',
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await AsyncStorage.setItem(OPT_KEY, '1');
    // Register with the backend so the server can target this device.
    fetch(`${API_BASE}/api/push-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: Platform.OS }),
    }).catch(() => {});
    return 'enabled';
  } catch {
    return 'unsupported';
  }
}

// When permission is permanently denied, the OS won't show the dialog again — send the
// user straight to this app's notification settings instead of the long manual path.
export async function openNotificationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    const pkg = (Constants.expoConfig as any)?.android?.package;
    try {
      await IntentLauncher.startActivityAsync('android.settings.APP_NOTIFICATION_SETTINGS', {
        extra: { 'android.provider.extra.APP_PACKAGE': pkg },
      });
      return;
    } catch {}
  }
  Linking.openSettings().catch(() => {});
}

export async function disablePush(): Promise<void> {
  try { await AsyncStorage.setItem(OPT_KEY, '0'); } catch {}
  // (Optional) also tell the backend to drop the token — add when /api/push-register
  // supports DELETE.
}
