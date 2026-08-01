// Firebase Analytics — native only. getApp()/getAnalytics() throw when there's no
// native Firebase app registered, which is the case in Expo Go. Same
// degrade-gracefully pattern as push.ts.
import Constants from 'expo-constants';
import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  logScreenView as fbLogScreenView,
  logEvent as fbLogEvent,
} from '@react-native-firebase/analytics';

const isExpoGo = Constants.appOwnership === 'expo';

const analytics = (() => {
  if (isExpoGo) return null;
  try { return getAnalytics(getApp()); } catch { return null; }
})();

export function logScreenView(screenName: string): void {
  if (!analytics || !screenName) return;
  try { fbLogScreenView(analytics, { screen_name: screenName, screen_class: screenName }); } catch {}
}

export function logEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (!analytics) return;
  try { fbLogEvent(analytics, name, params); } catch {}
}
