import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { posterUrl } from '../lib/tmdb';
import { PulseBadge } from './PulseBadge';

// `mover` from /api/movers; `poster` joined from the trending list when available.
export function MoverRow({ mover, posterPath }: { mover: any; posterPath?: string | null }) {
  const climbed = mover.rank_delta > 0;
  const open = () => {
    Haptics.selectionAsync();
    router.push(`/title/${mover.media_type}/${mover.tmdb_id}`);
  };
  return (
    <Pressable style={s.row} onPress={open}>
      <Text style={s.rank}>{mover.rank}</Text>
      {posterPath ? (
        <Image source={posterUrl(posterPath, 'w185')} style={s.poster} contentFit="cover" transition={120} />
      ) : (
        <View style={[s.poster, s.ph]} />
      )}
      <View style={s.mid}>
        <Text style={s.title} numberOfLines={1}>{mover.title}</Text>
        <Text style={s.sub}>{mover.media_type === 'tv' ? 'TV' : 'Film'}</Text>
      </View>
      <View style={s.right}>
        <Text style={[s.move, { color: climbed ? colors.good : colors.live }]}>
          {climbed ? '▲' : '▼'} {Math.abs(mover.rank_delta)}
        </Text>
        <PulseBadge score={mover.pulse_score} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  rank: { width: 24, textAlign: 'center', color: colors.muted, fontFamily: fonts.display, fontSize: 18 },
  poster: { width: 42, height: 63, backgroundColor: colors.surface },
  ph: { backgroundColor: colors.surface2 },
  mid: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  sub: { color: colors.faint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 5 },
  move: { fontFamily: fonts.display, fontSize: 16 },
});
