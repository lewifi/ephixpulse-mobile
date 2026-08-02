import { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import { posterUrl, titleOf, yearOf, mediaType } from '../lib/tmdb';
import { useWatchlist } from '../hooks/useWatchlist';
import { PulseBadge } from './PulseBadge';

function TitleCardBase({ item, rank }: { item: any; rank?: number }) {
  const type = mediaType(item);
  const poster = posterUrl(item.poster_path, 'w342');
  const { has, toggle } = useWatchlist();
  const isSaved = has(item.id, type);

  const open = () => {
    Haptics.selectionAsync();
    router.push(`/title/${type}/${item.id}`);
  };

  return (
    <Pressable style={s.card} onPress={open}>
      <View style={s.posterWrap}>
        {poster ? (
          <Image source={poster} style={s.poster} contentFit="cover" transition={150} />
        ) : (
          <View style={[s.poster, s.placeholder]}>
            <Text style={s.placeholderText}>{titleOf(item)}</Text>
          </View>
        )}
        {rank != null && (
          <View style={s.rank}><Text style={s.rankText}>{rank}</Text></View>
        )}
        {item._isNew && (
          <View style={s.newBadge}><Text style={s.newText}>NEW</Text></View>
        )}
        <Pressable
          style={s.bookmarkBtn}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggle(item);
          }}
        >
          <Ionicons
            name={isSaved ? "star" : "star-outline"}
            size={18}
            color={isSaved ? colors.accent : "rgba(255,255,255,0.7)"}
          />
        </Pressable>
        <View style={s.badge}><PulseBadge score={item._pulseScore} /></View>
      </View>
      <Text style={s.title} numberOfLines={1}>{titleOf(item)}</Text>
      <Text style={s.meta} numberOfLines={1}>
        {type === 'tv' ? 'TV' : 'Film'}{yearOf(item) ? ` · ${yearOf(item)}` : ''}
      </Text>
    </Pressable>
  );
}

export const TitleCard = memo(TitleCardBase);

const s = StyleSheet.create({
  card: { flex: 1, margin: 6 },
  posterWrap: { aspectRatio: 2 / 3, backgroundColor: colors.surface, overflow: 'hidden', position: 'relative' },
  poster: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  placeholderText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
  rank: { position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(13,21,32,0.82)', paddingHorizontal: 7, paddingVertical: 2 },
  rankText: { color: colors.text, fontFamily: fonts.display, fontSize: 14 },
  badge: { position: 'absolute', bottom: 6, right: 6 },
  newBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2 },
  bookmarkBtn: { position: 'absolute', top: 4, right: 4, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, padding: 4 },
  newText: { color: '#fff', fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 12.5, marginTop: 6 },
  meta: { color: colors.faint, fontFamily: fonts.body, fontSize: 11, marginTop: 1 },
});
