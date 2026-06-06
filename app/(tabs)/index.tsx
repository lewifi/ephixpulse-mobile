import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrending } from '../../hooks/useTrending';
import { TitleCard } from '../../components/TitleCard';
import { PulseWordmark } from '../../components/PulseWordmark';
import { ControlsMenu, MediaFilter, SortKey } from '../../components/ControlsMenu';
import { NotifyModal } from '../../components/NotifyModal';
import { Loading, ErrorState, EmptyState } from '../../components/StateViews';
import { titleOf, mediaType } from '../../lib/tmdb';
import { colors, fonts } from '../../theme/colors';

const COLS = 3;

const SORT_SCORE: Record<Exclude<SortKey, 'rating' | 'title'>, string> = {
  pulse: '_pulseScore', tmdb: '_tmdbScore', trakt: '_traktScore', youtube: '_youtubeScore', wiki: '_wikipediaScore',
};

export default function Pulse() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useTrending();
  const [media, setMedia] = useState<MediaFilter>('all');
  const [sort, setSort] = useState<SortKey>('pulse');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [notify, setNotify] = useState(false);

  const items = useMemo(() => {
    const released = data?.released ?? [];
    const upcoming = data?.upcoming ?? [];
    let list = query.trim()
      ? [...released, ...upcoming].filter((i) => titleOf(i).toLowerCase().includes(query.toLowerCase()))
      : released.slice();

    if (!query.trim() && media !== 'all') list = list.filter((i) => mediaType(i) === media);

    if (sort === 'title') list.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    else if (sort === 'rating') list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    else { const k = SORT_SCORE[sort]; list.sort((a, b) => (b[k] || 0) - (a[k] || 0)); }

    return list;
  }, [data, media, sort, query]);

  const ranked = !query.trim() && media === 'all' && sort === 'pulse';

  const randomPick = () => {
    const pool = data?.released ?? [];
    if (!pool.length) return;
    const it = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/title/${mediaType(it)}/${it.id}`);
  };

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <PulseWordmark size={26} />
        <View style={s.headerIcons}>
          <Pressable onPress={() => setNotify(true)} hitSlop={10} style={s.menuBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.muted} />
          </Pressable>
          <Pressable onPress={() => setMenu(true)} hitSlop={10} style={s.menuBtn}>
            <Ionicons name="options-outline" size={22} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={colors.faint} />
        <TextInput
          style={s.search}
          placeholder="Search trending titles"
          placeholderTextColor={colors.faint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.faint} />
          </Pressable>
        )}
      </View>

      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>{query.trim() ? 'Results' : 'Live Top 100'}</Text>
        {!query.trim() && (media !== 'all' || sort !== 'pulse') && (
          <Text style={s.activeFilters}>
            {media !== 'all' ? (media === 'movie' ? 'Films' : 'TV') : 'All'}
            {sort !== 'pulse' ? ` · ${sort}` : ''}
          </Text>
        )}
      </View>

      <FlashList
        data={items}
        numColumns={COLS}
        keyExtractor={(item: any) => `${mediaType(item)}_${item.id}`}
        renderItem={({ item, index }: any) => <TitleCard item={item} rank={ranked ? index + 1 : undefined} />}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListEmptyComponent={<EmptyState title="No matches" sub="Try a different search or filter." />}
      />

      <ControlsMenu
        visible={menu}
        media={media}
        sort={sort}
        onClose={() => setMenu(false)}
        onMedia={setMedia}
        onSort={setSort}
        onRefresh={refetch}
        onRandom={randomPick}
        onUpdates={() => { setMenu(false); router.push('/updates'); }}
      />

      <NotifyModal visible={notify} onClose={() => setNotify(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBtn: { padding: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, height: 40, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  search: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 14, paddingVertical: 0 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 30, color: colors.text, letterSpacing: 1 },
  activeFilters: { color: colors.accent, fontFamily: fonts.medium, fontSize: 12, textTransform: 'capitalize' },
});
