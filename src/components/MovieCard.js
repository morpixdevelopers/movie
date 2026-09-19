import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, S, F, shadow } from '../theme';
import { Btn, Poster } from '../ui';
import { findMovie, metrics, myJourney } from '../logic';

// Mirrors .movie-card in app.html: poster with rank + original-pick label,
// title block, recommender count, watching/finished stats, average, actions.
export default function MovieCard({ state, question, row, index, closed, isOp, poll, onWatch, onSupport, onFinish, onWhy, width }) {
  const item = findMovie(state, row.movieId);
  const mt = metrics(state, question.id, row.movieId);
  const journey = myJourney(state, question.id, row.movieId);
  const supported = state.recommendations.some(
    (r) => r.questionId === question.id && r.movieId === row.movieId && r.userId === state.meId
  );
  // anyone else who put this film forward, and whether you've thanked them yet
  const backers = new Set(
    state.recommendations
      .filter((r) => r.questionId === question.id && r.movieId === row.movieId && r.userId !== state.meId)
      .map((r) => r.userId)
  );
  const thanked = state.hearts.some(
    (h) => h.questionId === question.id && h.movieId === row.movieId && h.fromUserId === state.meId
  );

  return (
    <View style={[st.card, shadow(1), { width }, journey && st.cardOn]}>
      <Poster movie={item} style={st.poster} radius={0} width={400}>
        <View style={st.rank}><Text style={st.rankText}>{index + 1}</Text></View>
        {question.opMovieId === row.movieId && (
          <View style={st.opLabel}><Text style={st.opLabelText}>ORIGINAL PICK</Text></View>
        )}
        <Text style={st.posterTitle} numberOfLines={2}>
          {(item.id === 'd16' ? 'D16' : item.title).toUpperCase()}
        </Text>
      </Poster>

      <View style={st.body}>
        <Text style={st.title} numberOfLines={2}>{item.title}</Text>
        <Text style={F.tiny}>
          {item.year} · {item.language}{'\n'}{item.runtime} min
        </Text>

        <Text style={st.recCount}>
          {poll
            ? `◉ ${row.count} ${row.count === 1 ? 'vote' : 'votes'}`
            : `♧ ${row.count} recommended`}
        </Text>

        <View style={st.stats}>
          <View style={st.stat}>
            <Text style={st.statN}>{mt.watching}</Text>
            <Text style={st.statL}>◉ Watching</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statN}>{mt.finished}</Text>
            <Text style={st.statL}>✓ Finished</Text>
          </View>
        </View>

        <Text style={st.avg}>
          {mt.rating
            ? `★ ${mt.rating} · ${mt.ratings} ${mt.ratings === 1 ? 'experience' : 'experiences'}`
            : 'No rated experiences yet'}
        </Text>

        {journey?.status === 'watching' ? (
          <>
            <Btn small title="✓ I finished it" onPress={onFinish} />
            <Text style={st.note}>◉ You’re watching this</Text>
          </>
        ) : journey?.status === 'finished' ? (
          <>
            <Text style={st.done}>Thanks for watching</Text>
            <Text style={st.doneSub}>
              {Number.isFinite(journey.rating) ? `You gave it ${journey.rating}/5` : 'Marked as finished'}
              {thanked ? ' · hearts sent' : ''}
            </Text>
            {backers.size > 0 && !thanked && (
              <Btn small title="♥ Thank who recommended it" onPress={onFinish}
                style={{ marginTop: S.sm }} />
            )}
          </>
        ) : poll ? (
          <Btn
            small
            title={mt.watching > 0 ? 'I’m watching this too' : 'I’m going to watch this'}
            onPress={onWatch}
          />
        ) : closed || isOp ? (
          <>
            <Btn
              small
              title={closed && mt.watching > 0 ? 'I’m watching this too' : 'I’m going to watch this'}
              onPress={onWatch}
            />
            {!closed && (
              <Pressable onPress={supported ? undefined : onSupport} disabled={supported}>
                <Text style={[st.link, supported && { color: C.dim }]}>
                  {supported ? '✓ Recommended by you' : '＋ Support this movie'}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Btn
            small
            kind="ghost"
            disabled={supported}
            title={supported ? '✓ You recommended' : '＋ Support this movie'}
            onPress={onSupport}
          />
        )}

        <Pressable onPress={onWhy}>
          <Text style={st.link}>Why this movie? ↓</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.panel, borderRadius: S.radius, overflow: 'hidden' },
  cardOn: { borderWidth: 2, borderColor: C.accent },
  poster: { height: 196, justifyContent: 'flex-end' },
  rank: {
    position: 'absolute', top: 9, left: 9, backgroundColor: C.accent,
    borderRadius: 8, width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { color: C.onAccent, fontWeight: '800', fontSize: 12 },
  opLabel: {
    position: 'absolute', top: 9, right: 9, backgroundColor: 'rgba(12,16,26,0.78)',
    borderWidth: 1, borderColor: C.tintLine, borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 3,
  },
  opLabelText: { color: '#ff9db0', fontSize: 7.5, fontWeight: '800', letterSpacing: 0.4 },
  posterTitle: {
    color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center',
    letterSpacing: 0.8, paddingHorizontal: 11, marginBottom: 13, fontSize: 15,
    textShadowColor: '#000', textShadowRadius: 8,
  },
  body: { padding: S.md + 2, gap: 4 },
  title: { fontSize: 14, fontWeight: '800', color: C.text, lineHeight: 19, letterSpacing: -0.2 },
  recCount: { fontSize: 11.5, color: C.accent, marginVertical: 9, fontWeight: '800' },
  stats: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.lineSoft,
    paddingTop: 10, gap: 8,
  },
  stat: { flex: 1 },
  statN: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 2 },
  statL: { fontSize: 9, color: C.muted },
  avg: { fontSize: 10, color: C.amber, marginVertical: 9, minHeight: 26, lineHeight: 14 },
  note: { textAlign: 'center', color: C.accent, fontSize: 10, marginTop: 8, lineHeight: 15 },
  done: { textAlign: 'center', color: C.accent, fontSize: 12, fontWeight: '800', marginTop: 8 },
  doneSub: { textAlign: 'center', color: C.muted, fontSize: 10, marginTop: 2, lineHeight: 14 },
  link: { color: C.accent, fontSize: 10, textAlign: 'center', marginTop: 9 },
});
