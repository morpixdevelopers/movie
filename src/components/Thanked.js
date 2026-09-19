import React, { useEffect } from 'react';
import { Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
  runOnJS, Easing,
} from 'react-native-reanimated';
import { C, S, F } from '../theme';

/** One heart, one line, gone. */
export default function Thanked({ visible, movie, onDone }) {
  const veil = useSharedValue(0);
  const heart = useSharedValue(0);
  const copy = useSharedValue(0);

  useEffect(() => {
    if (!visible) { veil.value = 0; heart.value = 0; copy.value = 0; return; }

    veil.value = withTiming(1, { duration: 150 });
    heart.value = withSpring(1, { damping: 14, stiffness: 200 });
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
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heart.value }],
    opacity: heart.value,
  }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <Animated.Text style={[st.heart, heartStyle]}>♥</Animated.Text>
        <Animated.View style={copyStyle}>
          <Text style={st.text}>That one’s earned.</Text>
          <Text style={st.who}>
            Whoever put <Text style={st.movie}>{movie || 'it'}</Text> in front of you
            just got the credit.
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl,
  },
  heart: { fontSize: 64, color: C.accent, lineHeight: 72 },
  text: { ...F.h2, fontSize: 22, textAlign: 'center', marginTop: S.lg },
  movie: { color: C.accent, fontWeight: '700' },
  who: {
    ...F.small, textAlign: 'center', marginTop: S.sm,
    lineHeight: 20, paddingHorizontal: S.md,
  },
});
