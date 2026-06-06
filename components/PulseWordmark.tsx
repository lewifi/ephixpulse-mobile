import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { colors, fonts } from '../theme/colors';

// The breathing/glowing wordmark — same pulse as the splash, reusable in the header.
export function PulseWordmark({ size = 26 }: { size?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.68 + 0.32 * t.value,
    transform: [{ scale: 0.994 + 0.006 * t.value }],
  }));
  return (
    <Animated.Text style={[s.word, { fontSize: size }, style]}>
      EPHIX <Text style={s.accent}>PULSE</Text>
    </Animated.Text>
  );
}

const s = StyleSheet.create({
  word: {
    fontFamily: fonts.display,
    color: colors.text,
    letterSpacing: 2,
    textShadowColor: 'rgba(33,150,243,0.7)',
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  accent: { color: colors.accent },
});
