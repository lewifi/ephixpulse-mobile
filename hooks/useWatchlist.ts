import { useCallback, useEffect, useState } from 'react';
import { getWatchlist, setWatchlist, WatchEntry } from '../lib/storage';
import { titleOf, mediaType } from '../lib/tmdb';

export function useWatchlist() {
  const [list, setList] = useState<WatchEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getWatchlist().then((l) => { setList(l); setLoaded(true); });
  }, []);

  const persist = useCallback((next: WatchEntry[]) => {
    setList(next);
    setWatchlist(next);
  }, []);

  const has = useCallback(
    (id: number, type: string) => list.some((e) => e.id === id && e.type === type),
    [list],
  );

  const toggle = useCallback((item: any) => {
    const type = mediaType(item);
    const exists = list.some((e) => e.id === item.id && e.type === type);
    if (exists) {
      persist(list.filter((e) => !(e.id === item.id && e.type === type)));
    } else {
      const entry: WatchEntry = {
        id: item.id,
        type,
        title: titleOf(item),
        poster_path: item.poster_path,
        _pulseScore: item._pulseScore,
      };
      persist([entry, ...list]);
    }
  }, [list, persist]);

  return { list, loaded, has, toggle };
}
