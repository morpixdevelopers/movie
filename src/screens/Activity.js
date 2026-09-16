import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { C, S, F, shadow } from '../theme';
import { Btn } from '../ui';
import { useStore } from '../store';
import { activity, todo, ago, findUser } from '../logic';

const GLYPH = { rec: '♧', watching: '◉', finished: '✓', heart: '♥' };

export default function Activity({ onOpen, onAsk }) {
  const { state } = useStore();
  const items = activity(state);
  const waiting = todo(state);
  const me = findUser(state, state.meId);

  return (
    <ScrollView contentContainerStyle={st.page}>
      <Text style={st.eyebrow}>WHAT YOUR TASTE SET OFF</Text>
      <Text style={st.h1}>Activity</Text>
      <Text style={[F.small, { marginTop: S.sm }]}>
        Everything here happened because of something {me.name.split(' ')[0]} recommended or asked.
      </Text>

      {waiting.length > 0 && (
        <>
          <Text style={[F.h2, { marginTop: S.xl, marginBottom: S.sm }]}>Waiting on you</Text>
          {waiting.map((t) => (
            <Pressable key={t.id} onPress={() => onOpen(t.questionId)} style={st.todo}>
              <View style={{ flex: 1 }}>
                <Text style={st.todoText}>{t.text}</Text>
                <Text style={F.tiny}>{t.sub}</Text>
              </View>
              <Text style={st.arrow}>→</Text>
            </Pressable>
          ))}
        </>
      )}

      <Text style={[F.h2, { marginTop: S.xl, marginBottom: S.sm }]}>Recent</Text>
      {items.length === 0 ? (
        <View style={st.empty}>
          <Text style={F.h3}>Nothing yet.</Text>
          <Text style={[F.small, { marginTop: 6, textAlign: 'center' }]}>
            Recommend a movie, or ask a question. This fills up when your taste helps someone.
          </Text>
          <Btn title="Ask a question" onPress={onAsk} style={{ marginTop: S.lg }} />
        </View>
      ) : (
        items.map((a) => (
          <Pressable key={a.id} onPress={() => onOpen(a.questionId)} style={st.row}>
            <View style={[st.icon, a.kind === 'heart' && { backgroundColor: C.tint }]}>
              <Text style={[st.iconText, a.kind === 'heart' && { color: C.accent }]}>
                {GLYPH[a.kind]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.text}>{a.text}</Text>
              <Text style={F.tiny}>{ago(a.at)}</Text>
            </View>
          </Pressable>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { padding: S.lg, paddingTop: S.md },
  eyebrow: { color: C.accent, fontSize: 9, letterSpacing: 1.4, fontWeight: '800' },
  h1: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.9, marginTop: S.sm },
  todo: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.panel, borderLeftWidth: 3, borderLeftColor: C.accent,
    borderRadius: S.radiusSm, padding: S.lg, marginBottom: S.sm, ...shadow(1),
  },
  todoText: { fontSize: 13.5, fontWeight: '700', color: C.text, marginBottom: 3 },
  arrow: { color: C.accent, fontSize: 16 },
  row: {
    flexDirection: 'row', gap: S.md, alignItems: 'flex-start',
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  icon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: C.chip,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { color: C.muted, fontSize: 15 },
  text: { ...F.small, color: C.text, opacity: 0.9, marginBottom: 3 },
  empty: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 15,
    padding: S.xxl, alignItems: 'center',
  },
});
