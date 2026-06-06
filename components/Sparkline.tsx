import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, fonts } from '../theme/colors';
import type { HistoryPoint } from '../lib/history';

export function Sparkline({ history }: { history?: HistoryPoint[] }) {
  if (!history || history.length < 2) return null;

  const W = 300, H = 70, padX = 6, padY = 10;
  const scores = history.map((p) => p.pulse_score);
  const min = Math.min(...scores), max = Math.max(...scores), range = max - min || 1;

  const pts = history.map((p, i) => {
    const x = padX + (i / (history.length - 1)) * (W - padX * 2);
    const y = H - padY - ((p.pulse_score - min) / range) * (H - padY * 2);
    return [x, y] as const;
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const last = pts[pts.length - 1];
  const trend = scores[scores.length - 1] - scores[0];

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.label}>PULSE SPARK · 7 DAYS</Text>
        <Text style={[s.delta, { color: trend >= 0 ? colors.good : colors.live }]}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}
        </Text>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={area} fill={colors.accent} fillOpacity={0.12} />
        <Path d={line} stroke={colors.accent} strokeWidth={2} fill="none" />
        <Circle cx={last[0]} cy={last[1]} r={3.2} fill={colors.accent} />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.3 },
  delta: { fontFamily: fonts.display, fontSize: 14 },
});
