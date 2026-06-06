import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovers } from '../../hooks/useMovers';
import { useTrending } from '../../hooks/useTrending';
import { MoverRow } from '../../components/MoverRow';
import { Loading, ErrorState, EmptyState } from '../../components/StateViews';
import { colors, fonts } from '../../theme/colors';

export default function Movers() {
  const insets = useSafeAreaInsets();
  const [win, setWin] = useState<'24h' | '7d'>('24h');
  const { data, isLoading, isError, error, refetch } = useMovers(win);
  const movers = data?.movers ?? [];
  const reason = data?.reason as string | undefined;
  const { data: trending } = useTrending();

  // Join posters from the trending pool by `${media_type}_${id}`.
  const posterMap = useMemo(() => {
    const m: Record<string, string | undefined> = {};
    [...(trending?.released ?? []), ...(trending?.upcoming ?? [])].forEach((i: any) => {
      m[`${i.media_type || (i.name ? 'tv' : 'movie')}_${i.id}`] = i.poster_path;
    });
    return m;
  }, [trending]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.title}>Biggest Movers</Text>
      <View style={s.toggle}>
        {(['24h', '7d'] as const).map((w) => (
          <Pressable key={w} onPress={() => setWin(w)} style={[s.seg, win === w && s.segActive]}>
            <Text style={[s.segText, win === w && s.segTextActive]}>{w === '24h' ? '24 hours' : '7 days'}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <Loading label="Crunching movement…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : (
        <FlashList
          data={movers}
          keyExtractor={(m: any) => `${m.media_type}_${m.tmdb_id}`}
          renderItem={({ item }: any) => (
            <MoverRow mover={item} posterPath={posterMap[`${item.media_type}_${item.tmdb_id}`]} />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 4 }}
          ListEmptyComponent={
            <EmptyState
              title="No movers yet"
              sub={
                reason === 'no_snapshots'
                  ? 'No snapshots recorded yet — the website builds these as people visit.'
                  : reason === 'insufficient_history'
                  ? `Not enough history for the ${win} window yet. Try 7d, or check back later.`
                  : 'Needs a little snapshot history to compare against. Pull to refresh.'
              }
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, paddingHorizontal: 16, paddingTop: 12, letterSpacing: 1 },
  toggle: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  seg: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  segActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  segTextActive: { color: '#fff' },
});
