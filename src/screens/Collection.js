import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, useWindowDimensions,
  Platform, Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Sheet from '../components/Sheet';
import Recommended from '../components/Recommended';
import PollBoard from '../components/PollBoard';
import Voted from '../components/Voted';
import Rated from '../components/Rated';
import { C, S, F, shadow, makeStyles } from '../theme';
import { Btn, Avatar, Poster } from '../ui';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { searchTitles, hasPosters } from '../posters';
import {
  rows, isOpen, findUser, findMovie, ago, searchMovies, resolveMovie,
  recommenderScore, metrics, myJourney, isPoll,
} from '../logic';

const RATING_LABELS = ['Didn’t like it', 'Meh', 'Decent', 'Really good', 'Loved it'];
const RATING_FACES = ['😞', '😐', '🙂', '😀', '🤩'];

export default function Collection({ questionId, onBack }) {
  const { state, run } = useStore();
  const { width } = useWindowDimensions();
  const q = state.questions.find((x) => x.id === questionId);
  const [tab, setTab] = useState('reasons');
  const [focusMovie, setFocusMovie] = useState('all');
  const [sheet, setSheet] = useState(null);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState(null);
  const [expText, setExpText] = useState('');
  const [picked, setPicked] = useState([]);
  const [comment, setComment] = useState('');
  const [added, setAdded] = useState(null);     // movie awaiting the recommend animation
  const [voted, setVoted] = useState(null);     // movie awaiting the vote animation
  const [rated, setRated] = useState(null);     // score awaiting the rating animation
  const [remote, setRemote] = useState([]);
  const [looking, setLooking] = useState(false);
  const [chosen, setChosen] = useState(null); // an IMDb pick, with its poster
  const [draft, setDraft] = useState('');     // text being edited, question or reason
  const debounce = useRef(null);
  const scroller = useRef(null);
  const discussY = useRef(0);   // where the discussion starts, for "view"

  // Focus one movie's reasons and take the reader there, rather than filtering
  // a section that is two screens further down and leaving them to find it.
  const viewReasons = (movieId) => {
    setFocusMovie(movieId);
    setTab('reasons');
    scroller.current?.scrollTo({ y: Math.max(0, discussY.current - 12), animated: true });
  };

  // Look the typed title up on IMDb so people get the real poster.
  useEffect(() => {
    if (!hasPosters) return;
    clearTimeout(debounce.current);
    // once a film is locked in there is nothing left to search for
    if (chosen) { setRemote([]); setLooking(false); return; }
    const term = title.trim();
    if (term.length < 2) { setRemote([]); setLooking(false); return; }
    setLooking(true);
    debounce.current = setTimeout(() => {
      searchTitles(term, { limit: 6 })
        .then((r) => setRemote(r))
        .catch(() => setRemote([]))
        .finally(() => setLooking(false));
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [title, chosen]);


  if (!q) return null;

  const closed = !isOpen(q);
  const poll = isPoll(q);
  const list = rows(state, q);
  const isOp = q.userId === state.meId;
  const author = findUser(state, q.userId);
  // first name only — "OP" is forum jargon, and a name says who actually decides
  const askerName = author.name.split(' ')[0];
  const recs = state.recommendations.filter((r) => r.questionId === q.id);
  const people = new Set(recs.map((r) => r.userId)).size;
  const comments = state.comments.filter((c) => c.questionId === q.id).sort((a, b) => a.createdAt - b.createdAt);

  const gap = S.md;
  const pad = S.lg * 2;
  const cardW = Math.floor((width - pad - gap) / 2);

  const close = () => {
    setSheet(null); setTitle(''); setReason('');
    setRating(null); setExpText(''); setPicked([]);
    setRemote([]); setChosen(null); setDraft('');
  };

  const sheetTitle =
    sheet?.kind === 'recommend' ? 'Pass on a good movie.'
    : sheet?.kind === 'experience' ? 'Was it a good watch?'
    : sheet?.kind === 'editQuestion' ? 'Say it a different way.'
    : sheet?.kind === 'editReason' ? 'Put it better.'
    : '';

  // Deleting a live question takes other people's work with it, so the
  // confirmation says exactly what is lost before it happens.
  const confirmDeleteQuestion = () => {
    const backers = new Set(recs.map((r) => r.userId)).size;
    Alert.alert(
      'Delete this question?',
      backers
        ? `${backers} ${backers === 1 ? 'person has' : 'people have'} put movies forward. ` +
          'Deleting takes their recommendations and every reply with it. This cannot be undone.'
        : 'Nobody has answered yet, so nothing else goes with it. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { if (run({ type: 'deleteQuestion', questionId: q.id }).state) onBack(); },
        },
      ],
    );
  };

  const confirmWithdraw = (rec) => {
    Alert.alert(
      poll ? 'Withdraw your vote?' : `Withdraw ${findMovie(state, rec.movieId).title}?`,
      poll
        ? 'Your vote comes off the tally. You can vote again while the poll is open.'
        : 'It comes off the list along with any replies to it. You can recommend it again while suggestions are open.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => run({ type: 'deleteRecommendation', recommendationId: rec.id }),
        },
      ],
    );
  };

  const preset = sheet?.kind === 'recommend' ? sheet.movieId : null;
  const known = resolveMovie(state, title);
  const onListAlready = known && list.find((r) => r.movieId === known.id);
  const matches = preset ? [] : searchMovies(state, title);


  // How many other people put this film forward — the experience sheet tells
  // you the rating lands on them, since it is the only thing that does.
  const stakers = sheet?.kind === 'experience'
    ? new Set(
        recs.filter((r) => r.movieId === sheet.movieId && r.userId !== state.meId)
          .map((r) => r.userId)
      ).size
    : 0;


  // what the thread has gathered so far, in one line
  const tally = poll
    ? `${list.length} ${list.length === 1 ? 'option' : 'options'} · ${people} ${people === 1 ? 'vote' : 'votes'}`
    : `${list.length} ${list.length === 1 ? 'movie' : 'movies'} · ${people} ${people === 1 ? 'person' : 'people'}`;

  const shown = tab === 'reasons'
    ? recs.filter((r) => focusMovie === 'all' || r.movieId === focusMovie)
    : state.journeys.filter((j) =>
        j.questionId === q.id && j.status === 'finished' &&
        (focusMovie === 'all' || j.movieId === focusMovie));

  return (
    <>
      <ScrollView
        ref={scroller}
        contentContainerStyle={st.page}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={st.back}>← All collections</Text>
        </Pressable>

        <View style={st.card}>
          <View style={st.userRow}>
            <View style={st.user}>
              <Avatar name={author.name} size={33} />
              <View>
                <Text style={st.username}>{author.name} <Text style={F.tiny}>· asked this</Text></Text>
                <Text style={F.tiny}>{ago(q.createdAt)}</Text>
              </View>
            </View>
            <View style={[st.status, closed && st.statusClosed]}>
              <Text style={[st.statusText, closed && { color: C.muted }]}>
                {closed ? '🔒 Closed' : '● Taking suggestions'}
              </Text>
            </View>
          </View>

          <Text style={st.qTitle}>🎬 {q.text}</Text>
          {!!q.editedAt && <Text style={[F.tiny, { marginTop: 4 }]}>Edited {ago(q.editedAt)}</Text>}

          {(q.lang || q.genre || q.constraints) ? (
            <View style={st.request}>
              <View style={st.requestTop}>
                <Text style={st.requestLab}>LOOKING FOR</Text>
                {list.length > 0 && <Text style={st.tally}>{tally}</Text>}
              </View>
              <View style={st.tags}>
                {!!q.lang && <Tag label={q.lang} />}
                {!!q.genre && <Tag label={q.genre} />}
              </View>
              {!!q.constraints && <Text style={[F.small, { marginTop: 8 }]}>{q.constraints}</Text>}
            </View>
          ) : list.length > 0 ? (
            // no tags to show, but the tally still belongs above the movies
            <View style={st.requestSlim}><Text style={st.tally}>{tally}</Text></View>
          ) : <View style={{ height: S.md }} />}


          <View style={st.stateNote}>
            <Text style={st.symbol}>{closed ? '↗' : '✳'}</Text>
            <Text style={[F.small, { flex: 1, color: C.text, opacity: 0.9 }]}>
              {closed ? (
                <>
                  <Text style={st.strong}>
                    {isOp ? 'You chose' : `${askerName} chose`} {findMovie(state, q.opMovieId).title}.
                  </Text>
                  {' '}You can choose that — or any other movie below. No new movies or
                  recommendations can be added.
                </>
              ) : poll ? (
                isOp ? (
                  <>
                    <Text style={st.strong}>Your poll is live.</Text>
                    {' '}People are picking from your list. Close it whenever you've decided.
                  </>
                ) : (
                  <>
                    <Text style={st.strong}>{askerName} listed the options.</Text>
                    {' '}Pick the one you'd send them to. Nothing new can be added.
                  </>
                )
              ) : isOp ? (
                <>
                  <Text style={st.strong}>Found your next watch?</Text>
                  {' '}Choose a movie below to close suggestions and preserve this collection
                  for everyone.
                </>
              ) : (
                <>
                  <Text style={st.strong}>The suggestion phase is open.</Text>
                  {' '}Add a pick or support an existing movie. Choosing opens for everyone
                  once {askerName} picks.
                </>
              )}
            </Text>
          </View>

          {/* your own question, while it is still open */}
          {isOp && !closed && (
            <View style={st.owner}>
              <Pressable
                style={({ pressed }) => [st.ownerBtn, { flex: 1 }, pressed && { backgroundColor: C.chip }]}
                onPress={() => { setDraft(q.text); setSheet({ kind: 'editQuestion' }); }}>
                <Text style={st.ownerText}>✎  Edit {poll ? 'poll' : 'question'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [st.ownerBtn, st.ownerDanger, pressed && { backgroundColor: C.tintLine }]}
                onPress={confirmDeleteQuestion}>
                <Text style={[st.ownerText, { color: C.accent }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>


        {poll && !closed ? (
          <PollBoard
            state={state}
            question={q}
            onVote={(movieId, text) => {
              const res = run({ type: 'vote', questionId: q.id, movieId, text });
              if (res.state) {
                setVoted({
                  movie: findMovie(res.state, movieId).title,
                  asker: isOp ? null : askerName,
                });
              }
            }}
            onWatch={(movieId) => run({ type: 'watch', questionId: q.id, movieId })}
            onClose={(movieId) => movieId && run({ type: 'choose', questionId: q.id, movieId })}
          />
        ) : (
        <>
        <View style={st.sectionTitle}>
          <Text style={[F.h2, { flex: 1 }]}>
            {poll
              ? 'How the vote went'
              : closed
                ? `Pick your kind of ${(q.genre || 'good').toLowerCase()} movie`
                : 'The community’s picks'}
          </Text>
          {!closed && !isOp && (
            <Pressable onPress={() => setSheet({ kind: 'recommend' })}>
              <Text style={st.link}>＋ Recommend</Text>
            </Pressable>
          )}
        </View>
        <Text style={[F.tiny, { marginBottom: 15 }]}>
          {poll
            ? 'Voting is closed. Pick any of them — the list stays useful for the next person.'
            : closed
              ? 'Ranking is frozen by original recommendations. Watching and experiences keep updating.'
              : 'Ranked by unique recommenders per movie, not ratings.'}
        </Text>

        {list.length ? (
          <View style={[st.grid, { gap }]}>
            {list.map((row, i) => (
              <Animated.View key={row.movieId}
                entering={FadeIn.delay(i * 45).duration(260)}
                style={{ width: cardW }}>
              <MovieCard
                state={state} question={q} row={row} index={i}
                closed={closed} isOp={isOp} poll={poll} width={cardW}
                onWatch={() => run({ type: closed ? 'watch' : 'choose', questionId: q.id, movieId: row.movieId })}
                onSupport={() => setSheet({ kind: 'recommend', movieId: row.movieId })}
                onFinish={() => {
                  const j = myJourney(state, q.id, row.movieId);
                  if (j?.status !== 'finished') setSheet({ kind: 'experience', movieId: row.movieId });
                }}
                onWhy={() => viewReasons(row.movieId)}
              />
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={st.empty}>
            {isOp ? (
              <>
                <Text style={F.h3}>Nobody has answered yet.</Text>
                <Text style={[F.small, { marginTop: 6, textAlign: 'center' }]}>
                  Give it a little time — the movies people put forward will show up here.
                </Text>
              </>
            ) : (
              <>
                <Text style={F.h3}>The first great pick could be yours.</Text>
                <Text style={[F.small, { marginTop: 6, textAlign: 'center' }]}>
                  Start the collection with a movie and a short reason.
                </Text>
                <Btn title="Recommend a movie" style={{ marginTop: S.lg }}
                  onPress={() => setSheet({ kind: 'recommend' })} />
              </>
            )}
          </View>
        )}

        {/* The empty state has a proper button, so once the list fills up the
            action must not shrink to a link in the header — that is exactly
            when people stop noticing it. */}
        {!closed && !isOp && list.length > 0 && (
          <>
            <Btn
              title="＋ Recommend a movie"
              style={{ marginTop: S.lg }}
              onPress={() => setSheet({ kind: 'recommend' })}
            />
            <Text style={[F.tiny, { marginTop: S.sm, textAlign: 'center' }]}>
              Not seeing the one you'd send them to? Add it.
            </Text>
          </>
        )}
        </>
        )}

        {/* discussion */}
        <View
          onLayout={(e) => { discussY.current = e.nativeEvent.layout.y; }}
          style={[st.sectionTitle, { marginTop: S.xxl }]}
        >
          <Text style={[F.h2, { flex: 1 }]}>Why these movies</Text>
        </View>
        <View style={st.tabs}>
          {[['reasons', 'Reasons'], ['experiences', 'Experiences']].map(([id, label]) => (
            <Pressable key={id} onPress={() => setTab(id)} style={[st.tab, tab === id && st.tabOn]}>
              <Text style={[st.tabText, tab === id && { color: C.onAccent }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* one chip per movie, so you can read a single film's reasons */}
        {list.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.filterRow}
          >
            <Pressable onPress={() => setFocusMovie('all')}
              style={[st.tab, focusMovie === 'all' && st.tabOn]}>
              <Text style={[st.tabText, focusMovie === 'all' && { color: C.onAccent }]}>
                All movies
              </Text>
            </Pressable>
            {list.map((r) => {
              const m = findMovie(state, r.movieId);
              const on = focusMovie === r.movieId;
              return (
                <Pressable key={r.movieId} onPress={() => setFocusMovie(r.movieId)}
                  style={[st.tab, on && st.tabOn]}>
                  <Text style={[st.tabText, on && { color: C.onAccent }]} numberOfLines={1}>
                    {m.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {shown.length === 0 ? (
          <Text style={[F.small, { marginTop: S.md }]}>
            {tab === 'reasons' ? 'No reasons here yet.' : 'No finished experiences yet.'}
          </Text>
        ) : (
          shown.map((e) => {
            const u = findUser(state, e.userId);
            const sc = recommenderScore(state, e.userId);
            const isExp = tab === 'experiences';
            return (
              <View key={e.id} style={st.reply}>
                <View style={st.userRow}>
                  <View style={st.user}>
                    <Avatar name={u.name} size={30} />
                    <View>
                      <Text style={st.username}>{u.name}</Text>
                      <Text style={F.tiny}>
                        {isExp ? 'Finished' : 'Recommended'} · {ago(e.finishedAt || e.createdAt)}
                      </Text>
                    </View>
                  </View>
                  {isExp && Number.isFinite(e.rating) ? (
                    <Text style={st.rating}>★ {e.rating}/5</Text>
                  ) : sc.avg !== null ? (
                    <Text style={st.rating}>★ {sc.avg}</Text>
                  ) : null}
                </View>
                <Text style={st.replyBody}>{e.text || 'Marked as finished.'}</Text>
                {!isExp && !!e.editedAt && <Text style={[F.tiny, { marginTop: 4 }]}>Edited {ago(e.editedAt)}</Text>}
                <View style={st.replyFooter}>
                  <View style={st.tag}><Text style={st.tagText}>{findMovie(state, e.movieId).title}</Text></View>
                  {!isExp && e.userId === state.meId && !closed && (
                    <View style={st.mine}>
                      <Pressable hitSlop={8} onPress={() => { setDraft(e.text); setSheet({ kind: 'editReason', recId: e.id }); }}>
                        <Text style={st.mineLink}>Edit</Text>
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => confirmWithdraw(e)}>
                        <Text style={[st.mineLink, { color: C.accent }]}>Withdraw</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* question-level discussion */}
        <View style={[st.sectionTitle, { marginTop: S.xxl }]}>
          <Text style={[F.h2, { flex: 1 }]}>Discussion</Text>
          <Text style={F.tiny}>Never closes</Text>
        </View>
        {comments.map((c) => (
          <View key={c.id} style={st.reply}>
            <View style={st.user}>
              <Avatar name={findUser(state, c.userId).name} size={30} />
              <View>
                <Text style={st.username}>
                  {findUser(state, c.userId).name}
                  {c.userId === q.userId ? <Text style={F.tiny}> · asked this</Text> : null}
                </Text>
                <Text style={F.tiny}>{ago(c.createdAt)}</Text>
              </View>
            </View>
            <Text style={st.replyBody}>{c.text}</Text>
          </View>
        ))}
        <TextInput
          style={[st.input, { marginTop: S.md }]} multiline
          placeholder={`Commenting as ${findUser(state, state.meId).name}…`}
          placeholderTextColor={C.dim}
          value={comment} onChangeText={setComment}
        />
        <Btn small title="Post comment" style={{ marginTop: S.sm, alignSelf: 'flex-start' }}
          onPress={() => { if (run({ type: 'comment', questionId: q.id, text: comment }).state) setComment(''); }} />

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ── sheets ──────────────────────────────────────── */}
      <Sheet visible={!!sheet} onClose={close} title={sheetTitle}>
            {sheet?.kind === 'recommend' && (
              <>
                <Text style={F.small}>
                  Recommend a new movie or support an existing one. One recommendation per person,
                  per movie.
                </Text>
                {/* Once a film is picked the search collapses to just that one,
                    so the reason field and the button are the next thing you see. */}
                {!preset && chosen && (
                  <>
                    <Text style={st.fieldLab}>Movie</Text>
                    <View style={st.lockedRow}>
                      <Poster movie={chosen.poster} style={st.thumb} width={200} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.suggestTitle} numberOfLines={2}>{chosen.title}</Text>
                        <Text style={F.tiny}>
                          {chosen.year || '—'}{chosen.language ? ` · ${chosen.language}` : ''}
                        </Text>
                      </View>
                      <Pressable onPress={() => setChosen(null)} hitSlop={8}>
                        <Text style={st.changeLink}>Change</Text>
                      </Pressable>
                    </View>
                    <Text style={[st.hint, onListAlready ? { color: C.amber } : { color: C.accent }]}>
                      {onListAlready
                        ? `Already on this list with ${onListAlready.count} recommender${onListAlready.count === 1 ? '' : 's'}. Your reason joins that movie.`
                        : `New movie — “${chosen.title}” will be added to the collection.`}
                    </Text>
                  </>
                )}

                {!preset && !chosen && (
                  <>
                    <Text style={st.fieldLab}>Movie</Text>
                    <TextInput
                      style={st.input} value={title} onChangeText={setTitle}
                      autoCorrect={false}
                      placeholder="Type any movie title…" placeholderTextColor={C.dim}
                    />
                    {matches.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          setTitle(m.title);
                          setChosen({ title: m.title, year: m.year, language: m.language, poster: m });
                        }}
                        style={st.suggestItem}>
                        <Poster movie={m} style={st.thumb} width={200} />
                        <View style={{ flex: 1 }}>
                          <Text style={st.suggestTitle} numberOfLines={1}>{m.title}</Text>
                          <Text style={F.tiny}>{m.year}{m.language ? ` · ${m.language}` : ''}</Text>
                        </View>
                        {list.some((r) => r.movieId === m.id) && (
                          <Text style={st.onList}>ON THIS LIST</Text>
                        )}
                      </Pressable>
                    ))}

                    {hasPosters && remote.length > 0 && (
                      <Text style={st.remoteLab}>FROM IMDb</Text>
                    )}
                    {hasPosters && remote
                      .filter((r) => !matches.some((m) => m.title.toLowerCase() === r.title.toLowerCase()))
                      .map((r) => (
                        <Pressable key={r.imdbId}
                          onPress={() => {
                            setTitle(r.title);
                            setChosen({
                              title: r.title, year: r.year, imdbId: r.imdbId,
                              posterUrl: r.posterUrl, poster: { posterUrl: r.posterUrl },
                            });
                          }}
                          style={st.suggestItem}>
                          <Poster movie={{ posterUrl: r.posterUrl }} style={st.thumb} width={200} />
                          <View style={{ flex: 1 }}>
                            <Text style={st.suggestTitle} numberOfLines={1}>{r.title}</Text>
                            <Text style={F.tiny} numberOfLines={1}>
                              {r.year || '—'}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    {hasPosters && looking && (
                      <Text style={st.hint}>Searching IMDb…</Text>
                    )}
                    <Text style={[st.hint, onListAlready ? { color: C.amber } : title.trim() ? { color: C.accent } : null]}>
                      {!title.trim()
                        ? 'Type anything — it does not have to be one we already know.'
                        : onListAlready
                          ? `Already on this list with ${onListAlready.count} recommender${onListAlready.count === 1 ? '' : 's'}. Your reason joins that movie.`
                          : `New movie — “${title.trim()}” will be added to the collection.`}
                    </Text>
                  </>
                )}
                <Text style={st.fieldLab}>Why this movie?</Text>
                <TextInput
                  style={[st.input, { height: 94, textAlignVertical: 'top' }]} multiline maxLength={500}
                  placeholder="No spoilers — say what makes it worth their evening."
                  placeholderTextColor={C.dim}
                  value={reason} onChangeText={setReason}
                />
                <Btn title="Recommend ↗" style={{ marginTop: S.xl }}
                  onPress={() => {
                    const res = run({
                      type: 'suggest', questionId: q.id,
                      title: preset ? findMovie(state, preset).title : (chosen ? chosen.title : title),
                      text: reason,
                      // only an IMDb pick carries metadata; a catalogue pick
                      // already has its own, and free text has none
                      meta: !preset && chosen?.imdbId
                        ? { imdbId: chosen.imdbId, posterUrl: chosen.posterUrl, year: chosen.year }
                        : null,
                    });
                    if (res.state) {
                      const backed = findMovie(res.state, res.movieId);
                      close();
                      setAdded({
                        movie: backed,
                        joined: res.joined,
                        count: res.count,
                        asker: isOp ? null : askerName,
                      });
                    }
                  }} />
              </>
            )}

            {sheet?.kind === 'experience' && (
              <>
                <Text style={st.credit}>
                  {stakers === 0
                    ? `Tell the next person how ${findMovie(state, sheet.movieId).title} went.`
                    : `Tell them how ${findMovie(state, sheet.movieId).title} went — the ${
                        stakers === 1 ? 'person' : 'people'
                      } who recommended it ${stakers === 1 ? 'is' : 'are'} waiting to hear.`}
                </Text>
                <Text style={st.fieldLab}>Overall experience</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRating(n)}
                      style={[st.rate, rating === n && { backgroundColor: C.accentFill, borderColor: C.accentFill }]}>
                      <Text style={st.rateFace}>{RATING_FACES[n - 1]}</Text>
                      <Text style={[st.rateN, rating === n && { color: C.onAccent }]}>{n}</Text>
                      <Text style={[st.rateL, rating === n && { color: C.onAccent }]} numberOfLines={2}>
                        {RATING_LABELS[n - 1]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={st.fieldLab}>Tell us about your experience</Text>
                <TextInput
                  style={[st.input, { height: 90, textAlignVertical: 'top' }]} multiline
                  placeholder="No spoilers." placeholderTextColor={C.dim}
                  value={expText} onChangeText={setExpText}
                />
                <Btn title="Save experience" style={{ marginTop: S.xl }}
                  onPress={() => {
                    const given = rating;
                    const title = findMovie(state, sheet.movieId).title;
                    const backers = stakers;
                    const res = run({
                      type: 'finish', questionId: q.id, movieId: sheet.movieId,
                      rating, text: expText,
                    });
                    // read the sheet's values before close() clears them
                    if (res.state) { close(); setRated({ rating: given, movie: title, backers }); }
                  }} />
              </>
            )}


            {sheet?.kind === 'editQuestion' && (
              <>
                <Text style={F.small}>
                  People answer the question you asked. Changing it while {people === 0 ? 'nobody has' : 'people have'} answered
                  is fine — the wording moves, the movies stay.
                </Text>
                <TextInput
                  style={[st.input, { marginTop: S.md, minHeight: 96 }]} multiline autoFocus
                  placeholder="What are you looking for?"
                  placeholderTextColor={C.dim}
                  value={draft} onChangeText={setDraft}
                />
                <Text style={[F.tiny, { marginTop: 6 }]}>{draft.trim().length} characters · 10 minimum</Text>
                <Btn
                  title="Save changes"
                  disabled={draft.trim().length < 10 || draft.trim() === q.text}
                  style={{ marginTop: S.lg }}
                  onPress={() => {
                    if (run({ type: 'editQuestion', questionId: q.id, text: draft }).state) close();
                  }} />
              </>
            )}

            {sheet?.kind === 'editReason' && (
              <>
                <Text style={F.small}>
                  The reason is what makes a recommendation worth something. The movie itself
                  stays — withdraw it if you want to put a different one forward.
                </Text>
                <TextInput
                  style={[st.input, { marginTop: S.md, minHeight: 96 }]} multiline autoFocus
                  placeholder="Why this one?"
                  placeholderTextColor={C.dim}
                  value={draft} onChangeText={setDraft}
                />
                <Btn
                  title="Save changes"
                  disabled={!draft.trim()}
                  style={{ marginTop: S.lg }}
                  onPress={() => {
                    if (run({ type: 'editRecommendation', recommendationId: sheet.recId, text: draft }).state) close();
                  }} />
              </>
            )}
      </Sheet>

      <Rated
        visible={!!rated}
        rating={rated?.rating}
        face={rated ? RATING_FACES[rated.rating - 1] : ''}
        label={rated ? RATING_LABELS[rated.rating - 1] : ''}
        movie={rated?.movie}
        backers={rated?.backers}
        onDone={() => setRated(null)}
      />

      <Voted
        visible={!!voted}
        movie={voted?.movie}
        asker={voted?.asker}
        onDone={() => setVoted(null)}
      />

      <Recommended
        visible={!!added}
        movie={added?.movie}
        joined={added?.joined}
        count={added?.count}
        asker={added?.asker}
        onDone={() => setAdded(null)}
      />

    </>
  );
}


const Tag = ({ label }) => <View style={st.tag}><Text style={st.tagText}>{label}</Text></View>;


const st = makeStyles((C, S, F, shadow) => StyleSheet.create({
  page: { padding: S.lg, paddingTop: S.md },
  back: { color: C.accent, fontSize: 12, marginBottom: S.lg },
  card: { backgroundColor: C.panel, borderRadius: S.radius, padding: S.xl, ...shadow(1) },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  username: { fontSize: 12, fontWeight: '600', color: C.text },
  status: {
    borderWidth: 1, borderColor: C.tintLine, backgroundColor: C.tint,
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6,
  },
  statusClosed: { backgroundColor: C.panelHi, borderColor: C.line },
  statusText: { fontSize: 10, color: C.accent },
  owner: { flexDirection: 'row', gap: S.sm, marginTop: 18 },
  ownerBtn: {
    borderRadius: S.radiusSm, borderWidth: 1, borderColor: C.line,
    backgroundColor: C.panel, paddingHorizontal: S.lg,
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  ownerDanger: { borderColor: C.tintLine, backgroundColor: C.tint },
  ownerText: { fontSize: 13.5, fontWeight: '700', color: C.text },
  qTitle: { fontSize: 23, fontWeight: '800', color: C.text, lineHeight: 31, marginVertical: 18, letterSpacing: -0.5 },
  // the note below owns the gap, so these only need to clear their own border
  request: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 13 },
  requestLab: { fontSize: 10, fontWeight: '600', color: C.text, opacity: 0.85, letterSpacing: 0.6 },
  requestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  requestSlim: {
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line,
    paddingVertical: 11,
  },
  tally: { fontSize: 11, fontWeight: '800', color: C.accent },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: C.panelHi, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  tagText: { fontSize: 10, color: C.muted },
  stateNote: { flexDirection: 'row', gap: 10, marginTop: 12 },
  symbol: { color: C.accent, fontSize: 17, lineHeight: 21 },
  strong: { color: C.text, fontWeight: '700' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  link: { color: C.accent, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 15,
    padding: S.xxl, alignItems: 'center',
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: S.md },
  filterRow: { flexDirection: 'row', gap: 6, paddingBottom: S.md, paddingRight: S.lg },
  tab: { borderRadius: 100, backgroundColor: C.chip, paddingHorizontal: 14, paddingVertical: 9 },
  tabOn: { backgroundColor: C.accentFill },
  tabText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  reply: { paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: C.line },
  replyBody: { ...F.small, color: C.text, opacity: 0.85, marginTop: 10, marginLeft: 42, lineHeight: 21 },
  replyFooter: { marginLeft: 42, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  mine: { marginLeft: 'auto', flexDirection: 'row', gap: 16 },
  mineLink: { fontSize: 12, fontWeight: '700', color: C.muted },
  rating: { color: C.amber, fontSize: 12 },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.line,
    borderRadius: S.radiusSm, padding: S.md, color: C.text, fontSize: 14, minHeight: 48,
  },
  fieldLab: { fontSize: 12, fontWeight: '600', color: C.text, marginTop: S.lg, marginBottom: S.sm },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    borderWidth: 1, borderColor: C.tintLine, backgroundColor: C.tint,
    borderRadius: S.radiusSm, padding: S.md,
  },
  changeLink: { color: C.accent, fontSize: 12.5, fontWeight: '800' },
  credit: {
    ...F.small, color: C.text, opacity: 0.9, lineHeight: 19,
    marginTop: S.md, padding: S.md,
    backgroundColor: C.tint, borderRadius: S.radiusSm,
    borderLeftWidth: 3, borderLeftColor: C.accentFill,
  },
  hint: { fontSize: 10.5, color: C.dim, marginTop: S.sm, lineHeight: 15 },
  suggestItem: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  onList: { fontSize: 8.5, letterSpacing: 0.8, color: C.amber, fontWeight: '800' },
  thumb: { width: 34, height: 48 },
  suggestTitle: { color: C.text, fontSize: 13.5, fontWeight: '700' },
  remoteLab: { ...F.label, marginTop: S.md, marginBottom: 2 },
  rate: {
    flex: 1, minHeight: 78, borderWidth: 1, borderColor: C.line, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
    paddingVertical: 6, gap: 1,
  },
  // emoji ignore colour, so the face stays legible on the filled state too
  rateFace: { fontSize: 19, lineHeight: 24 },
  rateN: { fontSize: 13, fontWeight: '800', color: C.text },
  rateL: { fontSize: 7.5, color: C.muted, textAlign: 'center', lineHeight: 10 },
}));
