const axios = require('axios');

const LASTFM_KEY = process.env.LASTFM_API_KEY;

async function getTrackTags(title, artist) {
  if (!LASTFM_KEY) return [];
  try {
    const res = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method:  'track.getTopTags',
        artist,
        track:   title,
        api_key: LASTFM_KEY,
        format:  'json',
      },
      timeout: 4000,
    });
    const tags = res.data?.toptags?.tag ?? [];
    return tags
      .slice(0, 5)
      .map(t => t.name.toLowerCase())
      .filter(t => t.length > 0 && t !== 'seen live');
  } catch {
    return [];
  }
}

// Fire-and-forget: fetch Last.fm tags for a song and persist them.
// Safe to call without awaiting — errors are swallowed intentionally.
async function enrichSongTags(prisma, spotifyId, title, artist) {
  if (!LASTFM_KEY) return;
  try {
    const existing = await prisma.song.findUnique({
      where:  { spotifyId },
      select: { lastFmTags: true },
    });
    if (existing?.lastFmTags?.length > 0) return; // already enriched
    const tags = await getTrackTags(title, artist);
    if (tags.length > 0) {
      await prisma.song.update({
        where: { spotifyId },
        data:  { lastFmTags: tags },
      });
    }
  } catch {
    // non-critical — silently skip
  }
}

module.exports = { getTrackTags, enrichSongTags };
