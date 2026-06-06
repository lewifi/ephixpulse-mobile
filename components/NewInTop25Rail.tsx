import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTrending } from '../hooks/useTrending';
import { posterUrl, titleOf, mediaType } from '../lib/tmdb';
import { colors, fonts } from '../theme/colors';

export function NewInTop25Rail() {
  const { data } = useTrending();
  const fresh = (data?.released ?? []).filter((i: any) => i._isNew).slice(0, 12);
  if (fresh.length === 0) return null;
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.title}>New in the Top 25</Text>
        <View style={s.count}><Text style={s.countText}>{fresh.length}</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {fresh.map((item: any) => (
          <Pressable key={`${mediaType(item)}_${item.id}`} style={s.card}
            onPress={() => { Haptics.selectionAsync(); router.push(`/title/${mediaType(item)}/${item.id}`); }}>
            <View>
              <Image source={posterUrl(item.poster_path, 'w185')} style={s.poster} contentFit="cover" transition={120} />
              <View style={s.newTag}><Text style={s.newTagText}>NEW</Text></View>
            </View>
            <Text style={s.name} numberOfLines={1}>{titleOf(item)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.text, letterSpacing: 0.5 },
  count: { backgroundColor: colors.accent, minWidth: 20, paddingHorizontal: 6, height: 20, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#fff', fontFamily: fonts.bold, fontSize: 11 },
  row: { paddingHorizontal: 16, gap: 10 },
  card: { width: 92 },
  poster: { width: 92, height: 138, backgroundColor: colors.surface },
  newTag: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.accent, paddingHorizontal: 5, paddingVertical: 2 },
  newTagText: { color: '#fff', fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.6 },
  name: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 5 },
});