import AsyncStorage from '@react-native-async-storage/async-storage';

// Generic TTL cache (replaces the website's localStorage caches for YouTube/Wikipedia).
export async function cacheGet<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > ttlMs) return null;
    return v as T;
  } catch {
    return null;
  }
}

export async function cacheGetStale<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).v as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* ignore quota / serialisation errors */
  }
}

// ---- Watchlist ("My List"), device-local ----
const WATCHLIST_KEY = 'pulse_watchlist_v1';

export type WatchEntry = {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path?: string | null;
  _pulseScore?: number;
};

export async function getWatchlist(): Promise<WatchEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
    return raw ? (JSON.parse(raw) as WatchEntry[]) : [];
  } catch {
    return [];
  }
}

export async function setWatchlist(list: WatchEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
