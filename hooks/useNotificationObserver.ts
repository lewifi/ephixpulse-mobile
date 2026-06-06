import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export function useNotificationObserver() {
  const handled = useRef<string | null>(null);
  useEffect(() => {
    let mounted = true;
    function route(response?: Notifications.NotificationResponse | null) {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      const url = data?.url;
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
  }, []);
}