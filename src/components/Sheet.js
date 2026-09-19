import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ScrollView, Dimensions, Platform, Keyboard,
} from 'react-native';
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
  // The sheet lives in a Modal, so App's layout can't lift it, and neither
  // useAnimatedKeyboard nor KeyboardAvoidingView report anything on Android
  // inside Expo Go (the window never resizes). Keyboard events always fire,
  // so measure the height there and pad the container by it.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

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
      <View style={[st.root, { paddingBottom: kb }]}>
        <Animated.View style={[StyleSheet.absoluteFill, st.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[st.card, { maxHeight: H * 0.92 - kb }, shadow(3), card]}>
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
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.line,
    alignSelf: 'center', marginTop: S.md, marginBottom: S.sm,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginBottom: S.sm },
  close: { padding: 2 },
});
