import { View, Text, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrending } from '../../hooks/useTrending';
import { TitleCard } from '../../components/TitleCard';
import { Loading, ErrorState, EmptyState } from '../../components/StateViews';
import { mediaType } from '../../lib/tmdb';
import { colors, fonts } from '../../theme/colors';

export default function Anticipated() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useTrending();

  if (isLoading) return <Loading label="Finding what's coming…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const items = data?.upcoming ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.title}>Most Anticipated</Text>
      <Text style={s.sub}>Unreleased titles, ranked by buzz.</Text>
      <FlashList
        data={items}
        numColumns={3}
        keyExtractor={(item: any) => `${mediaType(item)}_${item.id}`}
        renderItem={({ item }: any) => <TitleCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListEmptyComponent={<EmptyState title="Nothing upcoming right now" sub="Pull to refresh." />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, paddingHorizontal: 16, paddingTop: 12, letterSpacing: 1 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 16, paddingBottom: 4 },
});
