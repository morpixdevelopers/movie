import React, { useEffect } from 'react';
import { Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
  runOnJS, Easing,
} from 'react-native-reanimated';
import { C, S, F, shadow, makeStyles } from '../theme';
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
  const pile = useSharedValue(0);   // the cards already on the stack
  const badge = useSharedValue(0);  // the new backer count

  useEffect(() => {
    if (!visible) {
      veil.value = 0; card.value = 0; copy.value = 0;
      pile.value = 0; badge.value = 0;
      return;
    }

    veil.value = withTiming(1, { duration: 150 });
    // backing a film someone already put up: the stack fans out first, so the
    // card visibly lands ON something rather than arriving alone
    if (joined) {
      pile.value = withSpring(1, { damping: 15, stiffness: 150 });
      card.value = withDelay(140, withSpring(1, { damping: 13, stiffness: 180, mass: 0.9 }));
      badge.value = withDelay(520, withSpring(1, { damping: 9, stiffness: 260 }));
    } else {
      card.value = withSpring(1, { damping: 13, stiffness: 180, mass: 0.9 });
    }
    copy.value = withDelay(joined ? 340 : 180, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      veil.value = withTiming(0, { duration: 200 }, (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
      });
    }, joined ? 1900 : 1500);
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
  // Two ghost cards fanning out behind, one per side. Written out twice on
  // purpose — a shared helper here would be a plain JS function called from
  // inside a worklet, which fails on the UI thread.
  const leftStyle = useAnimatedStyle(() => ({
    opacity: pile.value * 0.55,
    transform: [
      { translateX: pile.value * -26 },
      { translateY: pile.value * -6 },
      { rotate: `${pile.value * -7}deg` },
      { scale: 0.9 + pile.value * 0.06 },
    ],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: pile.value * 0.55,
    transform: [
      { translateX: pile.value * 26 },
      { translateY: pile.value * -6 },
      { rotate: `${pile.value * 7}deg` },
      { scale: 0.9 + pile.value * 0.06 },
    ],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [{ scale: badge.value }],
  }));

  if (!visible || !movie) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <Animated.View style={st.stage}>
          {joined && (
            <>
              <Animated.View style={[st.ghost, leftStyle]} />
              <Animated.View style={[st.ghost, rightStyle]} />
            </>
          )}

          <APoster style={[st.card, shadow(3), cardStyle]}>
            <Poster movie={movie} style={st.poster} width={400} />
          </APoster>

          {joined && (
            <Animated.View style={[st.badge, shadow(2), badgeStyle]}>
              <Text style={st.badgeText}>{count}</Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View style={copyStyle}>
          <Text style={st.title}>
            {joined ? `That makes ${count}.` : 'Thanks for the\nrecommendation.'}
          </Text>
          <Text style={st.sub}>
            {joined
              ? `You’re the ${ordinal(count)} to back ${movie.title}. How they rate it lands on your name.`
              : asker
                ? `If ${asker} watches ${movie.title}, the rating they give it comes back to you.`
                : `If someone watches ${movie.title}, the rating they give it comes back to you.`}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl,
  },
  stage: { alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: S.radiusSm, overflow: 'hidden' },
  poster: { width: 150, height: 214 },
  ghost: {
    position: 'absolute', width: 150, height: 214,
    borderRadius: S.radiusSm, backgroundColor: C.panelHi,
    borderWidth: 1, borderColor: C.line,
  },
  badge: {
    position: 'absolute', bottom: -12, right: -10,
    minWidth: 38, height: 38, borderRadius: 19, paddingHorizontal: 8,
    backgroundColor: C.accentFill, borderWidth: 3, borderColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: C.onAccent, fontSize: 16, fontWeight: '900' },
  title: { ...F.h2, fontSize: 21, textAlign: 'center', marginTop: S.xl, lineHeight: 29 },
  name: { color: C.accent },
  sub: { ...F.small, textAlign: 'center', marginTop: S.sm },
}));
