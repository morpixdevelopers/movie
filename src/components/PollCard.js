import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { C, S, F, shadow } from '../theme';
import { Avatar, Btn } from '../ui';
import PollOptions from './PollOptions';
import { rows, findMovie, findUser, myVote, isOpen, ago } from '../logic';

/** A poll in the feed: select a row, optionally say why, vote. */
export default function PollCard({ state, question, onVote, onOpen }) {
  const list = rows(state, question);
  const mine = myVote(state, question.id);
  const [choice, setChoice] = useState(mine ? mine.movieId : null);
  const [why, setWhy] = useState('');
  const open = isOpen(question);
  const iAmAsker = question.userId === state.meId;
  const author = findUser(state, question.userId);
  const total = list.reduce((n, r) => n + r.count, 0);
  const reveal = !open || !!mine || iAmAsker;

  return (
    <View style={[st.card, shadow(1)]}>
      <View style={st.top}>
        <View style={st.user}>
          <Avatar name={author.name} size={34} />
          <View>
            <Text style={st.username}>{author.name}</Text>
            <Text style={F.tiny}>{ago(question.createdAt)}</Text>
          </View>
        </View>
        <View style={[st.pill, !open && st.pillClosed]}>
          <Text style={[st.pillText, !open && { color: C.muted }]}>
            {open ? '◉ Poll' : 'Decided'}
          </Text>
        </View>
      </View>

      <Pressable onPress={onOpen}>
        <Text style={st.q}>{question.text}</Text>
      </Pressable>

      <Text style={st.hint}>
        {!open ? 'Voting closed'
          : iAmAsker ? 'Your poll'
          : mine ? 'Tap another to change your vote'
          : 'Select one'}
        {total > 0 ? ` · ${total} ${total === 1 ? 'vote' : 'votes'}` : ''}
      </Text>

      <PollOptions
        state={state}
        list={list}
        myId={mine && mine.movieId}
        reveal={reveal}
        selected={open ? choice : null}
        votable={open && !iAmAsker}
        winnerId={!open ? question.opMovieId : null}
        onPick={setChoice}
      />

      {open && !iAmAsker && (
        <View style={st.vote}>
          <TextInput
            style={st.input}
            placeholder="Add a comment · optional"
            placeholderTextColor={C.dim}
            editable={!!choice}
            value={why}
            onChangeText={setWhy}
          />
          <Btn
            title={!choice ? 'Select one above'
              : mine && mine.movieId === choice ? 'This is your vote'
              : mine ? 'Change my vote'
              : 'Vote'}
            disabled={!choice || (mine && mine.movieId === choice)}
            style={{ marginTop: S.sm }}
            onPress={() => { onVote(choice, why); setWhy(''); }}
          />
        </View>
      )}

      <Pressable onPress={onOpen} style={st.foot}>
        <Text style={[F.tiny, { flex: 1 }]}>
          {!open
            ? `Decided · ${findMovie(state, question.opMovieId).title}`
            : total === 0
              ? 'No votes yet'
              : `${total} ${total === 1 ? 'person has' : 'people have'} voted`}
        </Text>
        <Text style={st.link}>{open ? 'Open' : 'Find my pick'} →</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.panel, borderRadius: S.radius,
    padding: S.lg, marginBottom: S.lg,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { fontSize: 13, fontWeight: '700', color: C.text },
  pill: { backgroundColor: C.tint, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 6 },
  pillClosed: { backgroundColor: C.chip },
  pillText: { fontSize: 11, color: C.accent, fontWeight: '800' },
  q: {
    fontSize: 19, fontWeight: '800', color: C.text, lineHeight: 26,
    marginTop: S.md, letterSpacing: -0.4,
  },
  hint: { ...F.tiny, marginTop: 4, marginBottom: S.md },
  vote: { marginTop: S.md },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 14, minHeight: 46,
  },
  foot: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.lineSoft,
  },
  link: { color: C.accent, fontSize: 13, fontWeight: '800' },
});
