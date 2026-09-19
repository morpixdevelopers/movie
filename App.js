import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, StatusBar,
  Platform, ActivityIndicator, Modal, ScrollView, Keyboard,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
// RN's own SafeAreaView is iOS-only, and Android draws edge-to-edge from
// SDK 53 — this package gives real insets on both.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { C, S, F, shadow } from './src/theme';
import { StoreProvider, useStore } from './src/store';
import { Avatar } from './src/ui';
import { findUser } from './src/logic';
import Feed from './src/screens/Feed';
import Discover from './src/screens/Discover';
import Activity from './src/screens/Activity';
import AskSheet from './src/components/AskSheet';
import AskKind from './src/components/AskKind';
import Posted from './src/components/Posted';
import Collection from './src/screens/Collection';
import Profile from './src/screens/Profile';

function Shell() {
  const { state, run, toast, error } = useStore();
  const [tab, setTab] = useState('feed');
  const [qid, setQid] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [choosing, setChoosing] = useState(false);  // the ＋ fork
  const [asking, setAsking] = useState(null);       // 'open' | 'poll'
  const [posted, setPosted] = useState(null); // questionId awaiting the success moment
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (!state) {
    return (
      <View style={[st.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const me = findUser(state, state.meId);
  const openThread = (id) => { setQid(id); setTab('thread'); };

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={st.header}>
        <Pressable onPress={() => { setTab('feed'); setQid(null); }} style={st.brand}>
          <Text style={st.brandText}>mr</Text>
          <View style={st.brandDot} />
        </Pressable>
        <Pressable style={st.who} onPress={() => setSwitching(true)}>
          <Avatar name={me.name} size={24} />
          <Text style={st.whoText} numberOfLines={1}>{me.name}</Text>
          <Text style={{ color: C.muted, fontSize: 10 }}>▾</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingBottom: kb }}>
        {tab === 'feed' && (
          <Animated.View key='feed' style={{ flex: 1 }} entering={FadeIn.duration(220)}>
            <Feed onOpen={openThread} onAsk={() => setChoosing(true)} />
          </Animated.View>
        )}
        {tab === 'thread' && qid && (
          <Animated.View key={qid} style={{ flex: 1 }} entering={FadeIn.duration(220)}>
            <Collection questionId={qid} onBack={() => { setTab('feed'); setQid(null); }} />
          </Animated.View>
        )}
        {tab === 'discover' && (
          <Animated.View key='discover' style={{ flex: 1 }} entering={FadeIn.duration(220)}>
            <Discover onOpenProfile={() => setTab('profile')} />
          </Animated.View>
        )}
        {tab === 'activity' && (
          <Animated.View key='activity' style={{ flex: 1 }} entering={FadeIn.duration(220)}>
            <Activity onOpen={openThread} onAsk={() => setChoosing(true)} />
          </Animated.View>
        )}
        {tab === 'profile' && (
          <Animated.View key='profile' style={{ flex: 1 }} entering={FadeIn.duration(220)}>
            <Profile onOpen={openThread} />
          </Animated.View>
        )}
      </View>

      {!!(toast || error) && (
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(180)}
          exiting={FadeOut.duration(180)}
          style={[st.toast, error && { backgroundColor: C.accent }]}
        >
          <Text style={st.toastText}>{error || toast}</Text>
        </Animated.View>
      )}

      <View style={st.nav}>
        <NavBtn label="Home" glyph="⌂" on={tab === 'feed' || tab === 'thread'}
          onPress={() => { setTab('feed'); setQid(null); }} />
        <NavBtn label="Discover" glyph="◈" on={tab === 'discover'}
          onPress={() => { setTab('discover'); setQid(null); }} />
        <AskButton onPress={() => setChoosing(true)} />
        <NavBtn label="Activity" glyph="♡" on={tab === 'activity'}
          onPress={() => { setTab('activity'); setQid(null); }} />
        <NavBtn label="Profile" glyph="◎" on={tab === 'profile'}
          onPress={() => setTab('profile')} />
      </View>

      <AskKind
        visible={choosing}
        onClose={() => setChoosing(false)}
        onPick={(k) => { setChoosing(false); setTimeout(() => setAsking(k), 220); }}
      />

      <AskSheet
        visible={!!asking}
        kind={asking || 'open'}
        onClose={() => setAsking(null)}
        onPosted={(id) => setPosted(id)}
      />

      <Posted
        visible={!!posted}
        onDone={() => { const id = posted; setPosted(null); if (id) openThread(id); }}
      />

      <Modal visible={switching} transparent animationType="fade" onRequestClose={() => setSwitching(false)}>
        <Pressable style={st.overlay} onPress={() => setSwitching(false)}>
          <View style={st.picker}>
            <Text style={[F.label, { marginBottom: S.md }]}>ACT AS — FOR TESTING</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {state.users.map((u) => (
                <Pressable key={u.id} onPress={() => {
                  run({ type: 'switchUser', userId: u.id });
                  setSwitching(false);
                }} style={[st.pickRow, u.id === state.meId && { borderColor: C.accent }]}>
                  <Avatar name={u.name} size={28} />
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{u.name}</Text>
                  {u.id === state.meId && <Text style={{ color: C.accent, marginLeft: 'auto' }}>●</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function AskButton({ onPress }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={st.askWrap}>
      <Animated.View style={style}>
        <Pressable
          accessibilityLabel="Ask a question"
          onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 420 }); }}
          onPressOut={() => {
            scale.value = withSequence(
              withSpring(1.08, { damping: 10, stiffness: 400 }),
              withSpring(1, { damping: 14, stiffness: 300 }),
            );
          }}
          onPress={onPress}
          style={st.ask}
        >
          <Text style={st.askGlyph}>＋</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function NavBtn({ label, glyph, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={st.navBtn}>
      <Text style={[st.navGlyph, on && { color: C.accent }]}>{glyph}</Text>
      <Text style={[st.navLabel, on && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.xl, paddingTop: S.sm, paddingBottom: S.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandText: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -1.4 },
  brandDot: { width: 7, height: 7, borderRadius: 2, backgroundColor: C.accent },
  who: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: C.panel, borderWidth: 1, borderColor: C.line,
    borderRadius: 100, paddingLeft: 4, paddingRight: 12, paddingVertical: 4, maxWidth: 190,
    ...shadow(1),
  },
  whoText: { color: C.text, fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  nav: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.panel, paddingHorizontal: S.sm,
    borderTopWidth: 1, borderTopColor: C.lineSoft, ...shadow(2),
  },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: S.md, gap: 3 },
  askWrap: { width: 64, alignItems: 'center', justifyContent: 'center' },
  ask: {
    width: 50, height: 50, borderRadius: 17, backgroundColor: C.accent, ...shadow(2),
    alignItems: 'center', justifyContent: 'center',
  },
  askGlyph: { color: C.onAccent, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  navGlyph: { fontSize: 18, color: C.dim },
  navLabel: { fontSize: 9.5, color: C.dim, fontWeight: '800', letterSpacing: 0.4 },
  toast: {
    position: 'absolute', left: S.xl, right: S.xl, bottom: 92,
    backgroundColor: C.text, borderRadius: S.radiusSm, padding: S.lg, ...shadow(3),
  },
  toastText: { color: '#ffffff', fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', padding: S.xl },
  picker: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, padding: S.xl,
  },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    borderWidth: 1, borderColor: C.line, borderRadius: S.radiusSm,
    padding: S.md, marginBottom: S.sm, minHeight: 52,
  },
});
