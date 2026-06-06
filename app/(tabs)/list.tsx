import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWatchlist } from '../../hooks/useWatchlist';
import { TitleCard } from '../../components/TitleCard';
import { EmptyState, Loading } from '../../components/StateViews';
import { colors, fonts } from '../../theme/colors';

export default function MyList() {
  const insets = useSafeAreaInsets();
  const { list, loaded } = useWatchlist();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.title}>My List</Text>
      {!loaded ? (
        <Loading label="Opening your list…" />
      ) : (
        <FlashList
          data={list}
          numColumns={3}
          keyExtractor={(item: any) => `${item.type}_${item.id}`}
          renderItem={({ item }: any) => <TitleCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={<EmptyState title="Nothing saved yet" sub="Tap “My List” on any title to add it here." />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, paddingHorizontal: 16, paddingTop: 12, letterSpacing: 1 },
});
