import { useQuery, QueryClient } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { loadPulse, PulseResult } from '../lib/pulse';
import { api } from '../lib/api';

// Shared so the splash screen can prefetch the exact same query the home screen reads.
export const trendingQuery = {
  queryKey: ['trending'] as const,
  queryFn: loadPulse,
  staleTime: 5 * 60 * 1000, // 5 min — matches the site's refresh cadence loosely
};

export function prefetchTrending(qc: QueryClient) {
  return qc.prefetchQuery(trendingQuery);
}

export function useTrending() {
  return useQuery<PulseResult>(trendingQuery);
}

export function viewerRegion(): string {
  try {
    const r = getLocales()?.[0]?.regionCode;
    if (r) return r;
  } catch {}
  return 'US';
}

// Detail = TMDB detail (+videos) + credits + region watch providers, in one go.
export function useTitleDetail(type: string, id: string) {
  return useQuery({
    queryKey: ['title', type, id],
    enabled: !!type && !!id,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [detail, credits, watch] = await Promise.all([
        api.tmdbDetail(type, id),
        api.tmdbCredits(type, id).catch(() => null),
        api.tmdbWatch(type, id).catch(() => null),
      ]);
      return { ...detail, _credits: credits, _watch: watch };
    },
  });
}
