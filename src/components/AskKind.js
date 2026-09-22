import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Sheet from './Sheet';
import { C, S, F, shadow, makeStyles } from '../theme';

const CHOICES = [
  {
    id: 'open',
    glyph: '✳',
    name: 'Suggest me something',
    sub: 'You describe the mood. People put forward any movie they like.',
    example: '“Suggest me some Tamil thriller movies”',
  },
  {
    id: 'poll',
    glyph: '◉',
    name: 'Pick from my list',
    sub: 'You already have a few in mind. People vote for one.',
    example: '“Which of these three should I watch tonight?”',
  },
];

/** The fork you hit straight after ＋ — two genuinely different questions. */
export default function AskKind({ visible, onClose, onPick }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="What kind of question?">
      {CHOICES.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onPick(c.id)}
          style={({ pressed }) => [st.card, shadow(1), pressed && st.pressed]}
        >
          <View style={st.head}>
            <View style={st.glyphWrap}><Text style={st.glyph}>{c.glyph}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{c.name}</Text>
              <Text style={st.sub}>{c.sub}</Text>
            </View>
            <Text style={st.chev}>→</Text>
          </View>
          <Text style={st.example}>{c.example}</Text>
        </Pressable>
      ))}
      <View style={{ height: S.md }} />
    </Sheet>
  );
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  card: {
    backgroundColor: C.panel, borderRadius: S.radius,
    padding: S.lg, marginTop: S.md,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  glyphWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.tint,
    alignItems: 'center', justifyContent: 'center',
  },
  glyph: { color: C.accent, fontSize: 18 },
  name: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sub: { ...F.small, marginTop: 3 },
  chev: { color: C.accent, fontSize: 17, fontWeight: '700' },
  example: {
    ...F.tiny, color: C.dim, fontStyle: 'italic',
    marginTop: S.md, paddingTop: S.md,
    borderTopWidth: 1, borderTopColor: C.lineSoft,
  },
}));
