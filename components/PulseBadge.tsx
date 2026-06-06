import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

export function PulseBadge({ score }: { score?: number }) {
  if (score == null) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.num}>{score.toFixed(1)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  num: { color: colors.accent, fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.5 },
});
