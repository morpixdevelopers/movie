import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { C, S, F } from '../theme';
import { Avatar, Label, Rule, Stat, Btn } from '../ui';
import { useStore } from '../store';
import { recommenderScore, leaderboard, findUser } from '../logic';

export default function Profile() {
  const { state, reset } = useStore();
  const me = findUser(state, state.meId);
  const score = recommenderScore(state, state.meId);
  const board = leaderboard(state);
  const finished = state.journeys.filter(
    (j) => j.userId === state.meId && j.status === 'finished'
  ).length;

  return (
    <ScrollView contentContainerStyle={st.page}>
      <View style={st.head}>
        <Avatar name={me.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={F.h2}>{me.name}</Text>
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
        <Stat value={score.hearts} caption="Helpful hearts" accent={score.hearts > 0} />
        <Stat value={finished} caption="Movies you finished" />
        <Stat value="" caption="" />
      </View>

      <Rule style={{ marginVertical: S.xl }} />

      <Label style={{ color: C.accent }}>Reputation</Label>
      <Text style={[F.h2, { marginTop: S.sm }]}>Top recommenders</Text>
      <Text style={[F.small, { marginTop: 6, marginBottom: S.lg }]}>
        A heart is only earned when someone watched the movie and said it helped. Ratings from
        people who also recommended it don’t count — they didn’t discover it on anyone’s word.
      </Text>

      {board.map((row, i) => (
        <View key={row.user.id} style={st.row}>
          <Text style={st.rank}>{String(i + 1).padStart(2, '0')}</Text>
          <Avatar name={row.user.name} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={st.name}>
              {row.user.name}
              {row.user.id === state.meId ? '  · you' : ''}
            </Text>
            <Text style={F.tiny}>
              {row.recommended} rec{row.recommended === 1 ? '' : 's'} · {row.watches} watched
              {row.avg !== null ? ` · ★ ${row.avg}` : ''}
            </Text>
          </View>
          <Text style={st.hearts}>♥ {row.hearts}</Text>
        </View>
      ))}

      <Btn kind="ghost" title="Reset to the seeded scenario" onPress={reset} style={{ marginTop: S.xxl }} />
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { padding: S.xl, paddingTop: S.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  stats: { flexDirection: 'row', gap: S.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  rank: { width: 22, fontSize: 13, fontWeight: '800', color: C.accent },
  name: { fontSize: 13.5, fontWeight: '700', color: C.text },
  hearts: { fontSize: 13, color: C.accent, fontWeight: '700' },
});
