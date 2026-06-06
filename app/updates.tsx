import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { CHANGELOG, APP_VERSION } from '../lib/changelog';
import { PulseWordmark } from '../components/PulseWordmark';
import { colors, fonts } from '../theme/colors';

export default function Updates() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>What's New</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        {CHANGELOG.map((rel) => (
          <View key={rel.version} style={s.rel}>
            <Text style={s.relHead}>
              {rel.date} <Text style={s.ver}>v{rel.version}</Text>
            </Text>
            {rel.notes.map((n, i) => (
              <View key={i} style={s.noteRow}>
                <Text style={s.dot}>·</Text>
                <Text style={s.note}>{n}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.footer}>
          <PulseWordmark size={22} />
          <Text style={s.tag}>What the World is Watching · v{APP_VERSION}</Text>
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://index.lewi.fi')} hitSlop={8}>
            <Text style={s.credit}>Made by Lewi ↗</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text, letterSpacing: 1 },
  rel: { marginBottom: 22 },
  relHead: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, marginBottom: 10 },
  ver: { fontFamily: fonts.display, fontSize: 15, color: colors.accent, letterSpacing: 0.5 },
  noteRow: { flexDirection: 'row', gap: 8, marginBottom: 6, paddingRight: 8 },
  dot: { color: colors.accent, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  note: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  footer: { alignItems: 'center', marginTop: 16, paddingTop: 24, borderTopColor: colors.border, borderTopWidth: 1, gap: 8 },
  tag: { color: colors.faint, fontFamily: fonts.body, fontSize: 12 },
  credit: { color: colors.accent, fontFamily: fonts.medium, fontSize: 14, marginTop: 4 },
});
