import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay,
  withSequence, withRepeat, runOnJS, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, S, F, shadow, makeStyles } from '../theme';


/**
 * The moment after you ask. Order-confirmation style: rings push outward, the
 * badge lands with weight, the tick draws itself, then the copy arrives.
 * Auto-dismisses and hands control back so the thread opens straight after.
 */
export default function Posted({ visible, onDone }) {
  const badge = useSharedValue(0);
  const tick = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const copy = useSharedValue(0);
  const pill = useSharedValue(0);
  const veil = useSharedValue(0);

  // a tap and the timer can race — whoever gets here first wins
  const spent = useRef(false);
  const leave = () => {
    if (spent.current) return;
    spent.current = true;
    veil.value = withTiming(0, { duration: 260 }, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    });
  };

  useEffect(() => {
    if (!visible) {
      badge.value = 0; tick.value = 0; ring1.value = 0;
      ring2.value = 0; copy.value = 0; pill.value = 0; veil.value = 0;
      spent.current = false;
      return;
    }
    veil.value = withTiming(1, { duration: 200 });
    badge.value = withSpring(1, { damping: 11, stiffness: 170, mass: 0.8 });
    tick.value = withDelay(220, withSpring(1, { damping: 12, stiffness: 240 }));
    ring1.value = withDelay(120, withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false));
    ring2.value = withDelay(620, withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false));
    copy.value = withDelay(380, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    pill.value = withDelay(900, withTiming(1, { duration: 400 }));

    const t = setTimeout(leave, 5000);
    return () => clearTimeout(t);
  }, [visible]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badge.value }],
    opacity: badge.value,
  }));
  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tick.value }],
    opacity: tick.value,
  }));
  const r1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring1.value * 1.5 }],
    opacity: (1 - ring1.value) * 0.45,
  }));
  const r2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring2.value * 1.5 }],
    opacity: (1 - ring2.value) * 0.45,
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.value,
    transform: [{ translateY: (1 - copy.value) * 18 }],
  }));
  const pillStyle = useAnimatedStyle(() => ({ opacity: pill.value }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, veilStyle]}>
        <View style={st.stage}>
          <Animated.View style={[st.ring, r1]} />
          <Animated.View style={[st.ring, r2]} />

          <Animated.View style={[st.badge, shadow(3), badgeStyle]}>
            <LinearGradient
              colors={[C.gradA, C.gradB]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.Text style={[st.tick, tickStyle]}>✓</Animated.Text>
          </Animated.View>
        </View>

        <Animated.View style={[st.copy, copyStyle]}>
          <Text style={st.title}>Your question is live</Text>
          <Text style={st.sub}>
            People are seeing it now. We’ll nudge you the moment{'\n'}someone puts a movie forward.
          </Text>
          <Animated.View style={[st.pill, pillStyle]}>
            <Text style={st.pillText}>TAKING SUGGESTIONS UNTIL YOU PICK</Text>
          </Animated.View>
        </Animated.View>

        {/* last child, so it sits over the badge and copy and catches every tap */}
        <Pressable style={StyleSheet.absoluteFill} onPress={leave} />
      </Animated.View>
    </Modal>
  );
}

const BADGE = 108;
const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl,
  },
  stage: { width: BADGE, height: BADGE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: BADGE, height: BADGE, borderRadius: BADGE / 2,
    borderWidth: 2, borderColor: C.accent,
  },
  badge: {
    width: BADGE, height: BADGE, borderRadius: BADGE / 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  tick: { color: C.onAccent, fontSize: 52, fontWeight: '900', lineHeight: 58 },
  copy: { alignItems: 'center', marginTop: S.xxl },
  title: { ...F.display, fontSize: 27, textAlign: 'center' },
  sub: { ...F.small, textAlign: 'center', marginTop: S.md, lineHeight: 20 },
  pill: {
    marginTop: S.xl, backgroundColor: C.tint,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8,
  },
  pillText: { fontSize: 10, letterSpacing: 1.2, color: C.accent, fontWeight: '800' },
}));
