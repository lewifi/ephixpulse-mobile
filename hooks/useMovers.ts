import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fetchHistory, historyEnabled } from '../lib/history';

export function useMovers(window: '24h' | '7d') {
  return useQuery({
    queryKey: ['movers', window],
    queryFn: () => api.movers(window, 25),
    staleTime: 10 * 60 * 1000,
  });
}

// Per-title up/down badge for the detail screen.
export function useMovement(type: string, id: string) {
  return useQuery({
    queryKey: ['movement', type, id],
    enabled: !!type && !!id,
    staleTime: 10 * 60 * 1000,
    queryFn: () => api.movement(`${type}_${id}`),
    select: (d: any) => (d && typeof d.rank_delta === 'number' ? d : null),
  });
}

// 7-day Pulse history (sparkline). No-ops if Supabase env not set.
export function useHistory(type: string, id: string) {
  return useQuery({
    queryKey: ['history', type, id],
    enabled: historyEnabled() && !!type && !!id,
    staleTime: 30 * 60 * 1000,
    queryFn: () => fetchHistory(id, type),
  });
}
