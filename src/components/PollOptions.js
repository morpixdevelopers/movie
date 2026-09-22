import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, S, F, makeStyles } from '../theme';
import { Poster } from '../ui';
import { findMovie } from '../logic';

/**
 * Poll rows: poster, title, radio. Tapping anywhere on a row selects it —
 * casting the vote is a separate button, so a stray tap never votes for you.
 * Shared by the feed card and the thread so both behave identically.
 */
export default function PollOptions({ state, list, myId, reveal, votable, winnerId, onPick, selected }) {
  const best = Math.max(...list.map((r) => r.count), 0);

  return (
    <View style={st.wrap}>
      {list.map((r, i) => {
        const m = findMovie(state, r.movieId);
        const mine = myId === r.movieId;
        const on = selected ? selected === r.movieId : mine;
        const won = winnerId === r.movieId;
        const share = best > 0 ? r.count / best : 0;

        return (
          <Pressable
            key={r.movieId}
            disabled={!votable}
            onPress={() => onPick && onPick(r.movieId)}
            style={({ pressed }) => [
              st.row,
              i > 0 && st.divider,
              pressed && votable && { backgroundColor: C.chip },
            ]}
          >
            <View style={st.line}>
              <View style={[st.radio, on && st.radioOn, won && st.radioWon]}>
                {(on || won) && <View style={st.dot} />}
              </View>

              <Poster movie={m} style={st.thumb} width={200} />

              <View style={{ flex: 1 }}>
                <Text style={[st.title, on && { color: C.accent }]} numberOfLines={2}>
                  {m.title}
                </Text>
                {!!m.year && <Text style={st.year}>{m.year}</Text>}
              </View>

              {reveal && <Text style={st.count}>{r.count}</Text>}
            </View>

            {reveal && (
              <View style={st.track}>
                <View
                  style={[
                    st.fill,
                    { width: `${Math.round(share * 100)}%` },
                    won && { backgroundColor: C.amber },
                  ]}
                />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  wrap: {
    backgroundColor: C.panel, borderRadius: S.radiusSm,
    borderWidth: 1, borderColor: C.line, overflow: 'hidden',
  },
  row: { paddingHorizontal: S.md, paddingVertical: S.md },
  divider: { borderTopWidth: 1, borderTopColor: C.lineSoft },
  line: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: C.accent },
  radioWon: { borderColor: C.amber },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent },
  title: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  year: { ...F.tiny, color: C.dim },
  count: { fontSize: 14, fontWeight: '800', color: C.text, minWidth: 20, textAlign: 'right' },
  thumb: { width: 38, height: 54 },
  track: {
    height: 6, borderRadius: 3, backgroundColor: C.chip,
    marginTop: S.sm, marginLeft: 32 + 38 + S.md, overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.accent },
}));
