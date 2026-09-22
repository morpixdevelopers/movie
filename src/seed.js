// Seeded scenario so the app has something to explore on first launch.
// Replaced by Supabase once auth is wired; the shapes match schema.sql.

export const CATALOG = [
  { id: 'por', title: 'Por Thozhil', year: 2023, language: 'Tamil', genre: 'Thriller', runtime: 147, image: 'photo-1519608487953-e999c86e7455', color: '#314c49', aliases: ['por thozhil'] },
  { id: 'ratsasan', title: 'Ratsasan', year: 2018, language: 'Tamil', genre: 'Thriller', runtime: 170, image: 'photo-1518709268805-4e9042af9f23', color: '#614637', aliases: ['ratsasan', 'raatchasan'] },
  { id: 'd16', title: 'Dhuruvangal Pathinaaru', year: 2016, language: 'Tamil', genre: 'Mystery', runtime: 105, image: 'photo-1518837695005-2083093ee35b', color: '#374753', aliases: ['dhuruvangal pathinaaru', 'd16', 'd-16'] },
  { id: 'vikram', title: 'Vikram Vedha', year: 2017, language: 'Tamil', genre: 'Crime', runtime: 147, image: 'photo-1514905552197-0610a4d8fd73', color: '#674433', aliases: ['vikram vedha'] },
  { id: 'manjummel', title: 'Manjummel Boys', year: 2024, language: 'Malayalam', genre: 'Thriller', runtime: 135, image: 'photo-1441974231531-c6227db76b6e', color: '#394c31', aliases: ['manjummel boys', 'manjummel'] },
  { id: 'grand', title: 'The Grand Budapest Hotel', year: 2014, language: 'English', genre: 'Comedy', runtime: 99, image: 'photo-1473448912268-2022ce9509d8', color: '#655043', aliases: ['the grand budapest hotel', 'grand budapest'] },
  { id: 'arrival', title: 'Arrival', year: 2016, language: 'English', genre: 'Sci-Fi', runtime: 116, image: 'photo-1464822759023-fed622ff2c3b', color: '#46535a', aliases: ['arrival'] },
];

export const LANGS = ['Tamil','Telugu','Malayalam','Kannada','Hindi','Bengali','English','Other'];
export const GENRES = ['Thriller','Crime','Drama','Comedy','Romance','Horror','Action','Sci-Fi','Mystery','Feel Good'];

export function seed() {
  const now = Date.now();
  const users = [
    { id: 'op', name: 'Karthik S', label: 'Karthik · OP' },
    { id: 'x', name: 'Person X', label: 'Person X · visitor' },
    { id: 'y', name: 'Person Y', label: 'Person Y · visitor' },
    { id: 'u1', name: 'Arun Kumar', label: 'Arun Kumar' },
    { id: 'u2', name: 'Meera Nair', label: 'Meera Nair' },
    { id: 'u3', name: 'Siva M', label: 'Siva M' },
    { id: 'u4', name: 'Divya Ravi', label: 'Divya Ravi' },
  ];

  const reasons = {
    por: [
      'Go in blind. The investigation and the two leads carry the whole thing.',
      'A proper procedural. The mentor and rookie pairing is what makes it.',
      'Tension builds slowly and never lets up. Easiest recommendation I can make.',
    ],
    ratsasan: [
      'Gripping from the first scene. Do not read anything about it beforehand.',
      'Keep your phone out of reach for this one. Genuinely tense.',
    ],
    d16: ['Short, black and white, and the ending rearranges the whole film.'],
  };

  const recommendations = [];
  let i = 0;
  [['por', 3], ['ratsasan', 2], ['d16', 1]].forEach(([movieId, n]) => {
    for (let k = 0; k < n; k++) {
      recommendations.push({
        id: 'r' + i, questionId: 'q1', movieId,
        userId: ['u1', 'u2', 'u3', 'u4', 'y'][i % 5],
        text: reasons[movieId][k % reasons[movieId].length],
        createdAt: now - 86400000 + i * 900000,
      });
      i++;
    }
  });
  ['u1', 'u2', 'u3'].forEach((u, k) =>
    recommendations.push({
      id: 'g' + k, questionId: 'q2', movieId: 'grand', userId: u,
      text: '99 minutes of beautiful chaos. Funny, warm and unexpectedly moving.',
      createdAt: now - 8 * 86400000,
    })
  );
  recommendations.push({
    id: 'g3', questionId: 'q2', movieId: 'arrival', userId: 'u4',
    text: 'Slower, but worth it if you are in the mood to think.',
    createdAt: now - 8 * 86400000,
  });

  return {
    v: 1,
    meId: 'op',
    users,
    movies: CATALOG.map((m) => ({ ...m })),
    questions: [
      {
        id: 'q1', userId: 'op', text: 'Suggest me some Tamil thriller movies',
        lang: 'Tamil', genre: 'Thriller', constraints: 'After 2015 · No horror',
        createdAt: now - 2 * 86400000, closedAt: null, opMovieId: null, frozen: null,
      },
      {
        id: 'q2', userId: 'u4', text: 'A feel-good film under two hours for a quiet Sunday?',
        lang: 'English', genre: 'Feel Good', constraints: 'Under 120 minutes',
        createdAt: now - 9 * 86400000, closedAt: now - 6 * 86400000, opMovieId: 'grand',
        frozen: [{ movieId: 'grand', count: 3 }, { movieId: 'arrival', count: 1 }],
      },
    ],
    recommendations,
    replies: [
      { id: 'rep0', recommendationId: 'r0', questionId: 'q1', userId: 'op', text: 'Is it heavy on gore? Trying to avoid that.', createdAt: now - 3600000 },
      { id: 'rep1', recommendationId: 'r0', questionId: 'q1', userId: 'u1', text: 'Not at all. It stays a procedural the whole way.', createdAt: now - 3000000 },
    ],
    comments: [
      { id: 'c0', questionId: 'q1', userId: 'u4', text: 'Does dubbed count, or only original Tamil audio?', createdAt: now - 5400000 },
      { id: 'c1', questionId: 'q1', userId: 'op', text: 'Original audio please. Subtitles are fine.', createdAt: now - 5000000 },
    ],
    journeys: [
      { id: 'j1', questionId: 'q2', movieId: 'grand', userId: 'y', status: 'finished', rating: 5, text: 'Exactly the small escape I needed.', createdAt: now - 6 * 86400000, finishedAt: now - 5 * 86400000 },
      { id: 'j2', questionId: 'q2', movieId: 'arrival', userId: 'x', status: 'watching', rating: null, text: '', createdAt: now - 4 * 86400000, finishedAt: null },
    ],
  };
}
