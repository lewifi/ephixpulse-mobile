import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { APP_VERSION } from '../lib/changelog';
import { colors, fonts } from '../theme/colors';

export type MediaFilter = 'all' | 'movie' | 'tv';
export type SortKey = 'pulse' | 'tmdb' | 'trakt' | 'youtube' | 'wiki' | 'rating' | 'title';

const MEDIA: { key: MediaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'TV' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'pulse', label: 'Pulse score' },
  { key: 'tmdb', label: 'TMDB' },
  { key: 'trakt', label: 'Trakt' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'wiki', label: 'Wikipedia' },
  { key: 'rating', label: 'Rating' },
  { key: 'title', label: 'Title (A–Z)' },
];

type Props = {
  visible: boolean;
  media: MediaFilter;
  sort: SortKey;
  onClose: () => void;
  onMedia: (m: MediaFilter) => void;
  onSort: (s: SortKey) => void;
  onRefresh: () => void;
  onRandom: () => void;
  onUpdates: () => void;
};

export function ControlsMenu({ visible, media, sort, onClose, onMedia, onSort, onRefresh, onRandom, onUpdates }: Props) {
  // Every selection applies then closes — so the menu disappears as the list updates.
  const pickMedia = (m: MediaFilter) => { onMedia(m); onClose(); };
  const pickSort = (sortKey: SortKey) => { onSort(sortKey); onClose(); };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.head}>
            <Text style={s.title}>View options</Text>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
          </View>

          <Text style={s.label}>SHOW</Text>
          <View style={s.rowWrap}>
            {MEDIA.map((m) => (
              <Pressable key={m.key} onPress={() => pickMedia(m.key)} style={[s.pill, media === m.key && s.pillActive]}>
                <Text style={[s.pillText, media === m.key && s.pillTextActive]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>SORT BY</Text>
          <View style={s.rowWrap}>
            {SORTS.map((so) => (
              <Pressable key={so.key} onPress={() => pickSort(so.key)} style={[s.pill, sort === so.key && s.pillActive]}>
                <Text style={[s.pillText, sort === so.key && s.pillTextActive]}>{so.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.actions}>
            <Pressable style={s.action} onPress={() => { onRandom(); onClose(); }}>
              <Ionicons name="shuffle" size={16} color={colors.text} />
              <Text style={s.actionText}>Random pick</Text>
            </Pressable>
            <Pressable style={s.action} onPress={() => { onRefresh(); onClose(); }}>
              <Ionicons name="refresh" size={16} color={colors.text} />
              <Text style={s.actionText}>Refresh</Text>
            </Pressable>
          </View>

          <View style={s.foot}>
            <Pressable onPress={onUpdates} hitSlop={6}>
              <Text style={s.footLink}>What's new · v{APP_VERSION}</Text>
            </Pressable>
            <Pressable onPress={() => { WebBrowser.openBrowserAsync('https://index.lewi.fi'); onClose(); }} hitSlop={6}>
              <Text style={s.footCredit}>Made by Lewi ↗</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, padding: 20, paddingBottom: 32, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  label: { color: colors.faint, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, marginTop: 10, marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1 },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pillText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  pillTextActive: { color: colors.accent },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderColor: colors.border, borderWidth: 1 },
  actionText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopColor: colors.border, borderTopWidth: 1 },
  footLink: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  footCredit: { color: colors.accent, fontFamily: fonts.medium, fontSize: 12 },
});
