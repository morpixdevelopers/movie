import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Platform } from 'react-native';
import { C, S, F, shadow } from '../theme';
import { Btn, Avatar, Card, Poster, Chip, SectionHead } from '../ui';
import PollCard from '../components/PollCard';
import Voted from '../components/Voted';
import { useStore } from '../store';
import { rows, isOpen, findUser, findMovie, ago, movieBoard, todo, isPoll } from '../logic';

const TABS = [
  ['all', 'All'],
  ['open', 'Taking suggestions'],
  ['closed', 'Ready to choose'],
];

export default function Feed({ onOpen, onAsk }) {
  const { state, run } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [voted, setVoted] = useState(null); // poll vote awaiting its moment

  const me = findUser(state, state.meId);
  const trending = movieBoard(state).slice(0, 8);
  const waiting = todo(state);

  const list = state.questions.filter((q) => {
    const status = isOpen(q) ? 'open' : 'closed';
    const hay = [q.text, q.lang, q.genre, q.constraints,
      ...rows(state, q).map((r) => findMovie(state, r.movieId).title)]
      .join(' ').toLowerCase();
    return (filter === 'all' || status === filter) &&
      query.toLowerCase().trim().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
  });

  return (
    <>
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.top}>
        <Text style={st.hello}>HELLO, {me.name.split(' ')[0].toUpperCase()}</Text>
        <Text style={F.display}>What are you{'\n'}in the mood for?</Text>
      </View>

      {/* the reason to come back */}
      {waiting.length > 0 && (
        <View style={st.pad}>
          {waiting.slice(0, 2).map((t, i) => (
            <Pressable key={t.id} onPress={() => onOpen(t.questionId)} style={[st.todo, shadow(1)]}>
              <View style={{ flex: 1 }}>
                <Text style={st.todoText} numberOfLines={1}>{t.text}</Text>
                <Text style={F.tiny}>{t.sub}</Text>
              </View>
              <Text style={st.todoArrow}>→</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={[st.pad, { marginTop: S.xl }]}>
        <SectionHead title="People keep recommending" sub="Pooled across every collection" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.rail}
        decelerationRate="fast"
        snapToInterval={136}
      >
        {trending.map((row, i) => (
          <View key={row.movieId} style={st.tile}>
            <Poster movie={row.movie} style={st.tilePoster} width={300}>
              <View style={st.tileRank}><Text style={st.tileRankText}>{i + 1}</Text></View>
              <View style={st.tileFoot}>
                <Text style={st.tileTitle} numberOfLines={2}>{row.movie.title}</Text>
                <Text style={st.tileMeta}>
                  ♧ {row.recommenders}{row.rating ? `   ★ ${row.rating}` : ''}
                </Text>
              </View>
            </Poster>
          </View>
        ))}
      </ScrollView>

      <View style={[st.pad, { marginTop: S.xxl }]}>
        <SectionHead title="Open questions" sub="Not just another comment thread" />

        <View style={st.searchWrap}>
          <Text style={st.searchIcon}>⌕</Text>
          <TextInput
            style={st.search}
            placeholder="Search a mood, cinema, or movie…"
            placeholderTextColor={C.dim}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={st.tabs}>
          {TABS.map(([id, label]) => (
            <Pressable key={id} onPress={() => setFilter(id)} style={[st.tab, filter === id && st.tabOn]}>
              <Text style={[st.tabText, filter === id && { color: C.onAccent }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {list.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: S.xxxl }}>
            <Text style={F.h3}>Nothing matches that.</Text>
            <Text style={[F.small, { marginTop: 6, textAlign: 'center' }]}>
              Your question could start something.
            </Text>
            <Btn title="Ask the community" onPress={onAsk} style={{ marginTop: S.lg }} />
          </Card>
        ) : (
          list.map((q) => {
            if (isPoll(q)) {
              return (
                <PollCard
                  key={q.id}
                  state={state}
                  question={q}
                  onVote={(movieId, text) => {
                    const res = run({ type: 'vote', questionId: q.id, movieId, text });
                    if (res.state) {
                      setVoted({
                        movie: findMovie(res.state, movieId).title,
                        asker: findUser(state, q.userId).name.split(' ')[0],
                      });
                    }
                  }}
                  onOpen={() => onOpen(q.id)}
                />
              );
            }
            const picks = rows(state, q);
            const people = new Set(
              state.recommendations.filter((r) => r.questionId === q.id).map((r) => r.userId)
            ).size;
            const watchers = state.journeys.filter((j) => j.questionId === q.id).length;
            const author = findUser(state, q.userId);
            const closed = !isOpen(q);
            return (
              <Card key={q.id} level={1} style={st.qCard} onPress={() => onOpen(q.id)}>
                <View style={st.qTop}>
                  <View style={st.user}>
                    <Avatar name={author.name} size={34} />
                    <View>
                      <Text style={st.username}>{author.name}</Text>
                      <Text style={F.tiny}>{ago(q.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={[st.pill, closed && st.pillClosed]}>
                    <Text style={[st.pillText, closed && { color: C.muted }]}>
                      {closed ? 'Closed' : '● Open'}
                    </Text>
                  </View>
                </View>

                <Text style={st.qTitle}>{q.text}</Text>

                {(q.lang || q.genre || q.constraints) && (
                  <View style={st.chips}>
                    {!!q.lang && <Chip label={q.lang} solid />}
                    {!!q.genre && <Chip label={q.genre} solid />}
                    {!!q.constraints && <Chip label={q.constraints} />}
                  </View>
                )}

                {picks.length > 0 && (
                  <View style={st.strip}>
                    {picks.slice(0, 4).map((r) => (
                      <Poster key={r.movieId} movie={findMovie(state, r.movieId)} style={st.stripPoster} width={200}>
                        <Text style={st.stripCount}>♧{r.count}</Text>
                      </Poster>
                    ))}
                    {picks.length > 4 && (
                      <View style={[st.stripPoster, st.stripMore]}>
                        <Text style={st.stripMoreText}>+{picks.length - 4}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={st.qFoot}>
                  <Text style={[F.tiny, { flex: 1 }]}>
                    {people} recommenders · {picks.length} movies · {watchers} choices
                  </Text>
                  <Text style={st.link}>{closed ? 'Find my pick' : 'View'} →</Text>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>

    <Voted
      visible={!!voted}
      movie={voted?.movie}
      asker={voted?.asker}
      onDone={() => setVoted(null)}
    />
    </>
  );
}

const st = StyleSheet.create({
  pad: { paddingHorizontal: S.xl },
  top: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.xl },
  hello: { ...F.label, color: C.accent, marginBottom: S.sm },

  todo: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.panel, borderRadius: S.radiusSm,
    padding: S.lg, marginBottom: S.sm,
    borderLeftWidth: 3, borderLeftColor: C.accent,
  },
  todoText: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 2 },
  todoArrow: { color: C.accent, fontSize: 17, fontWeight: '700' },

  rail: { paddingHorizontal: S.xl, gap: S.md, paddingBottom: S.sm },
  tile: { width: 124 },
  tilePoster: { width: 124, height: 178, justifyContent: 'flex-end' },
  tileRank: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(12,16,26,0.72)', borderRadius: 7,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  tileRankText: { color: C.onImage, fontSize: 11, fontWeight: '800' },
  tileFoot: { padding: 10 },
  tileTitle: { color: C.onImage, fontSize: 12.5, fontWeight: '800', lineHeight: 16 },
  tileMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, marginTop: 3, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.panel, borderRadius: S.radiusSm,
    borderWidth: 1, borderColor: C.line, paddingHorizontal: S.md,
  },
  searchIcon: { color: C.dim, fontSize: 18, marginRight: 6 },
  search: { flex: 1, paddingVertical: 13, color: C.text, fontSize: 14 },

  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: S.lg },
  tab: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.chip },
  tabOn: { backgroundColor: C.accent },
  tabText: { fontSize: 12, color: C.muted, fontWeight: '700' },

  qCard: { marginBottom: S.lg, padding: S.lg },
  qTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { fontSize: 13, fontWeight: '700', color: C.text },
  pill: { backgroundColor: C.tint, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 6 },
  pillClosed: { backgroundColor: C.chip },
  pillText: { fontSize: 11, color: C.accent, fontWeight: '800' },
  qTitle: {
    fontSize: 19, fontWeight: '800', color: C.text, lineHeight: 26,
    marginTop: S.md, marginBottom: S.md, letterSpacing: -0.4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  strip: { flexDirection: 'row', gap: 7, marginTop: S.lg },
  stripPoster: { flex: 1, height: 86, justifyContent: 'flex-end', padding: 6 },
  stripCount: { color: C.onImage, fontSize: 10, fontWeight: '800' },
  stripMore: {
    backgroundColor: C.chip, alignItems: 'center', justifyContent: 'center',
    borderRadius: S.radiusSm,
  },
  stripMoreText: { color: C.muted, fontSize: 13, fontWeight: '800' },
  qFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: S.lg, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.lineSoft,
  },
  link: { color: C.accent, fontSize: 13, fontWeight: '800' },
});
