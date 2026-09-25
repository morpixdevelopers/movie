import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, Pressable, StyleSheet, TextInput,
  Keyboard, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C, S, F, makeStyles } from '../theme';
import { Btn } from '../ui';
import { useAuth } from '../auth';

/** Sign in or create an account. One screen, two modes. */
export default function Auth() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('in');   // 'in' | 'up'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Expo Go ignores the manifest's soft-input mode, so the inset is measured
  // here — the same fix the sheets use.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates?.height || 0));
    const b = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);

  const up = mode === 'up';

  const swap = () => {
    setMode(up ? 'in' : 'up');
    setError('');
    setPassword('');
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    Keyboard.dismiss();
    const res = up
      ? await signUp({ email, password, displayName: name })
      : await signIn({ email, password });
    // on success the provider swaps this screen out, so there is nothing to do
    if (res.error) { setError(res.error.message); setBusy(false); }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const res = await signInWithGoogle();
    if (res.error) { setError(res.error.message); setBusy(false); }
  };

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[st.page, { paddingBottom: kb + S.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(320)} style={st.brand}>
          <Image source={require('../../assets/logo-mark.png')} style={st.mark} />
          <Text style={st.brandText}>
            Movie<Text style={{ color: C.accent }}>Vouch</Text>
          </Text>
        </Animated.View>

        <Text style={st.h1}>
          {up ? 'Make it count.' : 'Welcome back.'}
        </Text>
        <Text style={st.sub}>
          {up
            ? 'Your name goes on every film you put forward. That is the whole point.'
            : 'Pick up where the people you trust left off.'}
        </Text>

        {up && (
          <>
            <Text style={st.lab}>YOUR NAME</Text>
            <TextInput
              style={st.input}
              value={name} onChangeText={setName}
              placeholder="What should people call you?"
              placeholderTextColor={C.dim}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </>
        )}

        <Text style={st.lab}>EMAIL</Text>
        <TextInput
          style={st.input}
          value={email} onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={C.dim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <Text style={st.lab}>PASSWORD</Text>
        <View style={st.passRow}>
          <TextInput
            style={[st.input, st.passInput]}
            value={password} onChangeText={setPassword}
            placeholder={up ? 'At least 4 characters' : 'Your password'}
            placeholderTextColor={C.dim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!show}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={8} style={st.reveal}>
            <Text style={st.revealText}>{show ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>

        {!!error && (
          <Animated.View entering={FadeInDown.duration(200)} style={st.error}>
            <Text style={st.errorText}>{error}</Text>
          </Animated.View>
        )}

        <Btn
          title={busy ? 'One moment…' : up ? 'Create account ↗' : 'Sign in ↗'}
          disabled={busy}
          style={{ marginTop: S.xl }}
          onPress={submit}
        />
        {busy && <ActivityIndicator color={C.accent} style={{ marginTop: S.md }} />}

        <View style={st.orRow}>
          <View style={st.rule} />
          <Text style={st.orText}>or</Text>
          <View style={st.rule} />
        </View>

        <Pressable
          onPress={google}
          disabled={busy}
          style={({ pressed }) => [st.google, pressed && { backgroundColor: C.chip }, busy && { opacity: 0.5 }]}
        >
          <Text style={st.googleG}>G</Text>
          <Text style={st.googleText}>Continue with Google</Text>
        </Pressable>

        <Pressable onPress={swap} style={st.swap} hitSlop={8}>
          <Text style={st.swapText}>
            {up ? 'Already have an account? ' : 'New here? '}
            <Text style={st.swapLink}>{up ? 'Sign in' : 'Create one'}</Text>
          </Text>
        </Pressable>

        {/* scaffolding: there is no backend yet, so one account is seeded */}
        <View style={st.demo}>
          <Text style={st.demoLab}>FOR TESTING</Text>
          <Text style={st.demoText}>admin@gmail.com  ·  admin</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  page: { padding: S.xl, paddingTop: S.xxxl, flexGrow: 1, justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: S.xxl },
  mark: { width: 34, height: 34 },
  brandText: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
  h1: { ...F.display, fontSize: 29 },
  sub: { ...F.small, marginTop: S.sm, lineHeight: 20 },
  lab: {
    fontSize: 9.5, letterSpacing: 1.4, color: C.muted, fontWeight: '800',
    marginTop: S.xl, marginBottom: S.sm,
  },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 15, minHeight: 50,
  },
  passRow: { justifyContent: 'center' },
  passInput: { paddingRight: 62 },
  reveal: { position: 'absolute', right: 12, paddingVertical: 6, paddingHorizontal: 4 },
  revealText: { color: C.accent, fontSize: 12.5, fontWeight: '800' },
  error: {
    marginTop: S.lg, padding: S.md, borderRadius: S.radiusSm,
    backgroundColor: C.tint, borderLeftWidth: 3, borderLeftColor: C.accentFill,
  },
  errorText: { ...F.small, color: C.text, lineHeight: 19 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.xl },
  rule: { flex: 1, height: 1, backgroundColor: C.line },
  orText: { ...F.tiny, color: C.dim },
  google: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: S.lg, minHeight: 50, borderRadius: S.radiusSm,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.panel,
  },
  googleG: { fontSize: 17, fontWeight: '900', color: C.accent },
  googleText: { fontSize: 15, fontWeight: '700', color: C.text },
  swap: { marginTop: S.xl, alignItems: 'center' },
  swapText: { ...F.small },
  swapLink: { color: C.accent, fontWeight: '800' },
  demo: {
    marginTop: S.xxxl, borderWidth: 1, borderStyle: 'dashed',
    borderColor: C.line, borderRadius: S.radiusSm, padding: S.md, alignItems: 'center',
  },
  demoLab: { fontSize: 9, letterSpacing: 1.4, color: C.dim, fontWeight: '800' },
  demoText: { ...F.small, color: C.text, marginTop: 4, fontWeight: '700' },
}));
