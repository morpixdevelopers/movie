import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
  runOnJS, Easing,
} from 'react-native-reanimated';
import { C, S, F } from '../theme';

/**
 * After voting in a poll. Deliberately quieter than the recommend and heart
 * moments — you've had your say, and the decision isn't yours.
 */
export default function Voted({ visible, movie, asker, onDone }) {
  const veil = useSharedValue(0);
  const ring = useSharedValue(0);
  const copy = useSharedValue(0);

  useEffect(() => {
    if (!visible) { veil.value = 0; ring.value = 0; copy.value = 0; return; }

    veil.value = withTiming(1, { duration: 150 });
    ring.value = withSpring(1, { damping: 14, stiffness: 210 });
    copy.value = withDelay(140, withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      veil.value = withTiming(0, { duration: 200 }, (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
      });
    }, 1300);
    return () => clearTimeout(timer);
  }, [visible]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: ring.value,
  }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <Animated.View style={[st.ring, ringStyle]}>
          <Text style={st.tick}>✓</Text>
        </Animated.View>

        <Animated.View style={copyStyle}>
          <Text style={st.title}>Locked in.</Text>
          <Text style={st.sub}>
            You picked <Text style={st.movie}>{movie || 'it'}</Text>.
            {asker ? ` ${asker} decides from here.` : ' The asker decides from here.'}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const RING = 92;
const st = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl,
  },
  ring: {
    width: RING, height: RING, borderRadius: RING / 2,
    borderWidth: 3, borderColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  tick: { color: C.accent, fontSize: 42, fontWeight: '900', lineHeight: 48 },
  title: { ...F.h2, fontSize: 22, textAlign: 'center', marginTop: S.lg },
  sub: {
    ...F.small, textAlign: 'center', marginTop: S.sm,
    lineHeight: 20, paddingHorizontal: S.md,
  },
  movie: { color: C.accent, fontWeight: '700' },
});
