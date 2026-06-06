// ============================================================================
//  Ephix Pulse scoring pipeline — ported verbatim from the web app's logic.
//  Only the I/O changed: fetch() now goes through lib/api, and the YouTube /
//  Wikipedia caches use AsyncStorage instead of localStorage. The maths
//  (weights, normalisation, merge, partition) is unchanged.
// ============================================================================
import { api } from './api';
import { cacheGet, cacheGetStale, cacheSet } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const W_TMDB = 0.38;
export const W_TRAKT = 0.42;
export const W_YOUTUBE = 0.12;
export const W_WIKIPEDIA = 0.08;

export const TOP_N = 100;
export const CANDIDATE_POOL = 150;
const UPCOMING_GRACE_DAYS = 0;
export const NEW_ENTRY_THRESHOLD = 25;
const PREV_TOP_KEY = 'pulse_prev_top25';

export const GENRE_MAP: Record<number, string> = {
  28: 'Action', 10759: 'Action & Adventure', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10762: 'Kids', 10402: 'Music', 9648: 'Mystery', 10763: 'News', 10764: 'Reality',
  10749: 'Romance', 878: 'Sci-Fi', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk',
  53: 'Thriller', 10770: 'TV Movie', 10752: 'War', 10768: 'War & Politics', 37: 'Western',
};

export function normaliseTitle(title?: string, year?: string | number): string {
  if (!title) return '';
  return (title.toLowerCase().replace(/[^a-z0-9]/g, '') + (year || '')).slice(0, 40);
}

// ---- TMDB: deeper pool than we display (upcoming gets split out later) ----
async function fetchTMDB(): Promise<any[]> {
  const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = await Promise.all(pages.map((p) => api.tmdbTrending(p)));
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const item of results.flatMap((r: any) => r.results || [])) {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') continue; // drop people
    const key = `${item.media_type}_${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }
  return deduped.slice(0, CANDIDATE_POOL);
}

// ---- Trakt: title -> { watchers, max, type } ----
async function fetchTrakt(): Promise<Record<string, any>> {
  const [moviesRes, showsRes] = await Promise.allSettled([
    api.traktTrending('movies'),
    api.traktTrending('shows'),
  ]);

  const map: Record<string, any> = {};
  const maxWatchers = { movie: 1, show: 1 };

  if (moviesRes.status === 'fulfilled') {
    moviesRes.value.forEach((i: any) => { if (i.watchers > maxWatchers.movie) maxWatchers.movie = i.watchers; });
    moviesRes.value.forEach((i: any) => {
      map[normaliseTitle(i.movie?.title, i.movie?.year)] = { watchers: i.watchers, max: maxWatchers.movie, type: 'movie' };
    });
  }
  if (showsRes.status === 'fulfilled') {
    showsRes.value.forEach((i: any) => { if (i.watchers > maxWatchers.show) maxWatchers.show = i.watchers; });
    showsRes.value.forEach((i: any) => {
      map[normaliseTitle(i.show?.title, i.show?.year)] = { watchers: i.watchers, max: maxWatchers.show, type: 'show' };
    });
  }
  return map;
}

// ---- Wikipedia 7-day pageviews for the top 50, normalised 0-1 ----
async function fetchWikipedia(tmdbItems: any[]): Promise<Record<string, number>> {
  const CACHE_KEY = 'pulse_wiki_views';
  const cached = await cacheGet<Record<string, number>>(CACHE_KEY, 12 * 60 * 60 * 1000);
  if (cached) {
    const keys = Object.keys(cached);
    const sample = tmdbItems.slice(0, 5).map((i) =>
      normaliseTitle(i.title || i.name, (i.release_date || i.first_air_date || '').slice(0, 4)),
    );
    if (sample.some((k) => keys.includes(k))) return cached;
  }

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const dateRange = `${fmt(start)}/${fmt(end)}`;

  const wikiItems = tmdbItems.slice(0, 50);
  const mentionMap: Record<string, number> = {};
  let maxViews = 1;
  const batches: any[][] = [];
  for (let i = 0; i < wikiItems.length; i += 10) batches.push(wikiItems.slice(i, i + 10));

  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map(async (item) => {
      const rawTitle = item.title || item.name || '';
      if (!rawTitle) return null;
      const articleName = encodeURIComponent(rawTitle.replace(/ /g, '_'));
      try {
        const data = await api.wikipedia(articleName, dateRange);
        const views = data?.items?.reduce((s: number, d: any) => s + (d.views || 0), 0) || 0;
        return { item, views };
      } catch {
        return null;
      }
    }));
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) {
        const { item, views } = r.value as any;
        const key = normaliseTitle(item.title || item.name, (item.release_date || item.first_air_date || '').slice(0, 4));
        mentionMap[key] = views;
        if (views > maxViews) maxViews = views;
      }
    });
  }

  Object.keys(mentionMap).forEach((k) => { mentionMap[k] = mentionMap[k] / maxViews; });
  if (Object.keys(mentionMap).length === 0) throw new Error('WIKI_EMPTY');
  await cacheSet(CACHE_KEY, mentionMap);
  return mentionMap;
}

// ---- YouTube buzz: mentions of each title across trending/searched videos ----
function ytBuildMentionMap(videos: any[], tmdbItems: any[]): Record<string, number> {
  const videoText = videos
    .map((v) => (v.snippet?.title || '') + ' ' + (v.snippet?.description || '').slice(0, 200))
    .join(' ')
    .toLowerCase();

  const mentionMap: Record<string, number> = {};
  let maxMentions = 1;
  tmdbItems.forEach((item) => {
    const title = (item.title || item.name || '').toLowerCase();
    if (!title || title.length < 3) return;
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = videoText.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    const count = matches ? matches.length : 0;
    const key = normaliseTitle(item.title || item.name, (item.release_date || item.first_air_date || '').slice(0, 4));
    mentionMap[key] = count;
    if (count > maxMentions) maxMentions = count;
  });
  Object.keys(mentionMap).forEach((k) => { mentionMap[k] = mentionMap[k] / maxMentions; });
  return mentionMap;
}

async function fetchYouTube(tmdbItems: any[]): Promise<Record<string, number>> {
  const CACHE_KEY = 'pulse_yt_videos';
  const cached = await cacheGet<any[]>(CACHE_KEY, 6 * 60 * 60 * 1000);
  if (cached && cached.length) return ytBuildMentionMap(cached, tmdbItems);

  const year = new Date().getFullYear();
  const queries = [`official trailer ${year}`, `trailer official movie`, `review ${year}`];
  const publishedAfter = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  let quotaExhausted = false;
  const searchResults = await Promise.allSettled(
    queries.map((q) => api.youtubeSearch(q, publishedAfter).catch((e: any) => {
      if (String(e?.message).includes('_403')) quotaExhausted = true;
      throw e;
    })),
  );
  let allVideos = searchResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r: any) => r.value?.items || []);

  if (allVideos.length === 0 || quotaExhausted) {
    const trending = await Promise.allSettled([api.youtubeTrending(1), api.youtubeTrending(24)]);
    allVideos = trending
      .filter((r) => r.status === 'fulfilled' && (r as any).value)
      .flatMap((r: any) => r.value?.items || []);
  }

  if (allVideos.length === 0) {
    const stale = await cacheGetStale<any[]>(CACHE_KEY);
    if (stale && stale.length) return ytBuildMentionMap(stale, tmdbItems);
    throw new Error('YT_EMPTY');
  }

  await cacheSet(CACHE_KEY, allVideos);
  return ytBuildMentionMap(allVideos, tmdbItems);
}

// ---- Merge & score (pure) ----
export type SourceStatus = { trakt?: string; youtube?: string; wikipedia?: string };

export function mergeAndScore(
  tmdbItems: any[],
  traktMap: Record<string, any>,
  youtubeMap: Record<string, number>,
  wikiMap: Record<string, number>,
  sourceStatus: SourceStatus = {},
): any[] {
  const total = tmdbItems.length;
  return tmdbItems
    .map((item, idx) => {
      const tmdbScore = 1 - idx / total;
      const tKey = normaliseTitle(item.title || item.name, (item.release_date || item.first_air_date || '').slice(0, 4));

      let traktScore = 0;
      const te = traktMap[tKey];
      if (te) traktScore = Math.min(te.watchers / te.max, 1);

      const youtubeScore = Math.min(youtubeMap[tKey] || 0, 1);
      const wikipediaScore = Math.min(wikiMap[tKey] || 0, 1);

      const hasTrakt = sourceStatus.trakt === 'ok';
      const hasYoutube = sourceStatus.youtube === 'ok';
      const hasWikipedia = sourceStatus.wikipedia === 'ok';

      let activeW = W_TMDB;
      let pulse = tmdbScore * W_TMDB;
      if (hasTrakt) { pulse += traktScore * W_TRAKT; activeW += W_TRAKT; }
      if (hasYoutube) { pulse += youtubeScore * W_YOUTUBE; activeW += W_YOUTUBE; }
      if (hasWikipedia) { pulse += wikipediaScore * W_WIKIPEDIA; activeW += W_WIKIPEDIA; }
      if (activeW > 0) pulse = pulse / activeW;

      return {
        ...item,
        _pulseScore: Math.round(pulse * 1000) / 10,
        _tmdbScore: Math.round(tmdbScore * 100),
        _traktScore: Math.round(traktScore * 100),
        _youtubeScore: Math.round(youtubeScore * 100),
        _wikipediaScore: Math.round(wikipediaScore * 100),
        _hasTrakt: hasTrakt,
        _hasYoutube: hasYoutube,
        _hasWikipedia: hasWikipedia,
      };
    })
    .sort((a, b) => b._pulseScore - a._pulseScore);
}

export function isUpcoming(item: any): boolean {
  const ds = item.release_date || item.first_air_date || '';
  if (!ds) return false;
  const t = Date.parse(ds + 'T00:00:00Z');
  if (isNaN(t)) return false;
  return t > Date.now() + UPCOMING_GRACE_DAYS * 86400000;
}

export function partitionItems(ranked: any[]): { released: any[]; upcoming: any[] } {
  return {
    upcoming: ranked.filter(isUpcoming),
    released: ranked.filter((i) => !isUpcoming(i)).slice(0, TOP_N),
  };
}

export function pickTrailer(detail: any): any | null {
  const vids = (detail?.videos && detail.videos.results) || [];
  const yt = vids.filter((v: any) => v.site === 'YouTube' && v.key);
  if (!yt.length) return null;
  const score = (v: any) => (v.type === 'Trailer' ? 2 : v.type === 'Teaser' ? 1 : 0) + (v.official ? 0.5 : 0);
  yt.sort((a: any, b: any) => score(b) - score(a));
  return yt[0];
}

// Flag titles that newly entered the top 25 since the last successful load (device-local).
// Mirrors the website's detectNewEntries: remembers the previous top-N and diffs it.
async function markNewEntries(released: any[]): Promise<void> {
  const top = released.slice(0, NEW_ENTRY_THRESHOLD);
  const idOf = (i: any) => `${i.media_type || (i.name ? 'tv' : 'movie')}_${i.id}`;
  const currentIds = top.map(idOf);
  let prev: string[] = [];
  try { prev = JSON.parse((await AsyncStorage.getItem(PREV_TOP_KEY)) || '[]'); } catch {}
  const hadBaseline = prev.length > 0;
  top.forEach((i) => { if (hadBaseline && !prev.includes(idOf(i))) i._isNew = true; });
  try { await AsyncStorage.setItem(PREV_TOP_KEY, JSON.stringify(currentIds)); } catch {}
}

// ---- Orchestrator: mirrors the website's startLoad (minus DOM + snapshot write) ----
export type PulseResult = { released: any[]; upcoming: any[] };

export async function loadPulse(): Promise<PulseResult> {
  const tmdbItems = await fetchTMDB(); // base list — fatal if this fails

  const [traktRes, ytRes, wikiRes] = await Promise.allSettled([
    fetchTrakt(),
    fetchYouTube(tmdbItems),
    fetchWikipedia(tmdbItems),
  ]);

  const traktMap = traktRes.status === 'fulfilled' ? traktRes.value : {};
  const youtubeMap = ytRes.status === 'fulfilled' ? ytRes.value : {};
  const wikiMap = wikiRes.status === 'fulfilled' ? wikiRes.value : {};

  const ranked = mergeAndScore(tmdbItems, traktMap, youtubeMap, wikiMap, {
    trakt: Object.keys(traktMap).length ? 'ok' : 'fail',
    youtube: Object.keys(youtubeMap).length ? 'ok' : 'fail',
    wikipedia: Object.keys(wikiMap).length ? 'ok' : 'fail',
  });

  const part = partitionItems(ranked);
  await markNewEntries(part.released);
  return part;
}
