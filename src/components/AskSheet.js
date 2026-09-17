import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Sheet from './Sheet';
import { C, S, F } from '../theme';
import { Btn } from '../ui';
import { useStore } from '../store';
import { LANGS, GENRES } from '../seed';
import { ASK_MIN } from '../logic';

// Lives at the app shell so the + in the bottom nav can open it from any tab.
export default function AskSheet({ visible, onClose, onPosted }) {
  const { run } = useStore();
  const [text, setText] = useState('');
  const [lang, setLang] = useState('Tamil');
  const [genre, setGenre] = useState('Thriller');
  const [extra, setExtra] = useState('');
  const ready = text.trim().length >= ASK_MIN;

  const post = () => {
    const res = run({ type: 'ask', text, lang, genre, constraints: extra });
    if (res.questionId) {
      setText(''); setExtra('');
      onClose();
      onPosted?.(res.questionId);
    }
  };

  // each field drifts in just after the sheet lands, so it assembles itself
  const step = (i) => FadeInDown.delay(70 + i * 45).duration(280);

  return (
    <Sheet visible={visible} onClose={onClose} title="What are you in the mood for?">
      <Animated.View entering={FadeIn.delay(80)}>
        <Text style={F.small}>A good question can help more than one movie night.</Text>
      </Animated.View>

      <Animated.View entering={step(0)}>
          <Text style={st.lab}>What are you looking for?</Text>
          <TextInput
            style={[st.input, { height: 90, textAlignVertical: 'top' }]}
            multiline maxLength={240}
            placeholder="Suggest me a Tamil thriller that keeps me guessing…"
            placeholderTextColor={C.dim}
            value={text} onChangeText={setText}
          />
          <Text style={[st.hint, ready && { color: C.accent }]}>
            {ready
              ? `Good — ${text.trim().length}/240 characters.`
              : `${text.trim().length} of ${ASK_MIN} characters minimum — say what mood you are in.`}
          </Text>
      </Animated.View>

      <Animated.View entering={step(1)}>
          <Text style={st.lab}>Cinema</Text>
          <View style={st.opts}>
            {LANGS.map((l) => (
              <Pressable key={l} onPress={() => setLang(l)} style={[st.opt, lang === l && st.optOn]}>
                <Text style={[st.optText, lang === l && { color: C.onAccent }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

      </Animated.View>

      <Animated.View entering={step(2)}>
          <Text style={st.lab}>Genre</Text>
          <View style={st.opts}>
            {GENRES.map((g) => (
              <Pressable key={g} onPress={() => setGenre(g)} style={[st.opt, genre === g && st.optOn]}>
                <Text style={[st.optText, genre === g && { color: C.onAccent }]}>{g}</Text>
              </Pressable>
            ))}
          </View>

      </Animated.View>

      <Animated.View entering={step(3)}>
          <Text style={st.lab}>Anything else? · optional</Text>
          <TextInput
            style={st.input} maxLength={160}
            placeholder="After 2015 · Under 2 hours · No horror"
            placeholderTextColor={C.dim}
            value={extra} onChangeText={setExtra}
          />

      </Animated.View>

      <Animated.View entering={step(4)}>
          <View style={st.notice}>
            <Text style={st.noticeText}>
              When you choose a movie, suggestions close. The collection stays useful for everyone
              who comes after you.
            </Text>
          </View>

          <Btn title="Ask the community ↗" onPress={post} />
      </Animated.View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  lab: { fontSize: 12, fontWeight: '600', color: C.text, marginTop: S.lg, marginBottom: S.sm },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 14, minHeight: 48,
  },
  hint: { fontSize: 10.5, color: C.dim, marginTop: S.sm, lineHeight: 15 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: {
    backgroundColor: C.chip, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: 'center',
  },
  optOn: { backgroundColor: C.accent, borderColor: C.accent },
  optText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  notice: {
    backgroundColor: C.tint, borderWidth: 1, borderColor: C.tintLine,
    borderRadius: 10, padding: 13, marginVertical: S.lg,
  },
  noticeText: { fontSize: 12, color: C.text, opacity: 0.9, lineHeight: 19 },
});
