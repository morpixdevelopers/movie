import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { C, S, F } from '../theme';
import { Avatar, Poster } from '../ui';
import { useStore } from '../store';
import { movieBoard, leaderboard, findUser } from '../logic';

const CINEMAS = ['Tamil', 'Malayalam', 'English'];

// Home lists questions. Discover pools MOVIES across every collection —
// the thing no single thread can show you.
export default function Discover({ onOpenProfile }) {
  const { state } = useStore();
  const [term, setTerm] = useState('');
  const [lang, setLang] = useState(null);

  const board = movieBoard(state, { lang, term });
  const people = leaderboard(state).slice(0, 5);
  const totalRecs = state.recommendations.length;
  const totalWatches = state.journeys.length;

  return (
    <ScrollView contentContainerStyle={st.page} keyboardShouldPersistTaps="handled">
      <Text style={st.eyebrow}>ACROSS EVERY COLLECTION</Text>
      <Text style={st.h1}>What people{'\n'}actually recommend.</Text>
      <Text style={[F.small, { marginTop: S.sm }]}>
        Not one thread — every movie anyone has vouched for, ranked by how many different people
        put their name to it.
      </Text>

      <View style={st.totals}>
        <Total n={board.length} label="movies vouched for" />
        <Total n={totalRecs} label="recommendations" />
        <Total n={totalWatches} label="viewer choices" />
      </View>

      <TextInput
        style={st.input}
        placeholder="Search a movie…"
        placeholderTextColor={C.dim}
        value={term} onChangeText={setTerm}
      />

      <Text style={st.lab}>YOUR CINEMAS</Text>
      <View style={st.chips}>
        <Pressable onPress={() => setLang(null)} style={[st.chip, !lang && st.chipOn]}>
          <Text style={[st.chipText, !lang && { color: C.onAccent }]}>All</Text>
        </Pressable>
        {CINEMAS.map((l) => (
          <Pressable key={l} onPress={() => setLang(lang === l ? null : l)}
            style={[st.chip, lang === l && st.chipOn]}>
            <Text style={[st.chipText, lang === l && { color: C.onAccent }]}>• {l} cinema</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[F.h2, { marginTop: S.xl }]}>Most recommended</Text>
      <Text style={[F.tiny, { marginBottom: S.md }]}>
        Ranked by unique recommenders, pooled across all collections.
      </Text>

      {board.length === 0 ? (
        <View style={st.empty}>
          <Text style={F.small}>Nothing matches that yet.</Text>
        </View>
      ) : board.map((row, i) => (
        <View key={row.movieId} style={st.row}>
          <Text style={st.rank}>{String(i + 1).padStart(2, '0')}</Text>
          <Poster movie={row.movie} style={st.thumb} width={200} />
          <View style={{ flex: 1 }}>
            <Text style={st.title} numberOfLines={1}>{row.movie.title}</Text>
            <Text style={F.tiny}>
              {row.movie.year} · {row.movie.language} · {row.movie.runtime} min
            </Text>
            <Text style={st.meta}>
              ♧ {row.recommenders} {row.recommenders === 1 ? 'person' : 'people'}
              {row.collections > 1 ? ` · ${row.collections} collections` : ''}
              {row.watched > 0 ? ` · ${row.watched} watched` : ''}
            </Text>
          </View>
          <Text style={st.rating}>{row.rating ? `★ ${row.rating}` : '—'}</Text>
        </View>
      ))}

      <Text style={[F.h2, { marginTop: S.xxl }]}>Trusted recommenders</Text>
      <Text style={[F.tiny, { marginBottom: S.md }]}>
        Hearts are only earned when someone watched the movie and said it helped.
      </Text>
      {people.map((p, i) => (
        <Pressable key={p.user.id} onPress={onOpenProfile} style={st.person}>
          <Text style={st.rank}>{String(i + 1).padStart(2, '0')}</Text>
          <Avatar name={p.user.name} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={st.title}>
              {p.user.name}{p.user.id === state.meId ? '  · you' : ''}
            </Text>
            <Text style={F.tiny}>
              {p.recommended} rec{p.recommended === 1 ? '' : 's'} · {p.watches} watched
              {p.avg !== null ? ` · ★ ${p.avg}` : ''}
            </Text>
          </View>
          <Text style={st.rating}>♥ {p.hearts}</Text>
        </Pressable>
      ))}

      <View style={st.note}>
        <Text style={st.noteStrong}>One question.{'\n'}Many good movie nights.</Text>
        <Text style={[F.tiny, { marginTop: 6 }]}>Built by people. Better with time.</Text>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const Total = ({ n, label }) => (
  <View style={{ flex: 1 }}>
    <Text style={st.totalN}>{n}</Text>
    <Text style={st.totalL}>{label}</Text>
  </View>
);

const st = StyleSheet.create({
  page: { padding: S.lg, paddingTop: S.md },
  eyebrow: { color: C.accent, fontSize: 9, letterSpacing: 1.4, fontWeight: '800' },
  h1: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.9, lineHeight: 33, marginTop: S.sm },
  totals: {
    flexDirection: 'row', gap: S.md, marginVertical: S.xl,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: S.lg,
  },
  totalN: { fontSize: 22, fontWeight: '800', color: C.text },
  totalL: { fontSize: 9.5, color: C.muted, marginTop: 3, lineHeight: 13 },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 14, minHeight: 48,
  },
  lab: { fontSize: 9.5, letterSpacing: 1.4, color: C.muted, fontWeight: '800', marginTop: S.xl, marginBottom: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 100, backgroundColor: C.chip, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.accent },
  chipText: { fontSize: 11.5, color: C.muted, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  rank: { width: 22, fontSize: 12, fontWeight: '800', color: C.accent },
  thumb: { width: 46, height: 64 },
  title: { fontSize: 13.5, fontWeight: '700', color: C.text },
  meta: { fontSize: 10.5, color: C.accent, marginTop: 3 },
  rating: { fontSize: 12, color: C.amber, fontWeight: '700' },
  person: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  empty: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 15,
    padding: S.xxl, alignItems: 'center',
  },
  note: {
    marginTop: S.xxl, borderWidth: 1, borderColor: C.line,
    borderRadius: 14, padding: S.lg,
  },
  noteStrong: { color: C.text, fontWeight: '700', fontSize: 13, lineHeight: 20 },
});
