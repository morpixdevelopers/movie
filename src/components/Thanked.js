import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
  withRepeat, withSequence, runOnJS, Easing, interpolate,
} from 'react-native-reanimated';
import { C, S, F } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

/**
 * The moment after you thank someone. Deliberately unlike the post-a-question
 * screen: no badge, no tick, no rings — instead the hearts you just gave lift
 * off and drift away, and a single heart beats where they came from.
 */
function Rising({ index, total }) {
  const t = useSharedValue(0);
  // spread them across the lower half, bigger ones nearer the middle
  const startX = (index / Math.max(1, total - 1)) * (W * 0.7) - W * 0.35;
  const drift = (index % 2 ? 1 : -1) * (18 + (index * 13) % 46);
  const size = 16 + ((index * 7) % 22);
  const spin = (index % 2 ? 1 : -1) * (8 + (index * 5) % 18);

  useEffect(() => {
    t.value = withDelay(
      index * 110,
      withTiming(1, { duration: 1900 + (index % 3) * 260, easing: Easing.out(Easing.quad) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + interpolate(t.value, [0, 0.5, 1], [0, drift, drift * 0.4]) },
      { translateY: interpolate(t.value, [0, 1], [0, -H * 0.55]) },
      { scale: interpolate(t.value, [0, 0.18, 0.85, 1], [0.3, 1, 1, 0.75]) },
      { rotate: `${interpolate(t.value, [0, 1], [0, spin])}deg` },
    ],
    opacity: interpolate(t.value, [0, 0.12, 0.72, 1], [0, 1, 1, 0]),
  }));

  return <Animated.Text style={[st.rise, { fontSize: size }, style]}>♥</Animated.Text>;
}

export default function Thanked({ visible, names = [], onDone }) {
  const veil = useSharedValue(0);
  const beat = useSharedValue(0);
  const copy = useSharedValue(0);
  const count = Math.max(names.length, 1);
  const flock = Math.min(12, Math.max(6, count * 3));

  useEffect(() => {
    if (!visible) { veil.value = 0; beat.value = 0; copy.value = 0; return; }

    veil.value = withTiming(1, { duration: 180 });
    beat.value = withSpring(1, { damping: 10, stiffness: 190 });
    // a slow double-thump, like a pulse
    beat.value = withDelay(260, withRepeat(
      withSequence(
        withTiming(1.14, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180 }),
        withTiming(1.09, { duration: 150 }),
        withTiming(1, { duration: 420 }),
      ), -1, false));
    copy.value = withDelay(420, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      veil.value = withTiming(0, { duration: 280 }, (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
      });
    }, 2400);
    return () => clearTimeout(timer);
  }, [visible]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.value,
    transform: [{ translateY: (1 - copy.value) * 14 }],
  }));

  if (!visible) return null;

  const who = names.length === 0 ? 'They'
    : names.length === 1 ? names[0]
    : names.length === 2 ? `${names[0]} and ${names[1]}`
    : `${names[0]}, ${names[1]} and ${names.length - 2} more`;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <View style={st.field} pointerEvents="none">
          {Array.from({ length: flock }).map((_, i) => (
            <Rising key={i} index={i} total={flock} />
          ))}
        </View>

        <Animated.Text style={[st.big, beatStyle]}>♥</Animated.Text>

        <Animated.View style={[st.copy, copyStyle]}>
          <Text style={st.title}>
            {who} {names.length === 1 ? 'knows' : 'know'}{'\n'}they helped.
          </Text>
          <Text style={st.sub}>
            {names.length === 1 ? 'That heart is' : 'Those hearts are'} on their record now — earned,
            not given away.
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
  field: {
    position: 'absolute', left: 0, right: 0, bottom: H * 0.22,
    alignItems: 'center', justifyContent: 'center', height: 1,
  },
  rise: { position: 'absolute', color: C.accent },
  big: { fontSize: 76, color: C.accent, lineHeight: 84 },
  copy: { alignItems: 'center', marginTop: S.xl },
  title: { ...F.display, fontSize: 26, textAlign: 'center', lineHeight: 32 },
  sub: { ...F.small, textAlign: 'center', marginTop: S.md, lineHeight: 20 },
});
