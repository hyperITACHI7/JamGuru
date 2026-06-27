const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const spotify = require('../services/spotify');
const { enrichSongTags } = require('../services/lastfm');

const router = express.Router();
const prisma = new PrismaClient();

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Upsert an array of formatted tracks into the songs table, then enrich with Last.fm tags
async function cacheSongs(tracks) {
  await Promise.all(
    tracks.map(t =>
      prisma.song.upsert({
        where: { spotifyId: t.spotifyId },
        create: { ...t, cachedAt: new Date() },
        update: { ...t, cachedAt: new Date() },
      })
    )
  );
  // Fire-and-forget tag enrichment — does not block the response
  for (const t of tracks) {
    enrichSongTags(prisma, t.spotifyId, t.title, t.artist);
  }
}

// ── GET /api/songs/search?q=... ───────────────────────────────────────────────
router.get('/search', authMiddleware, async (req, res) => {
  const q = (req.query.q ?? '').trim();
  if (q.length < 2) {
    return res.json({ tracks: [], total: 0 });
  }

  try {
    const tracks = await spotify.searchTracks(q);
    cacheSongs(tracks).catch(err => console.error('Song cache error:', err));
    res.json({ tracks, total: tracks.length });
  } catch (err) {
    console.error('Spotify search error:', err.message);
    res.status(502).json({ error: 'Could not reach Spotify. Try again.' });
  }
});

// ── GET /api/songs/browse/new-releases ───────────────────────────────────────
// Must be declared before /:spotifyId to avoid routing conflict
router.get('/browse/new-releases', authMiddleware, async (req, res) => {
  try {
    const releases = await spotify.getNewReleases();
    cacheSongs(releases).catch(err => console.error('Song cache error:', err));
    res.json({ releases });
  } catch (err) {
    console.error('Spotify new-releases error:', err.message);
    res.status(502).json({ error: 'Could not reach Spotify. Try again.' });
  }
});

// ── GET /api/songs/:spotifyId ─────────────────────────────────────────────────
router.get('/:spotifyId', authMiddleware, async (req, res) => {
  const { spotifyId } = req.params;

  try {
    const cached = await prisma.song.findUnique({ where: { spotifyId } });
    const isStale = cached && (Date.now() - cached.cachedAt.getTime() > CACHE_TTL_MS);

    if (cached && !isStale && cached.previewUrl) {
      return res.json(cached);
    }

    // Fetch fresh from Spotify
    const track = await spotify.getTrack(spotifyId);
    await prisma.song.upsert({
      where: { spotifyId },
      create: { ...track, cachedAt: new Date() },
      update: { ...track, cachedAt: new Date() },
    });
    res.json(track);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Song not found' });
    }
    console.error('Song fetch error:', err.message);
    res.status(502).json({ error: 'Could not reach Spotify. Try again.' });
  }
});

module.exports = router;
