import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Share, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTitleDetail, viewerRegion } from '../../../hooks/useTrending';
import { useMovement, useHistory } from '../../../hooks/useMovers';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { Loading, ErrorState } from '../../../components/StateViews';
import { PulseBadge } from '../../../components/PulseBadge';
import { Sparkline } from '../../../components/Sparkline';
import { pickTrailer, GENRE_MAP } from '../../../lib/pulse';
import { posterUrl, logoUrl, titleOf, yearOf } from '../../../lib/tmdb';
import { colors, fonts } from '../../../theme/colors';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://ephix.net';

export default function TitleDetail() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: d, isLoading, isError, error, refetch } = useTitleDetail(type!, id!);
  const { data: movement } = useMovement(type!, id!);
  const { data: history } = useHistory(type!, id!);
  const { has, toggle } = useWatchlist();
  const [showTrailer, setShowTrailer] = useState(false);

  if (isLoading) return <Loading label="Loading details…" />;
  if (isError || !d) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const trailer = pickTrailer(d);
  const saved = has(Number(id), type!);
  const region = viewerRegion();
  const flat = d._watch?.results?.[region]?.flatrate || [];
  const watchLink = d._watch?.results?.[region]?.link;
  const genres = (d.genres || []).map((g: any) => g.name || GENRE_MAP[g.id]).filter(Boolean);
  const rating = d.vote_average ? d.vote_average.toFixed(1) : null;
  const cast = (d._credits?.cast || []).slice(0, 6);
  const name = titleOf(d);
  const imdbId = d.imdb_id || d.external_ids?.imdb_id;

  const open = (url: string) => WebBrowser.openBrowserAsync(url);
  const links = [
    { label: 'TMDB', icon: 'film-outline', url: `https://www.themoviedb.org/${type}/${id}` },
    ...(imdbId ? [{ label: 'IMDb', icon: 'star-outline', url: `https://www.imdb.com/title/${imdbId}/` }] : []),
    { label: 'Google', icon: 'search-outline', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' ' + (type === 'tv' ? 'tv series' : 'movie'))}` },
  ];

  const share = () =>
    Share.share({ message: `${name} — on Ephix Pulse\n${API_BASE}/?t=${type}-${id}` }).catch(() => {});

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <Pressable style={[s.close, { top: insets.top + 6 }]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        {/* Hero */}
        <View style={[s.hero, { paddingTop: insets.top + 14 }]}>
          <Image source={posterUrl(d.poster_path, 'w342')} style={s.poster} contentFit="cover" transition={150} />
          <View style={s.heroText}>
            <Text style={s.title}>{name}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>{type === 'tv' ? 'TV' : 'Film'}</Text>
              {yearOf(d) ? <Text style={s.meta}> · {yearOf(d)}</Text> : null}
              {rating ? <Text style={s.meta}> · ★ {rating}</Text> : null}
            </View>
            <View style={s.badgeRow}>
              <PulseBadge score={d._pulseScore} />
              {movement && movement.rank_delta !== 0 && (
                <Text style={[s.move, { color: movement.rank_delta > 0 ? colors.good : colors.live }]}>
                  {movement.rank_delta > 0 ? '▲' : '▼'} {Math.abs(movement.rank_delta)}
                </Text>
              )}
            </View>
            {d.tagline ? <Text style={s.tagline}>"{d.tagline}"</Text> : null}
            <View style={s.heroBtns}>
              {trailer && (
                <Pressable style={s.btn} onPress={() => setShowTrailer((v) => !v)}>
                  <Ionicons name={showTrailer ? 'chevron-up' : 'play'} size={14} color={colors.text} />
                  <Text style={s.btnText}>{showTrailer ? 'Hide trailer' : 'Watch trailer'}</Text>
                </Pressable>
              )}
              <Pressable style={[s.btn, saved && s.btnSaved]} onPress={() => toggle({ ...d, media_type: type })}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={14} color={saved ? colors.accent : colors.text} />
                <Text style={[s.btnText, saved && { color: colors.accent }]}>{saved ? 'Saved' : 'My List'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Trailer */}
        {showTrailer && trailer && (
          <View style={s.trailer}>
            <YoutubePlayer height={(width - 32) * 0.5625} width={width - 32} videoId={trailer.key} play />
          </View>
        )}

        {/* Pulse Spark */}
        <Sparkline history={history} />

        {/* Links + Share */}
        <View style={s.links}>
          {links.map((l) => (
            <Pressable key={l.label} style={s.linkBtn} onPress={() => open(l.url)}>
              <Ionicons name={l.icon as any} size={14} color={colors.muted} />
              <Text style={s.linkText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable style={s.linkBtn} onPress={share}>
            <Ionicons name="share-outline" size={14} color={colors.muted} />
            <Text style={s.linkText}>Share</Text>
          </Pressable>
        </View>

        {/* Where to watch */}
        {flat.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockLabel}>WHERE TO WATCH · {region}</Text>
            <View style={s.logos}>
              {flat.slice(0, 8).map((p: any) => (
                <Image key={p.provider_id} source={logoUrl(p.logo_path)} style={s.logo} contentFit="cover" />
              ))}
            </View>
            {watchLink && (
              <Pressable onPress={() => open(watchLink)}>
                <Text style={s.link}>All options on JustWatch ↗</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Overview */}
        {d.overview ? (
          <View style={s.block}><Text style={s.overview}>{d.overview}</Text></View>
        ) : null}

        {/* Genres */}
        {genres.length > 0 && (
          <View style={[s.block, s.chips]}>
            {genres.map((g: string) => (
              <View key={g} style={s.chip}><Text style={s.chipText}>{g}</Text></View>
            ))}
          </View>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockLabel}>CAST</Text>
            <Text style={s.castText}>{cast.map((c: any) => c.name).join(' · ')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  close: { position: 'absolute', right: 14, zIndex: 20, backgroundColor: 'rgba(13,21,32,0.6)', padding: 4 },
  hero: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  poster: { width: 120, height: 180, backgroundColor: colors.surface },
  heroText: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, lineHeight: 24 },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  move: { fontFamily: fonts.display, fontSize: 16 },
  tagline: { color: colors.muted, fontFamily: fonts.body, fontStyle: 'italic', fontSize: 12, marginTop: 8 },
  heroBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  btnSaved: { borderColor: colors.accent },
  btnText: { color: colors.text, fontFamily: fonts.medium, fontSize: 12 },
  trailer: { marginHorizontal: 16, marginBottom: 18, backgroundColor: '#000' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderColor: colors.border, borderWidth: 1 },
  linkText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  block: { paddingHorizontal: 16, marginBottom: 18 },
  blockLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.3, marginBottom: 10 },
  logos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  logo: { width: 44, height: 44, backgroundColor: colors.surface },
  link: { color: colors.accent, fontFamily: fonts.medium, fontSize: 12, marginTop: 12 },
  overview: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: colors.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  castText: { color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
});
