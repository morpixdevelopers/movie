import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Sheet from './Sheet';
import { C, S, F } from '../theme';
import { Btn } from '../ui';
import { useStore } from '../store';
import { LANGS, GENRES } from '../seed';
import { ASK_MIN, POLL_MAX, searchMovies } from '../logic';
import { searchTitles, hasPosters } from '../posters';
import { Poster } from '../ui';

// Lives at the app shell so the + in the bottom nav can open it from any tab.
export default function AskSheet({ visible, kind = 'open', onClose, onPosted }) {
  const { state, run } = useStore();
  const [text, setText] = useState('');
  const [lang, setLang] = useState('Tamil');
  const [genre, setGenre] = useState('Thriller');
  const [extra, setExtra] = useState('');
  const [options, setOptions] = useState([]);   // [{title, imdbId, posterUrl, year}]
  const [pick, setPick] = useState('');
  const [remote, setRemote] = useState([]);
  const debounce = useRef(null);

  const ready = text.trim().length >= ASK_MIN;
  const enough = kind === 'open' || options.length >= 2;

  // look up whatever they're typing so poll options carry real posters
  useEffect(() => {
    if (kind !== 'poll' || !hasPosters) return;
    clearTimeout(debounce.current);
    const term = pick.trim();
    if (term.length < 2) { setRemote([]); return; }
    debounce.current = setTimeout(() => {
      searchTitles(term, { limit: 5 }).then(setRemote).catch(() => setRemote([]));
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [pick, kind]);

  const addOption = (o) => {
    const key = String(o.title).toLowerCase();
    if (options.length >= POLL_MAX) return;
    if (options.some((x) => x.title.toLowerCase() === key)) return;
    setOptions([...options, o]);
    setPick(''); setRemote([]);
  };

  const reset = () => {
    setText(''); setExtra(''); setOptions([]); setPick('');
    setRemote([]);
  };

  // A poll doesn't ask for cinema or genre — the films already say it.
  // Take the commonest language across the options so the chip stays truthful.
  const derivedLang = () => {
    const tally = {};
    options.forEach((o) => {
      const m = state.movies.find((x) => x.title.toLowerCase() === o.title.toLowerCase());
      const l = m && m.language;
      if (l) tally[l] = (tally[l] || 0) + 1;
    });
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : '';
  };

  const post = () => {
    const res = run({
      type: 'ask', kind, text,
      lang: kind === 'poll' ? derivedLang() : lang,
      genre: kind === 'poll' ? '' : genre,
      constraints: kind === 'poll' ? '' : extra,
      options: kind === 'poll' ? options : undefined,
    });
    if (res.questionId) {
      reset();
      onClose();
      onPosted?.(res.questionId);
    }
  };

  // each field drifts in just after the sheet lands, so it assembles itself
  const step = (i) => FadeInDown.delay(70 + i * 45).duration(280);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={kind === 'poll' ? 'Which one should you watch?' : 'What are you in the mood for?'}
    >
      <Animated.View entering={FadeIn.delay(80)}>
        <Text style={F.small}>
          {kind === 'poll'
            ? 'Put your shortlist up. People pick one — nobody can add a fourth.'
            : 'A good question can help more than one movie night.'}
        </Text>
      </Animated.View>

      <Animated.View entering={step(0)}>
          <Text style={st.lab}>What are you looking for?</Text>
          <TextInput
            style={[st.input, { height: 90, textAlignVertical: 'top' }]}
            multiline maxLength={240}
            placeholder={kind === 'poll'
              ? 'Which of these should I watch tonight?'
              : 'Suggest me a Tamil thriller that keeps me guessing…'}
            placeholderTextColor={C.dim}
            value={text} onChangeText={setText}
          />
          <Text style={[st.hint, ready && { color: C.accent }]}>
            {ready
              ? `Good — ${text.trim().length}/240 characters.`
              : `${text.trim().length} of ${ASK_MIN} characters minimum — say what mood you are in.`}
          </Text>
      </Animated.View>

      {kind === 'poll' && (
        <Animated.View entering={FadeIn.duration(220)}>
          <Text style={st.lab}>Your options · {options.length}/{POLL_MAX}</Text>

          {options.length > 0 && (
            <View style={st.chosen}>
              {options.map((o) => (
                <Pressable key={o.title} onPress={() => setOptions(options.filter((x) => x !== o))}
                  style={st.pickTile}>
                  <Poster movie={o} style={st.pickPoster} width={200} />
                  <Text style={st.pickTitle} numberOfLines={2}>{o.title}</Text>
                  <View style={st.pickX}><Text style={st.pickXText}>✕</Text></View>
                </Pressable>
              ))}
            </View>
          )}

          {options.length < POLL_MAX && (
            <>
              <TextInput
                style={st.input} value={pick} onChangeText={setPick} autoCorrect={false}
                placeholder="Add a movie…" placeholderTextColor={C.dim}
              />
              {searchMovies(state, pick).slice(0, 3).map((m) => (
                <Pressable key={m.id} style={st.row}
                  onPress={() => addOption({ title: m.title, year: m.year, posterUrl: m.posterUrl, imdbId: m.imdbId })}>
                  <Poster movie={m} style={st.thumb} width={200} />
                  <Text style={st.rowTitle} numberOfLines={1}>{m.title}</Text>
                  <Text style={F.tiny}>{m.year}</Text>
                </Pressable>
              ))}
              {remote
                .filter((r) => !searchMovies(state, pick).some((m) => m.title.toLowerCase() === r.title.toLowerCase()))
                .map((r) => (
                  <Pressable key={r.imdbId} style={st.row}
                    onPress={() => addOption({ title: r.title, year: r.year, posterUrl: r.posterUrl, imdbId: r.imdbId })}>
                    <Poster movie={{ posterUrl: r.posterUrl }} style={st.thumb} width={200} />
                    <Text style={st.rowTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={F.tiny}>{r.year || ''}</Text>
                  </Pressable>
                ))}
            </>
          )}

          <Text style={[st.hint, enough && { color: C.accent }]}>
            {options.length < 2
              ? `Add at least 2 movies — ${2 - options.length} more to go.`
              : `${options.length} options. People pick one.`}
          </Text>
        </Animated.View>
      )}

      {kind !== 'poll' && (<>
      <Animated.View entering={step(1)}>
          <Text style={st.lab}>Cinema</Text>
          <View style={st.opts}>
            {LANGS.map((l) => (
              <Pressable key={l} onPress={() => setLang(l)} style={[st.opt, lang === l && st.optOn]}>
                <Text style={[st.optText, lang === l && { color: C.onAccent }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

      </Animated.View>

      <Animated.View entering={step(3)}>
          <Text style={st.lab}>Genre</Text>
          <View style={st.opts}>
            {GENRES.map((g) => (
              <Pressable key={g} onPress={() => setGenre(g)} style={[st.opt, genre === g && st.optOn]}>
                <Text style={[st.optText, genre === g && { color: C.onAccent }]}>{g}</Text>
              </Pressable>
            ))}
          </View>

      </Animated.View>

      <Animated.View entering={step(4)}>
          <Text style={st.lab}>Anything else? · optional</Text>
          <TextInput
            style={st.input} maxLength={160}
            placeholder="After 2015 · Under 2 hours · No horror"
            placeholderTextColor={C.dim}
            value={extra} onChangeText={setExtra}
          />

      </Animated.View>
      </>)}

      <Animated.View entering={step(5)}>
          <View style={st.notice}>
            <Text style={st.noticeText}>
              {kind === 'poll'
                ? 'When you pick one, voting closes — but anyone can still watch any of them later.'
                : 'When you choose a movie, suggestions close. The collection stays useful for everyone who comes after you.'}
            </Text>
          </View>

          <Btn
            title={kind === 'poll' ? 'Post the poll ↗' : 'Ask the community ↗'}
            disabled={!enough}
            onPress={post}
          />
      </Animated.View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  lab: { fontSize: 12, fontWeight: '600', color: C.text, marginTop: S.lg, marginBottom: S.sm },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 14, minHeight: 48,
  },
  hint: { fontSize: 10.5, color: C.dim, marginTop: S.sm, lineHeight: 15 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: {
    backgroundColor: C.chip, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: 'center',
  },
  optOn: { backgroundColor: C.accent, borderColor: C.accent },
  optText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  chosen: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: S.md },
  pickTile: { width: 78 },
  pickPoster: { width: 78, height: 110 },
  pickTitle: { fontSize: 10.5, color: C.text, fontWeight: '700', marginTop: 4 },
  pickX: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(12,16,26,0.78)', alignItems: 'center', justifyContent: 'center',
  },
  pickXText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  thumb: { width: 32, height: 46 },
  rowTitle: { flex: 1, fontSize: 13.5, color: C.text, fontWeight: '700' },
  notice: {
    backgroundColor: C.tint, borderWidth: 1, borderColor: C.tintLine,
    borderRadius: 10, padding: 13, marginVertical: S.lg,
  },
  noticeText: { fontSize: 12, color: C.text, opacity: 0.9, lineHeight: 19 },
});
