// Client for the Cloudflare Pages Functions (/api/*) — same backend as the website.
const BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://ephix.net';

type Params = Record<string, string | number | undefined>;
function qs(p: Params = {}) {
  const s = Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
}
export async function call(endpoint: string, params?: Params): Promise<any> {
  const res = await fetch(`${BASE}/api/${endpoint}${qs(params)}`);
  if (!res.ok) throw new Error(`${endpoint.toUpperCase()}_${res.status}`);
  return res.json();
}

export const api = {
  tmdbTrending: (page: number) => call('tmdb', { path: 'trending/all/day', page }),
  tmdbDetail: (type: string, id: number | string) =>
    call('tmdb', { path: `${type}/${id}`, append_to_response: type === 'tv' ? 'videos,external_ids' : 'videos' }),
  tmdbCredits: (type: string, id: number | string) => call('tmdb', { path: `${type}/${id}/credits` }),
  tmdbWatch: (type: string, id: number | string) => call('tmdb', { path: `${type}/${id}/watch/providers` }),
  traktTrending: (kind: 'movies' | 'shows') => call('trakt', { path: `${kind}/trending`, limit: 100, extended: 'full' }),
  youtubeSearch: (q: string, publishedAfter: string) =>
    call('youtube', { path: 'search', part: 'snippet', type: 'video', maxResults: 50, order: 'viewCount', q, publishedAfter }),
  youtubeTrending: (videoCategoryId: number) =>
    call('youtube', { path: 'videos', part: 'snippet', chart: 'mostPopular', maxResults: 50, videoCategoryId }),
  wikipedia: (article: string, range: string) => call('wikipedia', { article, range }),

  // Movers strip (server-side diff of pulse_snapshots). window: '24h' | '7d'.
  movers: (window: '24h' | '7d' = '24h', limit = 20) => call('movers', { window, limit }),
  // Signed movement for one title (modal badge). id = `${media_type}_${tmdb_id}`.
  movement: (id: string) => call('movers', { id }),
};
