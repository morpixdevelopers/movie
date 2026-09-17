import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { C, S, F, shadow } from '../theme';

const H = Dimensions.get('window').height;

// One bottom sheet for every modal in the app: the backdrop fades while the
// card springs up, and closing reverses it before the Modal unmounts — so it
// never snaps away the way RN's animationType="slide" does.
export default function Sheet({ visible, onClose, title, children }) {
  const y = useSharedValue(H);
  const fade = useSharedValue(0);
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      fade.value = withTiming(1, { duration: 180 });
      y.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 160 });
      y.value = withTiming(H, { duration: 220 }, (finished) => {
        'worklet';
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.root}>
        <Animated.View style={[StyleSheet.absoluteFill, st.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[st.card, shadow(3), card]}>
          <View style={st.grabber} />
          {!!title && (
            <View style={st.head}>
              <Text style={[F.h1, { flex: 1, fontSize: 23 }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={14} style={st.close}>
                <Text style={{ color: C.muted, fontSize: 19 }}>✕</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 36 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: C.overlay },
  card: {
    backgroundColor: C.sheet,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: S.xl, paddingBottom: S.sm,
    maxHeight: '92%',
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.line,
    alignSelf: 'center', marginTop: S.md, marginBottom: S.sm,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginBottom: S.sm },
  close: { padding: 2 },
});
