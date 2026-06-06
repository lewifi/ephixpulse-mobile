import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

export function Loading({ label = 'Loading the Pulse…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.accent} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.title}>Couldn't load</Text>
      <Text style={s.muted}>{message || 'Something went wrong reaching the Pulse sources.'}</Text>
      {onRetry && (
        <Pressable style={s.btn} onPress={onRetry}>
          <Text style={s.btnText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={s.center}>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.muted}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  btn: { marginTop: 8, borderColor: colors.borderStrong, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 9 },
  btnText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
});
