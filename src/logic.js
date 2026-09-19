// Pure rules for mr. No React, no storage, no network — so it can be tested
// directly with node and later re-stated as Supabase policies.
//
// Phases:
//   open    -> anyone adds a movie or backs an existing one
//   closed  -> the asker picked; list frozen, but anyone may still watch any
//              movie on it. This is what makes an old thread reusable.

export const OPEN_DAYS = 7;
export const ASK_MIN = 10;
export const POLL_MIN = 2;
export const POLL_MAX = 6;

export const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const uid = () =>
  'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const initials = (n) =>
  String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function ago(t) {
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}

export const daysLeft = (q) =>
  Math.max(0, OPEN_DAYS - Math.floor((Date.now() - q.createdAt) / 86400000));

export const isOpen = (q) => !q.closedAt;

export const findUser = (s, id) => s.users.find((u) => u.id === id) || { id, name: 'Someone' };
export const findMovie = (s, id) => s.movies.find((m) => m.id === id) || { id, title: id };
export const findQuestion = (s, id) => s.questions.find((q) => q.id === id);

// Catalogue ids may be short ("por"), so match a typed title by title and
// alias too — otherwise "Por Thozhil" would open a duplicate card.
export function resolveMovie(s, title) {
  const n = slugify(title);
  if (!n) return null;
  return (
    s.movies.find(
      (m) =>
        m.id === n ||
        slugify(m.title) === n ||
        (m.aliases || []).some((a) => slugify(a) === n)
    ) || null
  );
}

export function searchMovies(s, term) {
  const t = String(term || '').trim().toLowerCase();
  if (!t) return [];
  return s.movies
    .filter((m) => m.title.toLowerCase().includes(t))
    .sort(
      (a, b) =>
        (a.title.toLowerCase().startsWith(t) ? 0 : 1) -
        (b.title.toLowerCase().startsWith(t) ? 0 : 1)
    )
    .slice(0, 6);
}

// One card per movie. While open it is derived live; once closed it is the
// snapshot taken at close time, so later visitors see the list as it was.
export function rows(s, q) {
  if (!isOpen(q) && q.frozen) {
    return q.frozen.map((f) => ({
      ...f,
      recs: s.recommendations.filter(
        (r) => r.questionId === q.id && r.movieId === f.movieId
      ),
    }));
  }
  const g = {};
  // a poll's options exist whether or not anyone has voted for them
  if (q.kind === 'poll' && Array.isArray(q.options)) {
    q.options.forEach((mid) => { g[mid] = { movieId: mid, users: new Set(), recs: [] }; });
  }
  s.recommendations
    .filter((r) => r.questionId === q.id)
    .forEach((r) => {
      if (!g[r.movieId]) g[r.movieId] = { movieId: r.movieId, users: new Set(), recs: [] };
      g[r.movieId].users.add(r.userId);
      g[r.movieId].recs.push(r);
    });

  const out = Object.values(g).map((x) => ({ movieId: x.movieId, count: x.users.size, recs: x.recs }));

  if (q.kind === 'poll') {
    // ties fall back to the order the asker listed them in
    const order = new Map((q.options || []).map((m, i) => [m, i]));
    return out.sort((a, b) =>
      b.count - a.count ||
      (order.get(a.movieId) ?? 99) - (order.get(b.movieId) ?? 99));
  }
  return out.sort(
    (a, b) =>
      b.count - a.count ||
      findMovie(s, a.movieId).title.localeCompare(findMovie(s, b.movieId).title)
  );
}

export function metrics(s, qid, mid) {
  const js = s.journeys.filter((j) => j.questionId === qid && j.movieId === mid);
  const fin = js.filter((j) => j.status === 'finished');
  const rated = fin.filter((j) => Number.isFinite(j.rating));
  return {
    watching: js.filter((j) => j.status === 'watching').length,
    finished: fin.length,
    total: js.length,
    rating: rated.length
      ? Number((rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1))
      : null,
    ratings: rated.length,
  };
}

export const myJourney = (s, qid, mid) =>
  s.journeys.find((j) => j.questionId === qid && j.movieId === mid && j.userId === s.meId);
export const myJourneyIn = (s, qid) =>
  s.journeys.find((j) => j.questionId === qid && j.userId === s.meId);

// A recommender's score is the average rating given by people who watched a
// movie on their word. Anyone who also recommended that movie is excluded —
// they did not discover it from anyone, so their rating is not evidence.
export function recommenderScore(s, userId) {
  const mine = new Set(
    s.recommendations.filter((r) => r.userId === userId).map((r) => r.questionId + '|' + r.movieId)
  );
  if (!mine.size) return { avg: null, ratings: 0, watches: 0, recommended: 0, hearts: 0 };

  const backers = new Map();
  s.recommendations.forEach((r) => {
    const k = r.questionId + '|' + r.movieId;
    if (!backers.has(k)) backers.set(k, new Set());
    backers.get(k).add(r.userId);
  });

  const followed = s.journeys.filter((j) => {
    const k = j.questionId + '|' + j.movieId;
    return mine.has(k) && !backers.get(k).has(j.userId);
  });
  const rated = followed.filter((j) => j.status === 'finished' && Number.isFinite(j.rating));

  return {
    avg: rated.length
      ? Number((rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1))
      : null,
    ratings: rated.length,
    watches: followed.length,
    recommended: mine.size,
    hearts: s.hearts.filter((h) => h.toUserId === userId).length,
  };
}

// Every movie across every collection, pooled. Home shows questions;
// this is the other axis — what the whole community keeps recommending.
export function movieBoard(s, { lang, genre, term } = {}) {
  const acc = {};
  s.recommendations.forEach((r) => {
    const m = findMovie(s, r.movieId);
    if (!acc[r.movieId]) {
      acc[r.movieId] = {
        movieId: r.movieId, movie: m,
        people: new Set(), collections: new Set(),
        watched: 0, finished: 0, ratings: [],
      };
    }
    acc[r.movieId].people.add(r.userId);
    acc[r.movieId].collections.add(r.questionId);
  });
  s.journeys.forEach((j) => {
    const a = acc[j.movieId];
    if (!a) return;
    a.watched++;
    if (j.status === 'finished') {
      a.finished++;
      if (Number.isFinite(j.rating)) a.ratings.push(j.rating);
    }
  });

  const t = String(term || '').trim().toLowerCase();
  return Object.values(acc)
    .map((a) => ({
      movieId: a.movieId,
      movie: a.movie,
      recommenders: a.people.size,
      collections: a.collections.size,
      watched: a.watched,
      finished: a.finished,
      rating: a.ratings.length
        ? Number((a.ratings.reduce((x, y) => x + y, 0) / a.ratings.length).toFixed(1))
        : null,
    }))
    .filter((a) => (!lang || a.movie.language === lang))
    .filter((a) => (!genre || a.movie.genre === genre))
    .filter((a) => !t || a.movie.title.toLowerCase().includes(t))
    .sort((a, b) =>
      b.recommenders - a.recommenders ||
      b.watched - a.watched ||
      a.movie.title.localeCompare(b.movie.title));
}

// Things that happened because of you, or that need you.
export function activity(s) {
  const out = [];
  const meQs = new Set(s.questions.filter((q) => q.userId === s.meId).map((q) => q.id));
  const myRecs = s.recommendations.filter((r) => r.userId === s.meId);
  const myRecKeys = new Set(myRecs.map((r) => r.questionId + '|' + r.movieId));

  s.recommendations.forEach((r) => {
    if (r.userId !== s.meId && meQs.has(r.questionId)) {
      out.push({
        id: 'rec-' + r.id, at: r.createdAt, kind: 'rec',
        text: `${findUser(s, r.userId).name} recommended ${findMovie(s, r.movieId).title} for your question.`,
        questionId: r.questionId,
      });
    }
  });
  s.journeys.forEach((j) => {
    if (j.userId === s.meId) return;
    if (!myRecKeys.has(j.questionId + '|' + j.movieId)) return;
    out.push({
      id: 'w-' + j.id, at: j.finishedAt || j.createdAt,
      kind: j.status === 'finished' ? 'finished' : 'watching',
      text: j.status === 'finished'
        ? `${findUser(s, j.userId).name} finished ${findMovie(s, j.movieId).title} and rated it ${j.rating}/5.`
        : `${findUser(s, j.userId).name} is watching ${findMovie(s, j.movieId).title} on your word.`,
      questionId: j.questionId,
    });
  });
  s.hearts.forEach((h) => {
    if (h.toUserId !== s.meId) return;
    out.push({
      id: 'h-' + h.id, at: h.createdAt, kind: 'heart',
      text: `${findUser(s, h.fromUserId).name} thanked you for ${findMovie(s, h.movieId).title}.`,
      questionId: h.questionId,
    });
  });
  return out.sort((a, b) => b.at - a.at);
}

// What is waiting on you right now.
export function todo(s) {
  const out = [];
  s.questions.forEach((q) => {
    if (q.userId === s.meId && isOpen(q) && rows(s, q).length > 0) {
      out.push({ id: 'pick-' + q.id, questionId: q.id, kind: 'pick',
        text: `Choose your movie for “${q.text}”`, sub: `${rows(s, q).length} movies waiting` });
    }
  });
  s.journeys.forEach((j) => {
    if (j.userId === s.meId && j.status === 'watching') {
      out.push({ id: 'rate-' + j.id, questionId: j.questionId, kind: 'rate',
        text: `How was ${findMovie(s, j.movieId).title}?`, sub: 'Rate it so the collection keeps working' });
    }
  });
  return out;
}

// Your own recommendations and how each one actually landed. Profile-only:
// Discover shows the community, this shows you.
export function myRecommendations(s, userId) {
  const backers = new Map();
  s.recommendations.forEach((r) => {
    const k = r.questionId + '|' + r.movieId;
    if (!backers.has(k)) backers.set(k, new Set());
    backers.get(k).add(r.userId);
  });

  return s.recommendations
    .filter((r) => r.userId === userId)
    .map((r) => {
      const k = r.questionId + '|' + r.movieId;
      const followed = s.journeys.filter(
        (j) => j.questionId === r.questionId && j.movieId === r.movieId && !backers.get(k).has(j.userId)
      );
      const rated = followed.filter((j) => j.status === 'finished' && Number.isFinite(j.rating));
      const q = findQuestion(s, r.questionId);
      return {
        id: r.id,
        movie: findMovie(s, r.movieId),
        questionId: r.questionId,
        question: q ? q.text : '',
        isPick: q && q.opMovieId === r.movieId,
        watched: followed.length,
        finished: followed.filter((j) => j.status === 'finished').length,
        rating: rated.length
          ? Number((rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1))
          : null,
        hearts: s.hearts.filter(
          (h) => h.questionId === r.questionId && h.movieId === r.movieId && h.toUserId === userId
        ).length,
        createdAt: r.createdAt,
      };
    })
    .sort((a, b) => b.hearts - a.hearts || b.watched - a.watched || b.createdAt - a.createdAt);
}

/** Films you finished, newest first, with the rating you gave. */
export function myWatched(s, userId) {
  return s.journeys
    .filter((j) => j.userId === userId && j.status === 'finished')
    .map((j) => ({
      id: j.id,
      movie: findMovie(s, j.movieId),
      rating: j.rating,
      text: j.text,
      at: j.finishedAt || j.createdAt,
      questionId: j.questionId,
    }))
    .sort((a, b) => b.at - a.at);
}

export function leaderboard(s) {
  return s.users
    .map((u) => ({ user: u, ...recommenderScore(s, u.id) }))
    .filter((x) => x.recommended > 0)
    .sort((a, b) => b.hearts - a.hearts || (b.avg || 0) - (a.avg || 0) || b.watches - a.watches);
}

/**
 * Resolve a typed title (plus any IMDb metadata) to a movie in state,
 * creating it if new. Shared by suggestions and poll options so the two can
 * never disagree about what counts as the same film.
 */
export function ensureMovie(s, { title, imdbId, posterUrl, year, language }, fallbackLang) {
  const name = String(title || '').trim();
  if (!name) return null;
  // an IMDb id is authoritative — two spellings can never open two cards
  let entry = (imdbId && s.movies.find((m) => m.imdbId === imdbId)) || resolveMovie(s, name);
  const id = entry ? entry.id : slugify(name);
  if (!id) return null;
  if (!entry) {
    entry = {
      id, title: name, year: year || '', genre: '',
      language: language || fallbackLang, lang: fallbackLang,
      aliases: [name.toLowerCase()],
      imdbId: imdbId ?? undefined,
      posterUrl: posterUrl ?? undefined,
    };
    s.movies.push(entry);
  } else {
    if (posterUrl && !entry.posterUrl) entry.posterUrl = posterUrl;
    if (imdbId && !entry.imdbId) entry.imdbId = imdbId;
    if (year && !entry.year) entry.year = year;
  }
  return entry;
}

export const isPoll = (q) => q && q.kind === 'poll';
export const myVote = (s, qid) =>
  s.recommendations.find((r) => r.questionId === qid && r.userId === s.meId);

// ── mutations ────────────────────────────────────────────────────────────
// Every write goes through apply(). It returns {state} on success or {error}
// on refusal, so the UI never has to repeat a rule. These are the same
// guards that exist as RLS policies in supabase/schema.sql.

export function apply(state, action) {
  const s = JSON.parse(JSON.stringify(state));
  const q = action.questionId ? findQuestion(s, action.questionId) : null;
  const fail = (error) => ({ error });

  switch (action.type) {
    case 'ask': {
      const body = String(action.text || '').trim();
      if (!body) return fail('Write what you are looking for.');
      if (body.length < ASK_MIN)
        return fail(`Too short — ${body.length} of ${ASK_MIN} characters.`);
      const kind = action.kind === 'poll' ? 'poll' : 'open';
      let options = [];
      if (kind === 'poll') {
        const raw = Array.isArray(action.options) ? action.options : [];
        const ids = [];
        raw.forEach((o) => {
          const entry = ensureMovie(s, typeof o === 'string' ? { title: o } : o, action.lang);
          if (entry && !ids.includes(entry.id)) ids.push(entry.id);
        });
        if (ids.length < 2) return fail('A poll needs at least 2 movies to choose between.');
        if (ids.length > POLL_MAX) return fail(`${POLL_MAX} options is the most a poll can hold.`);
        options = ids;
      }

      const id = uid();
      s.questions.unshift({
        id, userId: s.meId, text: body, kind, options,
        lang: action.lang, genre: action.genre,
        constraints: String(action.constraints || '').trim(),
        createdAt: Date.now(), closedAt: null, opMovieId: null, frozen: null,
      });
      return { state: s, questionId: id, kind }; // the Posted overlay is the feedback
    }

    case 'suggest': {
      if (!q) return fail('Question not found.');
      if (q.kind === 'poll')
        return fail('This is a poll — pick one of the options instead.');
      if (!isOpen(q))
        return fail('Suggestions are closed. The list is frozen — but you can still pick from it.');
      const title = String(action.title || '').trim();
      if (!title) return fail('Which movie?');
      const body = String(action.text || '').trim();
      if (!body) return fail('Add a short reason — that is what makes it worth something.');

      const meta = action.meta || {};
      // An IMDb pick is authoritative: match on imdbId first so two spellings
      // of the same film can never open two cards.
      let entry = (meta.imdbId && s.movies.find((m) => m.imdbId === meta.imdbId)) || resolveMovie(s, title);
      const movieId = entry ? entry.id : slugify(title);
      if (!movieId) return fail('That title needs a letter or number.');
      if (!entry) {
        entry = {
          id: movieId, title, year: meta.year || '', genre: action.genre || '',
          language: meta.language || q.lang, lang: q.lang,
          aliases: [title.toLowerCase()],
          imdbId: meta.imdbId ?? undefined,
          posterUrl: meta.posterUrl ?? undefined,
        };
        s.movies.push(entry);
      } else if (meta.posterUrl && !entry.posterUrl) {
        // first time anyone attaches a real poster to a film we already had
        entry.posterUrl = meta.posterUrl;
        if (meta.imdbId) entry.imdbId = meta.imdbId;
        if (!entry.year && meta.year) entry.year = meta.year;
      }
      if (s.recommendations.some((r) => r.questionId === q.id && r.movieId === movieId && r.userId === s.meId))
        return fail(`You already recommended ${entry.title} here.`);

      const joined = s.recommendations.some((r) => r.questionId === q.id && r.movieId === movieId);
      s.recommendations.push({
        id: uid(), questionId: q.id, movieId, userId: s.meId, text: body, createdAt: Date.now(),
      });
      const backers = new Set(
        s.recommendations.filter((r) => r.questionId === q.id && r.movieId === movieId).map((r) => r.userId)
      ).size;
      // no toast: the Recommended overlay is the feedback
      return { state: s, movieId, joined, count: backers };
    }

    case 'vote': {
      if (!q) return fail('Question not found.');
      if (q.kind !== 'poll') return fail('This question takes recommendations, not votes.');
      if (!isOpen(q)) return fail('Voting closed — but you can still pick any movie on the list.');
      if (q.userId === s.meId) return fail('You are the one asking. Let other people decide.');
      if (!(q.options || []).includes(action.movieId))
        return fail('That is not one of the options.');

      const prev = s.recommendations.find((r) => r.questionId === q.id && r.userId === s.meId);
      if (prev && prev.movieId === action.movieId && !action.text)
        return fail(`You already voted for ${findMovie(s, action.movieId).title}.`);

      // one vote each — changing your mind replaces it, never adds
      s.recommendations = s.recommendations.filter(
        (r) => !(r.questionId === q.id && r.userId === s.meId)
      );
      s.recommendations.push({
        id: uid(), questionId: q.id, movieId: action.movieId, userId: s.meId,
        text: String(action.text || '').trim(), createdAt: Date.now(),
      });
      const tally = new Set(
        s.recommendations.filter((r) => r.questionId === q.id && r.movieId === action.movieId)
          .map((r) => r.userId)
      ).size;
      return {
        state: s, movieId: action.movieId, count: tally,
        changed: !!prev && prev.movieId !== action.movieId,
      };
    }

    case 'choose': {
      if (!q) return fail('Question not found.');
      if (q.userId !== s.meId)
        return fail(`Only ${findUser(s, q.userId).name} can close this.`);
      if (!isOpen(q)) return fail('Already closed — the pick cannot be changed.');
      const list = rows(s, q);
      if (!list.some((r) => r.movieId === action.movieId))
        return fail('Pick a movie that was actually recommended.');
      q.frozen = list.map((r) => ({ movieId: r.movieId, count: r.count }));
      q.closedAt = Date.now();
      q.opMovieId = action.movieId;
      s.journeys.push({
        id: uid(), questionId: q.id, movieId: action.movieId, userId: s.meId,
        status: 'watching', rating: null, text: '', createdAt: Date.now(), finishedAt: null,
      });
      return { state: s, toast: `Suggestions closed. ${findMovie(s, action.movieId).title} is your pick.` };
    }

    case 'watch': {
      if (!q) return fail('Question not found.');
      if (isOpen(q)) return fail(`Suggestions are still open. ${findUser(s, q.userId).name} picks first.`);
      if (!rows(s, q).some((r) => r.movieId === action.movieId))
        return fail('That movie is not on this list.');
      const mine = myJourney(s, q.id, action.movieId);
      if (mine && mine.status === 'finished') return fail('You already finished this one.');
      if (mine) return fail('You are already watching this.');
      const other = s.journeys.find((j) => j.questionId === q.id && j.userId === s.meId && j.status === 'watching');
      if (other) s.journeys = s.journeys.filter((j) => j.id !== other.id);
      s.journeys.push({
        id: uid(), questionId: q.id, movieId: action.movieId, userId: s.meId,
        status: 'watching', rating: null, text: '', createdAt: Date.now(), finishedAt: null,
      });
      const t = findMovie(s, action.movieId).title;
      return { state: s, toast: other ? `Switched to ${t}.` : `You are watching ${t}.` };
    }

    case 'finish': {
      const j = myJourney(s, action.questionId, action.movieId);
      if (!j) return fail('Mark it as watching first.');
      if (!Number.isFinite(action.rating)) return fail('Give it a rating out of 5.');
      j.status = 'finished';
      j.rating = action.rating;
      j.text = String(action.text || '').trim();
      j.finishedAt = Date.now();
      return { state: s, toast: 'Experience saved. Now tell the people who helped.' };
    }

    case 'hearts': {
      const recs = s.recommendations.filter(
        (r) => r.questionId === action.questionId && r.movieId === action.movieId
      );
      const valid = new Set(recs.map((r) => r.userId));
      // you can only thank someone who recommended this film, and never yourself
      const want = (action.toUserIds || []).filter((to) => valid.has(to) && to !== s.meId);
      if (!want.length) return fail('Pick at least one person who helped you choose.');

      const already = (to) => s.hearts.some((h) =>
        h.questionId === action.questionId && h.movieId === action.movieId &&
        h.fromUserId === s.meId && h.toUserId === to);

      const fresh = want.filter((to) => !already(to));
      if (!fresh.length) {
        return fail(want.length === 1
          ? `You already thanked ${findUser(s, want[0]).name}.`
          : 'You already thanked everyone you picked.');
      }

      fresh.forEach((to) => {
        s.hearts.push({
          id: uid(), questionId: action.questionId, movieId: action.movieId,
          fromUserId: s.meId, toUserId: to, createdAt: Date.now(),
        });
      });
      // no toast: the Thanked overlay is the feedback
      return { state: s, thanked: fresh.map((to) => findUser(s, to).name.split(' ')[0]) };
    }

    case 'comment': {
      if (!q) return fail('Question not found.');
      const body = String(action.text || '').trim();
      if (!body) return fail('Write something first.');
      s.comments.push({ id: uid(), questionId: q.id, userId: s.meId, text: body, createdAt: Date.now() });
      return { state: s, toast: 'Comment posted.' };
    }

    case 'reply': {
      const rec = s.recommendations.find((r) => r.id === action.recommendationId);
      if (!rec) return fail('That recommendation is gone.');
      const body = String(action.text || '').trim();
      if (!body) return fail('Write a reply first.');
      s.replies.push({
        id: uid(), recommendationId: rec.id, questionId: rec.questionId,
        userId: s.meId, text: body, createdAt: Date.now(),
      });
      return { state: s, toast: 'Reply posted.' };
    }

    case 'switchUser':
      s.meId = action.userId;
      return { state: s, toast: `Acting as ${findUser(s, action.userId).name}.` };

    default:
      return fail('Unknown action.');
  }
}
