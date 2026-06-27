// AI-powered taste profile builder.
// Analyses a user's liked songs library + feedback tags + Last.fm song tags
// to derive genre/mood/artist/era preferences. Results are written back to
// User.taste* fields. User-pinned tags are never overwritten by AI.

const { getTrackTags } = require('./lastfm');

const GENRE_OPTIONS = [
  'hip-hop', 'r&b', 'pop', 'rock', 'indie', 'electronic',
  'jazz', 'classical', 'metal', 'latin', 'soul', 'folk', 'reggae', 'country',
];

const MOOD_OPTIONS = [
  'chill', 'party', 'late night', 'workout', 'focus', 'road trip',
  'heartbreak', 'happy', 'nostalgic', 'romantic',
];

const ERA_OPTIONS = ['80s', '90s', '2000s', '2010s', 'current'];

function makeAIClient() {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const apiKey   = process.env.AI_API_KEY;
  const baseURL  = process.env.AI_BASE_URL;

  if (provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    return { type: 'anthropic', client: new Anthropic.default({ apiKey }) };
  }

  const OpenAI = require('openai');
  const opts = { apiKey };
  if (baseURL) opts.baseURL = baseURL;
  return { type: 'openai', client: new OpenAI.default(opts) };
}

async function callAI(prompt) {
  const model = process.env.AI_MODEL || 'llama-3.1-8b-instant';
  const { type, client } = makeAIClient();

  if (type === 'anthropic') {
    const msg = await client.messages.create({
      model,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0].text.trim();
  }

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });
  return completion.choices[0].message.content.trim();
}

async function refreshTasteProfile(prisma, userId) {
  // ── 1. Gather signals ──────────────────────────────────────────────────────

  const [user, songLikes, songDislikes, feedbackTags] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { tastePinned: true },
    }),
    prisma.songLike.findMany({
      where:   { userId },
      include: { song: { select: { title: true, artist: true, lastFmTags: true } } },
      orderBy: { likedAt: 'desc' },
      take: 100,
    }),
    prisma.songDislike.findMany({
      where:   { userId },
      include: { song: { select: { title: true, artist: true, lastFmTags: true } } },
      orderBy: { dislikedAt: 'desc' },
      take: 50,
    }),
    prisma.likeFeedback.groupBy({
      by:      ['tag'],
      where:   { like: { recommendation: { recipientId: userId }, likerId: userId } },
      _count:  { tag: true },
      orderBy: { _count: { tag: 'desc' } },
    }),
  ]);

  if (!user) return;

  // ── 2. Derive top artists ──────────────────────────────────────────────────
  const artistCounts = {};
  for (const sl of songLikes) {
    if (sl.song?.artist) {
      artistCounts[sl.song.artist] = (artistCounts[sl.song.artist] || 0) + 1;
    }
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist]) => artist);

  // ── 2b. Derive top disliked artists ───────────────────────────────────────
  const dislikedArtistCounts = {};
  for (const sd of songDislikes) {
    if (sd.song?.artist) {
      dislikedArtistCounts[sd.song.artist] = (dislikedArtistCounts[sd.song.artist] || 0) + 1;
    }
  }
  const topDislikedArtists = Object.entries(dislikedArtistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([artist]) => artist);

  // ── 3. Aggregate Last.fm tags from liked songs ─────────────────────────────
  const lastFmTagCounts = {};
  for (const sl of songLikes) {
    for (const tag of (sl.song?.lastFmTags ?? [])) {
      lastFmTagCounts[tag] = (lastFmTagCounts[tag] || 0) + 1;
    }
  }

  // For songs without tags, fetch a sample from Last.fm (up to 10 un-tagged songs)
  const untagged = songLikes.filter(sl => !sl.song?.lastFmTags?.length).slice(0, 10);
  await Promise.all(
    untagged.map(async sl => {
      const tags = await getTrackTags(sl.song.title, sl.song.artist);
      for (const tag of tags) {
        lastFmTagCounts[tag] = (lastFmTagCounts[tag] || 0) + 1;
      }
    })
  );

  const topLastFmTags = Object.entries(lastFmTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => `${tag}(${count})`);

  // ── 3b. Aggregate Last.fm tags from disliked songs ────────────────────────
  const dislikedTagCounts = {};
  for (const sd of songDislikes) {
    for (const tag of (sd.song?.lastFmTags ?? [])) {
      dislikedTagCounts[tag] = (dislikedTagCounts[tag] || 0) + 1;
    }
  }
  const untaggedDislikes = songDislikes.filter(sd => !sd.song?.lastFmTags?.length).slice(0, 10);
  await Promise.all(
    untaggedDislikes.map(async sd => {
      const tags = await getTrackTags(sd.song.title, sd.song.artist);
      for (const tag of tags) {
        dislikedTagCounts[tag] = (dislikedTagCounts[tag] || 0) + 1;
      }
    })
  );
  const topDislikedTags = Object.entries(dislikedTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  // ── 4. User's own feedback tags ────────────────────────────────────────────
  const userFeedbackTags = feedbackTags
    .slice(0, 8)
    .map(t => `${t.tag}(${t._count.tag})`);

  // ── 5. Build AI prompt ────────────────────────────────────────────────────
  if (!process.env.AI_API_KEY) return; // silently skip if AI not configured

  const prompt = `You are a music taste analyst. Based on the signals below, return a JSON taste profile.

Top artists from this user's liked songs library:
${topArtists.length > 0 ? topArtists.join(', ') : 'No data yet'}

Last.fm community tags on songs they like (tag(count)):
${topLastFmTags.length > 0 ? topLastFmTags.join(', ') : 'No data yet'}

Tags this user assigns when they like a recommended song (tag(count)):
${userFeedbackTags.length > 0 ? userFeedbackTags.join(', ') : 'No data yet'}

Artists this user has actively DISLIKED (never include these in the artists array):
${topDislikedArtists.length > 0 ? topDislikedArtists.join(', ') : 'None'}

Tags from songs this user has actively DISLIKED (avoid picking genres/moods that match these):
${topDislikedTags.length > 0 ? topDislikedTags.join(', ') : 'None'}

Valid genres (pick 1-4 that fit best): ${GENRE_OPTIONS.join(', ')}
Valid moods (pick 1-4 that fit best): ${MOOD_OPTIONS.join(', ')}
Valid eras (pick 1-3 that fit best): ${ERA_OPTIONS.join(', ')}
Top artists (pick up to 8 from their actual library above): [from the list above]

Return ONLY valid JSON, no extra text:
{"genres":["..."],"moods":["..."],"artists":["..."],"eras":["..."]}`;

  const raw = await callAI(prompt);
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return;

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return;
  }

  const { genres = [], moods = [], artists = [], eras = [] } = parsed;

  // ── 6. Merge with pinned tags (user-set tags take precedence) ─────────────
  const pinned = (user.tastePinned && typeof user.tastePinned === 'object')
    ? user.tastePinned
    : {};

  const merge = (aiTags, pinnedTags = []) => {
    const pinnedSet = new Set(pinnedTags);
    // Keep all pinned tags + fill with AI tags that aren't pinned
    return [...pinnedSet, ...aiTags.filter(t => !pinnedSet.has(t))].slice(0, 8);
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      tasteGenres:     merge(genres,  pinned.genres),
      tasteMoods:      merge(moods,   pinned.moods),
      tasteArtists:    merge(artists, pinned.artists),
      tasteEras:       merge(eras,    pinned.eras),
      tasteUpdatedAt:  new Date(),
    },
  });
}

module.exports = { refreshTasteProfile };
