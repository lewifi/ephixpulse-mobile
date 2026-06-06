import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { posterUrl } from '../lib/tmdb';

// `mover` from /api/movers: { tmdb_id, media_type, title, rank, prev_rank, rank_delta,
// pulse_score, score_delta }. `posterPath` joined from the trending pool when available.
export function MoverRow({ mover, posterPath }: { mover: any; posterPath?: string | null }) {
  const up = mover.rank_delta > 0;
  const moveColor = up ? colors.good : colors.live;
  const scoreDelta = typeof mover.score_delta === 'number' ? mover.score_delta : null;

  const open = () => {
    Haptics.selectionAsync();
    router.push(`/title/${mover.media_type}/${mover.tmdb_id}`);
  };

  return (
    <Pressable style={s.row} onPress={open}>
      <View style={s.rankCol}>
        <Text style={s.rankNow}>{mover.rank}</Text>
        {mover.prev_rank != null && <Text style={s.rankPrev}>was {mover.prev_rank}</Text>}
      </View>

      {posterPath ? (
        <Image source={posterUrl(posterPath, 'w185')} style={s.poster} contentFit="cover" transition={120} />
      ) : (
        <View style={[s.poster, s.ph]} />
      )}

      <View style={s.mid}>
        <Text style={s.title} numberOfLines={2}>{mover.title}</Text>
        <Text style={s.sub}>{mover.media_type === 'tv' ? 'TV' : 'Film'}</Text>
      </View>

      <View style={s.right}>
        <View style={[s.moveBadge, { borderColor: moveColor }]}>
          <Text style={[s.moveText, { color: moveColor }]}>{up ? '▲' : '▼'} {Math.abs(mover.rank_delta)}</Text>
        </View>
        <Text style={s.pulse}>{Math.round(mover.pulse_score)}</Text>
        {scoreDelta != null && scoreDelta !== 0 && (
          <Text style={[s.scoreDelta, { color: scoreDelta > 0 ? colors.good : colors.live }]}>
            {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9, borderBottomColor: colors.border, borderBottomWidth: 1 },
  rankCol: { width: 34, alignItems: 'center' },
  rankNow: { color: colors.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  rankPrev: { color: colors.faint, fontFamily: fonts.body, fontSize: 9, marginTop: 1 },
  poster: { width: 46, height: 69, backgroundColor: colors.surface },
  ph: { backgroundColor: colors.surface2 },
  mid: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  sub: { color: colors.faint, fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 4, minWidth: 56 },
  moveBadge: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  moveText: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.5 },
  pulse: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13, marginTop: 2 },
  scoreDelta: { fontFamily: fonts.medium, fontSize: 11 },
});