import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';

export function useNotificationObserver(queryClient: QueryClient, ready: boolean) {
  const handled = useRef<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const readyRef = useRef(ready);

  // Sync ready state to ref to avoid re-triggering listener hook registers
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  // Safely execute routing only after app stack navigator is ready
  useEffect(() => {
    if (ready && pendingUrl) {
      const timer = setTimeout(() => {
        router.push(pendingUrl as any);
        setPendingUrl(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ready, pendingUrl]);

  useEffect(() => {
    let mounted = true;
    function route(response?: Notifications.NotificationResponse | null) {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      const url = data?.url;
      
      // Force background update of Top 100 cache on notification action
      queryClient.invalidateQueries({ queryKey: ['trending'] });

      if (typeof url === 'string' && url.length) {
        const id = response.notification.request.identifier ?? url;
        if (handled.current === id) return;
        handled.current = id;
        if (readyRef.current) {
          router.push(url as any);
        } else {
          setPendingUrl(url);
        }
      }
    }
    Notifications.getLastNotificationResponseAsync().then((r) => { if (mounted) route(r); });
    const tapSub = Notifications.addNotificationResponseReceivedListener(route);
    Notifications.setBadgeCountAsync(0).catch(() => {});
    const appSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') Notifications.setBadgeCountAsync(0).catch(() => {});
    });
    return () => { mounted = false; tapSub.remove(); appSub.remove(); };
  }, [queryClient]);
}