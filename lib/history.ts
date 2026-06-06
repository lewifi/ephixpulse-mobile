// Read-only Supabase REST query for a title's 7-day Pulse history (the sparkline).
// Uses the public anon key — same as the website. This is a READ; it never writes,
// so it can't pollute the snapshot history the website maintains.

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type HistoryPoint = { captured_at: string; rank: number; pulse_score: number };

export function historyEnabled() {
  return !!(URL && KEY);
}

export async function fetchHistory(tmdbId: number | string, mediaType: string): Promise<HistoryPoint[]> {
  if (!URL || !KEY) return [];
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endpoint =
    `${URL}/rest/v1/pulse_snapshots` +
    `?tmdb_id=eq.${tmdbId}&media_type=eq.${encodeURIComponent(mediaType)}` +
    `&captured_at=gte.${since}&order=captured_at.asc&select=captured_at,rank,pulse_score`;
  try {
    const res = await fetch(endpoint, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
