import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const glow = require('../assets/splash-glow.png');
const word = require('../assets/splash-icon.png');

export function BootSplash({ visible, onHidden }: { visible: boolean; onHidden: () => void }) {
  const pulse = useSharedValue(0);
  // Start fully opaque. Fading in meant this sat transparent for ~320ms while the
  // native splash had already been torn down, showing the bare window (white)
  // underneath. Both backgrounds are colors.bg, so a hard swap is invisible anyway.
  const fade = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  useEffect(() => {
    if (!visible) {
      fade.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.ease) }, (done) => {
        if (done) runOnJS(onHidden)();
      });
    }
  }, [visible]);

  const root = useAnimatedStyle(() => ({ opacity: fade.value }));
  const halo = useAnimatedStyle(() => ({
    opacity: (0.3 + 0.5 * pulse.value) * fade.value,
    transform: [{ scale: 0.9 + 0.2 * pulse.value }],
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: 0.72 + 0.28 * pulse.value,
    transform: [{ scale: 0.992 + 0.008 * pulse.value }],
  }));

  return (
    <Animated.View style={[s.fill, root]} pointerEvents="none">
      <Animated.Image source={glow} style={[s.glow, halo]} resizeMode="contain" />
      <Animated.Image source={word} style={[s.word, mark]} resizeMode="contain" />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  fill: {
    // Written out rather than spreading StyleSheet.absoluteFillObject: identical
    // at runtime, but current RN types no longer declare that property.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glow: { position: 'absolute', width: 560, height: 320 },
  word: { width: 300, height: 100 },
});
