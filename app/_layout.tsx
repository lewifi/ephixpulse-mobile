import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { BootSplash } from '../components/BootSplash';
import { prefetchTrending } from '../hooks/useTrending';
import { colors } from '../theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,         // 5 min "fresh" — then refetch in background
      gcTime: 24 * 60 * 60 * 1000,      // keep long enough to persist across launches
    },
  },
});

// Persist all queries (incl. the Top 100) to disk → instant warm starts.
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'pulse_rq_cache' });

// Minimum splash so a glow cycle is visible, but short so warm starts feel snappy.
const MIN_SPLASH_MS = 1800;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const start = useRef(Date.now());
  const [ready, setReady] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!fontsLoaded) return;
      await SplashScreen.hideAsync().catch(() => {});
      // Resolves instantly when the cache was restored from disk; otherwise fetches.
      await Promise.race([
        prefetchTrending(queryClient).catch(() => {}),
        new Promise((r) => setTimeout(r, 12000)),
      ]);
      const elapsed = Date.now() - start.current;
      if (elapsed < MIN_SPLASH_MS) await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
      setReady(true);
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="title/[type]/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="updates" options={{ presentation: 'modal' }} />
        </Stack>
        {!splashGone && <BootSplash visible={!ready} onHidden={() => setSplashGone(true)} />}
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
