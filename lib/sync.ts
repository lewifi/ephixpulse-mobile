import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { WatchEntry, getWatchlist, setWatchlist } from './storage';

const SYNC_CODE_KEY = 'pulse_sync_code';
const SYNC_UPDATED_KEY = 'pulse_sync_updated_at';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://ephix.net';

export type SyncState = {
  code: string | null;
  updatedAt: string | null;
};

export async function getSyncState(): Promise<SyncState> {
  try {
    const code = await AsyncStorage.getItem(SYNC_CODE_KEY);
    const updatedAt = await AsyncStorage.getItem(SYNC_UPDATED_KEY);
    return { code: code || null, updatedAt: updatedAt || null };
  } catch {
    return { code: null, updatedAt: null };
  }
}

export async function setSyncState(code: string | null, updatedAt: string | null): Promise<void> {
  try {
    if (code) {
      await AsyncStorage.setItem(SYNC_CODE_KEY, code.toUpperCase());
    } else {
      await AsyncStorage.removeItem(SYNC_CODE_KEY);
    }
    if (updatedAt) {
      await AsyncStorage.setItem(SYNC_UPDATED_KEY, updatedAt);
    } else {
      await AsyncStorage.removeItem(SYNC_UPDATED_KEY);
    }
  } catch {}
}

// Union merge by `${type}_${id}` so items are never lost on link
export function mergeWatchlists(local: WatchEntry[], remote: WatchEntry[]): WatchEntry[] {
  const map = new Map<string, WatchEntry>();
  for (const item of local) {
    const key = `${item.type}_${item.id}`;
    map.set(key, item);
  }
  for (const item of remote) {
    const key = `${item.type}_${item.id}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

async function getDeviceToken(): Promise<string | undefined> {
  try {
    const res = await Notifications.getDevicePushTokenAsync();
    return res.data as string;
  } catch {
    return undefined;
  }
}

async function safeFetchJson(url: string, options: RequestInit): Promise<{ ok: boolean; status: number; json: any }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, json };
  } catch (e: any) {
    throw new Error(e?.message || 'Network error');
  }
}

// 1. Create a brand new sync code
export async function createSyncCode(currentItems: WatchEntry[]): Promise<string> {
  const deviceToken = await getDeviceToken();
  const { ok, status, json } = await safeFetchJson(`${API_BASE}/api/sync/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: currentItems, deviceToken }),
  });

  if (status === 404) {
    throw new Error('Sync server endpoint not deployed yet. Please deploy the server backend.');
  }

  if (!ok || !json.ok || !json.code) {
    throw new Error(json.error || `Server error (${status})`);
  }

  await setSyncState(json.code, json.updated_at);
  return json.code;
}

// 2. Pull server list
export async function pullSyncItems(code: string): Promise<{ items: WatchEntry[]; updatedAt: string }> {
  const { ok, status, json } = await safeFetchJson(`${API_BASE}/api/sync/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (status === 404) {
    await setSyncState(null, null);
    throw new Error('Code not found. Sync link has been cleared.');
  }

  if (!ok || !json.ok) {
    throw new Error(json.error || `Server error (${status})`);
  }

  const items = (json.items || []) as WatchEntry[];
  const updatedAt = json.updated_at as string;

  await setWatchlist(items);
  await setSyncState(code, updatedAt);
  return { items, updatedAt };
}

// 3. Push local list to server
export async function pushSyncItems(
  code: string,
  items: WatchEntry[],
  baseUpdatedAt?: string | null
): Promise<string> {
  const { ok, status, json } = await safeFetchJson(`${API_BASE}/api/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, items, baseUpdatedAt }),
  });

  if (status === 409 && json.conflict) {
    const serverItems = (json.serverItems || []) as WatchEntry[];
    const merged = mergeWatchlists(items, serverItems);
    await setWatchlist(merged);
    return pushSyncItems(code, merged, json.serverUpdatedAt);
  }

  if (!ok || !json.ok) {
    throw new Error(json.error || `Server error (${status})`);
  }

  const newUpdatedAt = json.updated_at as string;
  await setSyncState(code, newUpdatedAt);
  return newUpdatedAt;
}

// 4. Request to join an existing sync code
export async function joinSyncCode(
  targetCode: string,
  localItems: WatchEntry[]
): Promise<{ status: 'approved' | 'pending'; items?: WatchEntry[]; joinId?: string }> {
  const code = targetCode.trim().toUpperCase();
  const deviceToken = await getDeviceToken();

  const { ok, status, json } = await safeFetchJson(`${API_BASE}/api/sync/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceToken }),
  });

  if (status === 404) {
    throw new Error('Sync server endpoint not deployed yet. Please deploy the server backend.');
  }

  if (!ok) {
    throw new Error(json.error || `Server error (${status})`);
  }

  if (json.status === 'approved') {
    const remoteItems = (json.items || []) as WatchEntry[];
    const merged = mergeWatchlists(localItems, remoteItems);
    await setWatchlist(merged);
    const newUpdatedAt = await pushSyncItems(code, merged, json.updated_at);
    await setSyncState(code, newUpdatedAt);
    return { status: 'approved', items: merged };
  }

  return { status: 'pending', joinId: json.joinId };
}

// 5. Approve or deny a join request
export async function respondToJoinRequest(
  code: string,
  joinId: string,
  decision: 'approved' | 'denied'
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sync/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, joinId, decision }),
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Failed to process approval');
  }
}
