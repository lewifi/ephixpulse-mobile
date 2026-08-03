import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

export function useNotificationObserver() {
  const queryClient = useQueryClient();
  const handled = useRef<string | null>(null);
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
        router.push(url as any);
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