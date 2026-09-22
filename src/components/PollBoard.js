import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { C, S, F, shadow, makeStyles } from '../theme';
import { Btn } from '../ui';
import PollOptions from './PollOptions';
import { rows, findMovie, findUser, myVote, isOpen } from '../logic';

/**
 * The poll inside a thread. Same rows as the feed card, plus the things that
 * only belong here: an optional reason, and the asker's decision.
 */
export default function PollBoard({ state, question, onVote, onWatch, onClose }) {
  const mine = myVote(state, question.id);
  const [choice, setChoice] = useState(mine ? mine.movieId : null);
  const [why, setWhy] = useState('');

  const list = rows(state, question);
  const total = list.reduce((n, r) => n + r.count, 0);
  const open = isOpen(question);
  const iAmAsker = question.userId === state.meId;
  const reveal = !open || !!mine || iAmAsker;

  const best = Math.max(...list.map((r) => r.count), 0);
  // only crown a leader once someone has voted, and only when it's unambiguous
  const winner = best > 0 && list.filter((r) => r.count === best).length === 1
    ? list.find((r) => r.count === best)
    : null;

  const asker = findUser(state, question.userId).name.split(' ')[0];

  return (
    <View>
      <View style={st.head}>
        <Text style={F.h2}>
          {!open ? 'How the vote went' : iAmAsker ? 'What people are picking' : 'Select one'}
        </Text>
        <Text style={F.tiny}>
          {total === 0 ? 'No votes yet' : `${total} ${total === 1 ? 'vote' : 'votes'}`}
          {open && !reveal ? ' · hidden until you vote' : ''}
        </Text>
      </View>

      <PollOptions
        state={state}
        list={list}
        myId={mine && mine.movieId}
        selected={open ? choice : null}
        reveal={reveal}
        votable={open}
        winnerId={!open ? question.opMovieId : null}
        onPick={setChoice}
      />

      {open && !iAmAsker && (
        <View style={st.box}>
          <TextInput
            style={st.input}
            placeholder={choice ? `Why ${findMovie(state, choice).title}? · optional` : 'Select one above'}
            placeholderTextColor={C.dim}
            editable={!!choice}
            value={why}
            onChangeText={setWhy}
          />
          <Btn
            title={!choice ? 'Select one above'
              : mine && mine.movieId === choice ? 'This is your vote'
              : mine ? `Change to ${findMovie(state, choice).title}`
              : 'Vote'}
            disabled={!choice || (mine && mine.movieId === choice)}
            style={{ marginTop: S.sm }}
            onPress={() => { onVote(choice, why); setWhy(''); }}
          />
          {!!mine && (
            <Text style={st.note}>
              You voted {findMovie(state, mine.movieId).title}. You can change it until {asker} decides.
            </Text>
          )}
        </View>
      )}

      {open && iAmAsker && (
        <View style={st.decide}>
          <Text style={st.decideLab}>YOUR CALL</Text>
          <Text style={st.decideText}>
            {choice
              ? `Closing this locks the list and starts your watch of ${findMovie(state, choice).title}.`
              : winner
                ? `${findMovie(state, winner.movieId).title} is ahead with ${winner.count}. Select any of them — you don't have to follow the vote.`
                : 'Nobody has voted yet. Select one when you have made up your mind.'}
          </Text>
          <Btn
            title={choice
              ? `Close poll · watch ${findMovie(state, choice).title}`
              : winner
                ? `Go with the vote · ${findMovie(state, winner.movieId).title}`
                : 'Select one above'}
            disabled={!choice && !winner}
            style={{ marginTop: S.md }}
            onPress={() => onClose(choice || (winner && winner.movieId))}
          />
        </View>
      )}

      {!open && (
        <View style={st.after}>
          <Text style={[F.tiny, { marginBottom: S.sm }]}>
            {asker} went with {findMovie(state, question.opMovieId).title}. Any of them is still
            yours to watch.
          </Text>
          {list.map((r) => (
            <Btn
              key={r.movieId}
              small
              kind="ghost"
              title={`Watch ${findMovie(state, r.movieId).title}`}
              style={{ marginTop: S.sm }}
              onPress={() => onWatch(r.movieId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  head: { marginBottom: S.md, gap: 3 },
  box: { marginTop: S.lg },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 14, minHeight: 48,
  },
  note: { ...F.tiny, marginTop: S.md, lineHeight: 17 },
  decide: {
    marginTop: S.lg, backgroundColor: C.panel, borderRadius: S.radius,
    padding: S.lg, borderLeftWidth: 3, borderLeftColor: C.accent, ...shadow(1),
  },
  decideLab: { ...F.label, color: C.accent, marginBottom: S.sm },
  decideText: { ...F.small, color: C.text, opacity: 0.9, lineHeight: 19 },
  after: { marginTop: S.lg },
}));
