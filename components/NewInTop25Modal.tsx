import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTrending } from '../hooks/useTrending';
import { posterUrl, titleOf, mediaType } from '../lib/tmdb';
import { colors, fonts } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function NewInTop25Modal({ visible, onClose }: Props) {
  const { data } = useTrending();
  const fresh = (data?.released ?? []).filter((i: any) => i._isNew).slice(0, 12);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.head}>
            <View style={s.titleRow}>
              <Ionicons name="flame" size={20} color={colors.accent} />
              <Text style={s.title}>New in the Top 25</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{fresh.length}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={s.sub}>
            Fresh titles that recently broke into the Top 25.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {fresh.map((item: any) => (
              <Pressable
                key={`${mediaType(item)}_${item.id}`}
                style={s.card}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                  router.push(`/title/${mediaType(item)}/${item.id}`);
                }}
              >
                <View>
                  <Image source={posterUrl(item.poster_path, 'w185')} style={s.poster} contentFit="cover" transition={120} />
                  <View style={s.newTag}>
                    <Text style={s.newTagText}>NEW</Text>
                  </View>
                </View>
                <Text style={s.name} numberOfLines={1}>{titleOf(item)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderColor: colors.border, borderWidth: 1, paddingVertical: 16, paddingBottom: 32 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: 0.5 },
  badge: { backgroundColor: colors.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontFamily: fonts.bold, fontSize: 11 },
  closeBtn: { padding: 4 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 16, marginBottom: 16 },
  row: { paddingHorizontal: 16, gap: 12 },
  card: { width: 100 },
  poster: { width: 100, height: 150, backgroundColor: colors.bg, borderRadius: 4 },
  newTag: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.accent, paddingHorizontal: 5, paddingVertical: 2, borderTopLeftRadius: 4 },
  newTagText: { color: '#fff', fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.6 },
  name: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 6 },
});
