import React, { useEffect } from 'react';
import { Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
  runOnJS, Easing,
} from 'react-native-reanimated';
import { C, S, F, shadow } from '../theme';
import { Poster } from '../ui';

const APoster = Animated.createAnimatedComponent(Animated.View);

/** The poster lands on the pile. One card, one line, gone. */
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function Recommended({ visible, movie, count = 1, joined, asker, onDone }) {
  const veil = useSharedValue(0);
  const card = useSharedValue(0);
  const copy = useSharedValue(0);

  useEffect(() => {
    if (!visible) { veil.value = 0; card.value = 0; copy.value = 0; return; }

    veil.value = withTiming(1, { duration: 150 });
    card.value = withSpring(1, { damping: 13, stiffness: 180, mass: 0.9 });
    copy.value = withDelay(180, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      veil.value = withTiming(0, { duration: 200 }, (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [visible]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  // drops in from below, settles out of a slight tilt
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [
      { translateY: (1 - card.value) * 70 },
      { scale: 0.86 + card.value * 0.14 },
      { rotate: `${(1 - card.value) * -7}deg` },
    ],
  }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value }));

  if (!visible || !movie) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <APoster style={[st.card, shadow(3), cardStyle]}>
          <Poster movie={movie} style={st.poster} width={400} />
        </APoster>

        <Animated.View style={copyStyle}>
          <Text style={st.title}>Thanks for the{'\n'}recommendation.</Text>
          <Text style={st.sub}>
            {joined
              ? `You’re the ${ordinal(count)} to back ${movie.title}. If it lands, the heart is yours.`
              : asker
                ? `If ${asker} watches ${movie.title} and loves it, that comes back to you as a heart.`
                : `If someone watches ${movie.title} and loves it, that comes back to you as a heart.`}
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
  card: { borderRadius: S.radiusSm, overflow: 'hidden' },
  poster: { width: 150, height: 214 },
  title: { ...F.h2, fontSize: 21, textAlign: 'center', marginTop: S.xl, lineHeight: 29 },
  name: { color: C.accent },
  sub: { ...F.small, textAlign: 'center', marginTop: S.sm },
});
