// Provider-agnostic AI service for song recommendations.
// Supports Groq, OpenAI, and any OpenAI-compatible API (AI_PROVIDER != 'anthropic'),
// plus Anthropic Claude directly (AI_PROVIDER=anthropic).

const { searchTracks } = require('./spotify');
const { enrichSongTags } = require('./lastfm');

function makeClient() {
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
  const { type, client } = makeClient();

  if (type === 'anthropic') {
    const msg = await client.messages.create({
      model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0].text.trim();
  }

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });
  return completion.choices[0].message.content.trim();
}

async function getInteractionContext(prisma, senderId, friendId) {
  const [sentByMe, sentByFriend, senderLikedSongs, friendTagProfile, allSentSongs, senderProfile, friendProfile] = await Promise.all([
    // Recs I sent to friend, with likes and feedback tags
    prisma.recommendation.findMany({
      where: { senderId, recipientId: friendId },
      include: {
        song: true,
        likes: {
          where: { likerId: friendId },
          include: { feedbacks: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    }),

    // Recs friend sent to me, with my likes and feedback tags
    prisma.recommendation.findMany({
      where: { senderId: friendId, recipientId: senderId },
      include: {
        song: true,
        likes: {
          where: { likerId: senderId },
          include: { feedbacks: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    }),

    // Sender's full Spotify liked library (for artist taste profile)
    prisma.songLike.findMany({
      where: { userId: senderId },
      include: { song: { select: { title: true, artist: true } } },
      orderBy: { likedAt: 'desc' },
      take: 50,
    }),

    // Friend's aggregate tag profile across ALL their likes (not just last 20)
    prisma.likeFeedback.groupBy({
      by: ['tag'],
      where: {
        like: {
          recommendation: { recipientId: friendId },
          likerId: friendId,
        },
      },
      _count: { tag: true },
      orderBy: { _count: { tag: 'desc' } },
    }),

    // ALL songs ever sent by sender to friend (for full deduplication)
    prisma.recommendation.findMany({
      where: { senderId, recipientId: friendId },
      select: { song: { select: { title: true, artist: true } }, sentAt: true },
      orderBy: { sentAt: 'desc' },
    }),

    // Sender's taste profile
    prisma.user.findUnique({
      where:  { id: senderId },
      select: { tasteGenres: true, tasteMoods: true, tasteArtists: true, tasteEras: true },
    }),

    // Friend's taste profile
    prisma.user.findUnique({
      where:  { id: friendId },
      select: { tasteGenres: true, tasteMoods: true, tasteArtists: true, tasteEras: true },
    }),
  ]);

  return { sentByMe, sentByFriend, senderLikedSongs, friendTagProfile, allSentSongs, senderProfile, friendProfile };
}

function buildPrompt(context, senderName, friendName) {
  const { sentByMe, sentByFriend, senderLikedSongs, friendTagProfile, allSentSongs, senderProfile, friendProfile } = context;

  // ── Sender's taste from liked library ────────────────────────────────────────
  const artistCounts = {};
  for (const sl of senderLikedSongs) {
    if (sl.song?.artist) {
      artistCounts[sl.song.artist] = (artistCounts[sl.song.artist] || 0) + 1;
    }
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([artist]) => artist);

  const recentLikes = senderLikedSongs
    .slice(0, 10)
    .map(sl => `"${sl.song.title}" by ${sl.song.artist}`);

  // ── Friend's aggregate tag profile ───────────────────────────────────────────
  const tagProfileLine = friendTagProfile.length > 0
    ? friendTagProfile.slice(0, 5).map(t => `${t.tag} (${t._count.tag}×)`).join(', ')
    : null;

  // ── Interaction history ───────────────────────────────────────────────────────
  const likedByFriend = sentByMe
    .filter(r => r.likes.length > 0)
    .map(r => {
      const tags = r.likes[0]?.feedbacks?.map(f => f.tag) ?? [];
      const ctx  = r.context ? ` — note: "${r.context}"` : '';
      return `- "${r.song.title}" by ${r.song.artist}${tags.length ? ` (tags: ${tags.join(', ')})` : ''}${ctx}`;
    });

  const likedBySender = sentByFriend
    .filter(r => r.likes.length > 0)
    .map(r => {
      const tags = r.likes[0]?.feedbacks?.map(f => f.tag) ?? [];
      const ctx  = r.context ? ` — note: "${r.context}"` : '';
      return `- "${r.song.title}" by ${r.song.artist}${tags.length ? ` (tags: ${tags.join(', ')})` : ''}${ctx}`;
    });

  // Pending recs from sender with context notes (not yet liked — show AI the intent)
  const pendingWithNotes = sentByMe
    .filter(r => r.likes.length === 0 && r.context)
    .slice(0, 5)
    .map(r => `- "${r.song.title}" by ${r.song.artist} — note: "${r.context}"`);

  // ── Full deduplication list ───────────────────────────────────────────────────
  const dedupList = allSentSongs
    .slice(0, 50)
    .map(r => `"${r.song.title}" by ${r.song.artist}`);

  // ── Taste profile summary lines ───────────────────────────────────────────────
  function profileLine(profile) {
    if (!profile) return null;
    const parts = [];
    if (profile.tasteGenres?.length)  parts.push(`Genres: ${profile.tasteGenres.join(', ')}`);
    if (profile.tasteMoods?.length)   parts.push(`Moods: ${profile.tasteMoods.join(', ')}`);
    if (profile.tasteArtists?.length) parts.push(`Artists: ${profile.tasteArtists.join(', ')}`);
    if (profile.tasteEras?.length)    parts.push(`Era: ${profile.tasteEras.join(', ')}`);
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  const senderProfileLine = profileLine(senderProfile);
  const friendProfileLine  = profileLine(friendProfile);

  // ── Build prompt ──────────────────────────────────────────────────────────────
  const hasHistory = likedByFriend.length > 0 || likedBySender.length > 0;

  let prompt = `You are a music recommendation assistant.\n\n`;
  prompt += `SENDER: ${senderName}\nRECIPIENT: ${friendName}\n\n`;

  if (senderProfileLine) {
    prompt += `${senderName}'s taste profile:\n${senderProfileLine}\n\n`;
  }

  if (friendProfileLine) {
    prompt += `${friendName}'s taste profile:\n${friendProfileLine}\n\n`;
  }

  if (topArtists.length > 0) {
    prompt += `${senderName}'s top artists (from their music library):\n${topArtists.join(', ')}\n\n`;
  }

  if (recentLikes.length > 0) {
    prompt += `${senderName}'s recently liked songs:\n${recentLikes.join('\n')}\n\n`;
  }

  if (tagProfileLine) {
    prompt += `${friendName}'s all-time reaction tags (tags they give songs they love):\n${tagProfileLine}\n\n`;
  }

  if (!hasHistory) {
    prompt += `No recommendation history between these two users yet.\n\n`;
    prompt += `Based on ${senderName}'s taste, suggest ONE song they might want to recommend to ${friendName}.\n`;
  } else {
    if (likedByFriend.length > 0) {
      prompt += `Songs ${friendName} liked from ${senderName}:\n${likedByFriend.join('\n')}\n\n`;
    } else {
      prompt += `No songs ${friendName} has liked from ${senderName} yet.\n\n`;
    }

    if (likedBySender.length > 0) {
      prompt += `Songs ${senderName} liked from ${friendName}:\n${likedBySender.join('\n')}\n\n`;
    } else {
      prompt += `No songs ${senderName} has liked from ${friendName} yet.\n\n`;
    }

    if (pendingWithNotes.length > 0) {
      prompt += `Songs ${senderName} sent with personal notes (awaiting response):\n${pendingWithNotes.join('\n')}\n\n`;
    }

    prompt += `Based on all of the above, suggest ONE song ${senderName} has NOT already recommended that ${friendName} would love.\n`;
  }

  if (dedupList.length > 0) {
    prompt += `\nNEVER suggest any of these (already recommended):\n${dedupList.join('; ')}\n`;
  }

  prompt += `\nReturn only valid JSON with no extra text: {"title":"...","artist":"..."}`;

  return prompt;
}

async function suggestSong(prisma, senderId, friendId, senderName, friendName) {
  const context = await getInteractionContext(prisma, senderId, friendId);
  const prompt  = buildPrompt(context, senderName, friendName);

  const raw = await callAI(prompt);

  // Parse JSON from response (model may add markdown fences)
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`AI returned unexpected format: ${raw}`);
  const { title, artist } = JSON.parse(jsonMatch[0]);

  if (!title || !artist) throw new Error('AI response missing title or artist');

  // Look up the real track on iTunes
  const tracks = await searchTracks(`${title} ${artist}`);
  if (!tracks || tracks.length === 0) throw new Error(`No tracks found for "${title}" by ${artist}`);

  const song = tracks[0];

  // Cache the song so the recommendations endpoint can find it
  await prisma.song.upsert({
    where: { spotifyId: song.spotifyId },
    create: { ...song, cachedAt: new Date() },
    update: { ...song, cachedAt: new Date() },
  });

  // Enrich with Last.fm tags in background — does not block response
  enrichSongTags(prisma, song.spotifyId, song.title, song.artist);

  return { song, aiQuery: { title, artist } };
}

// Suggest songs directly for the user (no friend context needed — solves cold-start)
async function suggestForMe(prisma, userId) {
  const [user, songLikes, alreadyRecommended] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { tasteGenres: true, tasteMoods: true, tasteArtists: true, tasteEras: true },
    }),
    prisma.songLike.findMany({
      where:   { userId },
      include: { song: { select: { title: true, artist: true, lastFmTags: true } } },
      orderBy: { likedAt: 'desc' },
      take: 50,
    }),
    prisma.recommendation.findMany({
      where:  { recipientId: userId },
      select: { song: { select: { title: true, artist: true } } },
    }),
  ]);

  // Build sender's top artists
  const artistCounts = {};
  for (const sl of songLikes) {
    if (sl.song?.artist) artistCounts[sl.song.artist] = (artistCounts[sl.song.artist] || 0) + 1;
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([a]) => a);

  // Aggregate Last.fm tags
  const lastFmTagCounts = {};
  for (const sl of songLikes) {
    for (const tag of (sl.song?.lastFmTags ?? [])) {
      lastFmTagCounts[tag] = (lastFmTagCounts[tag] || 0) + 1;
    }
  }
  const topLastFmTags = Object.entries(lastFmTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  // Build exclusion list
  const alreadySeen = [
    ...songLikes.slice(0, 30).map(sl => `"${sl.song.title}" by ${sl.song.artist}`),
    ...alreadyRecommended.slice(0, 20).map(r => `"${r.song.title}" by ${r.song.artist}`),
  ];

  const profile = user || {};
  const hasProfile = (profile.tasteGenres?.length || profile.tasteArtists?.length || topArtists.length > 0);

  let prompt = `You are a music discovery assistant. Suggest 3 songs this user would love but hasn't heard yet.\n\n`;

  if (profile.tasteGenres?.length)  prompt += `Their preferred genres: ${profile.tasteGenres.join(', ')}\n`;
  if (profile.tasteMoods?.length)   prompt += `Their preferred moods: ${profile.tasteMoods.join(', ')}\n`;
  if (profile.tasteEras?.length)    prompt += `Their preferred eras: ${profile.tasteEras.join(', ')}\n`;
  if (profile.tasteArtists?.length) prompt += `Artists they love: ${profile.tasteArtists.join(', ')}\n`;
  else if (topArtists.length)       prompt += `Top artists from their library: ${topArtists.join(', ')}\n`;
  if (topLastFmTags.length)         prompt += `Music they enjoy is tagged: ${topLastFmTags.join(', ')}\n`;

  if (!hasProfile) {
    prompt += `No taste data yet — suggest 3 broadly loved, universally acclaimed songs.\n`;
  }

  if (alreadySeen.length > 0) {
    prompt += `\nNEVER suggest these (already in their library or inbox):\n${alreadySeen.join('; ')}\n`;
  }

  prompt += `\nReturn ONLY a valid JSON array of exactly 3 songs, no extra text:\n[{"title":"...","artist":"..."},{"title":"...","artist":"..."},{"title":"...","artist":"..."}]`;

  const raw = await callAI(prompt);
  const jsonMatch = raw.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) throw new Error('AI returned unexpected format');

  let suggestions;
  try {
    suggestions = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI response could not be parsed');
  }

  if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error('No suggestions returned');

  // Look up each song on iTunes and cache it
  const songs = [];
  for (const { title, artist } of suggestions.slice(0, 3)) {
    if (!title || !artist) continue;
    try {
      const tracks = await searchTracks(`${title} ${artist}`);
      if (!tracks?.length) continue;
      const song = tracks[0];
      await prisma.song.upsert({
        where:  { spotifyId: song.spotifyId },
        create: { ...song, cachedAt: new Date() },
        update: { ...song, cachedAt: new Date() },
      });
      enrichSongTags(prisma, song.spotifyId, song.title, song.artist);
      songs.push(song);
    } catch {
      // skip songs that can't be found
    }
  }

  if (songs.length === 0) throw new Error('Could not find any suggested songs on iTunes');
  return songs;
}

module.exports = { suggestSong, suggestForMe, getInteractionContext };
