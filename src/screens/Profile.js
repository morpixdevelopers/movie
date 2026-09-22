import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { C, S, F, makeStyles, useTheme } from '../theme';
import { Avatar, Rule, Stat, Btn, Poster, SectionHead } from '../ui';
import { useStore } from '../store';
import {
  recommenderScore, myRecommendations, myWatched, findUser, ago,
} from '../logic';

export default function Profile({ onOpen }) {
  const { state, reset } = useStore();
  const { mode, resolved, setMode } = useTheme();
  const me = findUser(state, state.meId);
  const score = recommenderScore(state, state.meId);
  const mine = myRecommendations(state, state.meId);
  const watched = myWatched(state, state.meId);

  return (
    <ScrollView contentContainerStyle={st.page} showsVerticalScrollIndicator={false}>
      <View style={st.head}>
        <Avatar name={me.name} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={F.h1}>{me.name}</Text>
          <Text style={F.small}>
            {score.avg !== null
              ? `★ ${score.avg} average from ${score.ratings} rating${score.ratings === 1 ? '' : 's'}`
              : 'No ratings on your recommendations yet'}
          </Text>
        </View>
      </View>

      <Rule style={{ marginVertical: S.xl }} />

      <View style={st.stats}>
        <Stat value={score.recommended} caption="Recommendations given" />
        <Stat value={score.watches} caption="Watched on your word" />
        <Stat value={score.avg !== null ? `★ ${score.avg}` : '—'} caption="Average rating" accent={score.avg !== null} />
      </View>
      <View style={[st.stats, { marginTop: S.lg }]}>
        <Stat value={score.ratings} caption="Ratings you earned" accent={score.ratings > 0} />
        <Stat value={watched.length} caption="Movies you finished" />
        <Stat value="" caption="" />
      </View>

      <Rule style={{ marginVertical: S.xl }} />

      <SectionHead
        title="Your recommendations"
        sub="How each one actually landed"
      />
      {mine.length === 0 ? (
        <Text style={F.small}>
          You haven’t recommended anything yet. Open a question and put a movie forward.
        </Text>
      ) : (
        mine.map((r) => (
          <Pressable key={r.id} onPress={() => onOpen?.(r.questionId)} style={st.row}>
            <Poster movie={r.movie} style={st.thumb} width={200} />
            <View style={{ flex: 1 }}>
              <View style={st.titleRow}>
                <Text style={st.name} numberOfLines={1}>{r.movie.title}</Text>
                {r.isPick && <Text style={st.picked}>ASKER’S PICK</Text>}
              </View>
              <Text style={F.tiny} numberOfLines={1}>{r.question}</Text>
              <Text style={st.outcome}>
                {r.watched === 0
                  ? 'Nobody has watched it yet'
                  : `${r.watched} watched · ${r.finished} finished${r.rating ? ` · ★ ${r.rating}` : ''}`}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <Rule style={{ marginVertical: S.xl }} />

      <SectionHead title="What you watched" sub="Your own verdicts" />
      {watched.length === 0 ? (
        <Text style={F.small}>
          Nothing finished yet. Pick a movie from a closed collection and rate it afterwards.
        </Text>
      ) : (
        watched.map((w) => (
          <Pressable key={w.id} onPress={() => onOpen?.(w.questionId)} style={st.row}>
            <Poster movie={w.movie} style={st.thumb} width={200} />
            <View style={{ flex: 1 }}>
              <Text style={st.name} numberOfLines={1}>{w.movie.title}</Text>
              <Text style={F.tiny}>{ago(w.at)}</Text>
              {!!w.text && (
                <Text style={st.quote} numberOfLines={2}>“{w.text}”</Text>
              )}
            </View>
            <Text style={st.rating}>★ {w.rating}</Text>
          </Pressable>
        ))
      )}

      <SectionHead title="Appearance" sub="How the app looks" style={{ marginTop: S.xxl }} />
      <View style={st.modes}>
        {[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([id, label]) => {
          const on = mode === id;
          return (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [st.mode, on && st.modeOn, pressed && !on && { backgroundColor: C.chip }]}
            >
              <Text style={[st.modeText, on && { color: C.onAccent }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[F.tiny, { marginTop: S.sm }]}>
        {mode === 'auto'
          ? `Following your phone — ${resolved} right now.`
          : `Always ${mode}, whatever your phone is set to.`}
      </Text>

      <Btn kind="ghost" title="Reset to the seeded scenario" onPress={reset} style={{ marginTop: S.xxl }} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  modes: {
    flexDirection: 'row', gap: S.sm, marginTop: S.md,
  },
  mode: {
    flex: 1, minHeight: 44, borderRadius: S.radiusSm,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.panel,
    alignItems: 'center', justifyContent: 'center',
  },
  modeOn: { backgroundColor: C.accentFill, borderColor: C.accentFill },
  modeText: { fontSize: 13.5, fontWeight: '700', color: C.text },
  page: { padding: S.xl, paddingTop: S.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  stats: { flexDirection: 'row', gap: S.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  thumb: { width: 44, height: 62 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 14, fontWeight: '800', color: C.text, flexShrink: 1 },
  picked: { fontSize: 8, fontWeight: '800', color: C.accent, letterSpacing: 0.6 },
  outcome: { fontSize: 11.5, color: C.accent, marginTop: 3, fontWeight: '700' },
  quote: { fontSize: 11.5, color: C.muted, marginTop: 3, fontStyle: 'italic' },
  rating: { fontSize: 13, color: C.amber, fontWeight: '800' },
}));
