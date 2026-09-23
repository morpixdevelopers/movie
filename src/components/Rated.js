import React, { useEffect } from 'react';
import { Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
  runOnJS, interpolate, Extrapolation, Easing,
} from 'react-native-reanimated';
import { C, S, F, makeStyles } from '../theme';

/**
 * After you rate a film you finished. The face you picked lands, then the
 * pips fill up to your score one at a time — the point being that the number
 * is the thing travelling back to whoever recommended it.
 *
 * Presentational only: the face and label come from the sheet that raised it,
 * so the two can never disagree about what a 4 looks like.
 */
export default function Rated({ visible, rating, face, label, movie, backers = 0, onDone }) {
  const veil = useSharedValue(0);
  const pop = useSharedValue(0);
  const fill = useSharedValue(0);
  const copy = useSharedValue(0);

  useEffect(() => {
    if (!visible) { veil.value = 0; pop.value = 0; fill.value = 0; copy.value = 0; return; }

    veil.value = withTiming(1, { duration: 150 });
    pop.value = withSpring(1, { damping: 10, stiffness: 190, mass: 0.8 });
    fill.value = withDelay(260, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    copy.value = withDelay(420, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      veil.value = withTiming(0, { duration: 220 }, (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
      });
    }, 1900);
    return () => clearTimeout(timer);
  }, [visible]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const faceStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      { scale: 0.5 + pop.value * 0.5 },
      { translateY: (1 - pop.value) * 16 },
    ],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.value,
    transform: [{ translateY: (1 - copy.value) * 10 }],
  }));

  if (!visible || !Number.isFinite(rating)) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <Animated.Text style={[st.face, faceStyle]}>{face}</Animated.Text>

        <Animated.View style={[st.pips, copyStyle]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Pip key={i} index={i} on={i < rating} fill={fill} />
          ))}
        </Animated.View>

        <Animated.View style={copyStyle}>
          <Text style={st.title}>Thanks for rating.</Text>
          <Text style={st.sub}>
            {backers > 0
              ? `You gave ${movie} ${rating}/5 — ${label.toLowerCase()}. That counts for the ${backers} ${
                  backers === 1 ? 'person' : 'people'
                } who put it forward.`
              : `You gave ${movie} ${rating}/5 — ${label.toLowerCase()}. The next person will see what you thought.`}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** One notch of the score. Lit pips arrive in order, left to right. */
function Pip({ index, on, fill }) {
  const style = useAnimatedStyle(() => {
    if (!on) return { transform: [{ scale: 1 }] };
    const start = index * 0.16;
    const t = interpolate(fill.value, [start, start + 0.34], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ scale: 0.4 + t * 0.6 }], opacity: t };
  });
  return <Animated.View style={[st.pip, on && st.pipOn, style]} />;
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl,
  },
  face: { fontSize: 76, lineHeight: 92 },
  pips: { flexDirection: 'row', gap: 9, marginTop: S.md, marginBottom: S.xl },
  pip: {
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 1.5, borderColor: C.line, backgroundColor: 'transparent',
  },
  pipOn: { backgroundColor: C.accentFill, borderColor: C.accentFill },
  title: { ...F.h2, fontSize: 23, textAlign: 'center' },
  sub: {
    ...F.small, textAlign: 'center', marginTop: S.sm,
    lineHeight: 20, paddingHorizontal: S.md,
  },
}));
