import { useCallback, useEffect, useState } from 'react';
import { getWatchlist, setWatchlist, WatchEntry } from '../lib/storage';
import { getSyncState, pullSyncItems, pushSyncItems } from '../lib/sync';
import { titleOf, mediaType } from '../lib/tmdb';

let globalListeners: Array<(list: WatchEntry[]) => void> = [];
let hasPulledOnStartup = false;

function notifyGlobalWatchlist(newList: WatchEntry[]) {
  globalListeners.forEach((fn) => fn(newList));
}

export function useWatchlist() {
  const [list, setList] = useState<WatchEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const listener = (newList: WatchEntry[]) => {
      setList(newList);
    };
    globalListeners.push(listener);

    getWatchlist().then(async (l) => {
      setList(l);
      setLoaded(true);
      const syncState = await getSyncState();
      if (syncState.code && !hasPulledOnStartup) {
        hasPulledOnStartup = true;
        pullSyncItems(syncState.code)
          .then(({ items }) => notifyGlobalWatchlist(items))
          .catch(() => {});
      }
    });

    return () => {
      globalListeners = globalListeners.filter((fn) => fn !== listener);
    };
  }, []);

  const persist = useCallback((next: WatchEntry[]) => {
    notifyGlobalWatchlist(next);
    setWatchlist(next);
    getSyncState().then((syncState) => {
      if (syncState.code) {
        pushSyncItems(syncState.code, next, syncState.updatedAt).catch(() => {});
      }
    });
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

  const refresh = useCallback(() => {
    getWatchlist().then((l) => {
      notifyGlobalWatchlist(l);
    });
  }, []);

  return { list, loaded, has, toggle, refresh };
}
