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

// ── GET /api/songs/:spotifyId/friend-matches ──────────────────────────────────
// Returns the current user's friends sorted by taste compatibility with the song.
// Score = overlapping tags / total unique song tags * 100 (0–100).
router.get('/:spotifyId/friend-matches', authMiddleware, async (req, res) => {
  const { spotifyId } = req.params;
  try {
    const [song, friendships] = await Promise.all([
      prisma.song.findUnique({ where: { spotifyId }, select: { lastFmTags: true } }),
      prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: req.userId }, { addresseeId: req.userId }],
        },
        include: {
          requester: {
            select: {
              id: true, username: true, displayName: true, avatarUrl: true,
              tasteGenres: true, tasteMoods: true, tasteArtists: true,
            },
          },
          addressee: {
            select: {
              id: true, username: true, displayName: true, avatarUrl: true,
              tasteGenres: true, tasteMoods: true, tasteArtists: true,
            },
          },
        },
      }),
    ]);

    const songTags = (song?.lastFmTags ?? []).map(t => t.toLowerCase());

    const friends = friendships.map(f => {
      const friend = f.requesterId === req.userId ? f.addressee : f.requester;
      const tasteTags = [
        ...(friend.tasteGenres  ?? []),
        ...(friend.tasteMoods   ?? []),
        ...(friend.tasteArtists ?? []),
      ].map(t => t.toLowerCase());

      const matchCount = songTags.filter(tag => tasteTags.includes(tag)).length;
      const matchScore = songTags.length > 0
        ? Math.round((matchCount / songTags.length) * 100)
        : 0;

      return {
        id:          friend.id,
        username:    friend.username,
        displayName: friend.displayName,
        avatarUrl:   friend.avatarUrl,
        matchScore,
      };
    });

    friends.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ friends });
  } catch (e) {
    console.error('[song/friend-matches]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/songs/:spotifyId ─────────────────────────────────────────────────
router.get('/:spotifyId', authMiddleware, async (req, res) => {
  const { spotifyId } = req.params;

  try {
    const cached = await prisma.song.findUnique({ where: { spotifyId } });
    const isStale = cached && (Date.now() - cached.cachedAt.getTime() > CACHE_TTL_MS);

    // Fast path: fresh cache entry that already has a preview URL
    if (cached && !isStale && cached.previewUrl) {
      return res.json(cached);
    }

    // iTunes IDs are purely numeric. Spotify IDs are alphanumeric (e.g. "4iV5W9uYEdYUVa79Axb7Rh").
    // For non-numeric IDs (Spotify-synced songs), the iTunes /lookup endpoint will return
    // nothing, so skip straight to the title+artist search fallback.
    const isItunesId = /^\d+$/.test(spotifyId);

    if (isItunesId) {
      // Try a precise iTunes lookup first
      try {
        const track = await spotify.getTrack(spotifyId);
        await prisma.song.upsert({
          where: { spotifyId },
          create: { ...track, cachedAt: new Date() },
          update: { ...track, cachedAt: new Date() },
        });
        return res.json(track);
      } catch (lookupErr) {
        // Fall through to title+artist search if we have cached metadata
        if (!cached) {
          if (lookupErr.response?.status === 404) return res.status(404).json({ error: 'Song not found' });
          throw lookupErr;
        }
      }
    }

    // Fallback: search iTunes by title + artist to resolve a preview URL.
    // This covers (a) Spotify-synced songs with non-numeric IDs and
    // (b) iTunes songs whose preview URL expired or was never stored.
    if (cached) {
      try {
        const results = await spotify.searchTracks(`${cached.title} ${cached.artist}`);
        const match = results.find(r => r.previewUrl);
        if (match?.previewUrl) {
          await prisma.song.update({
            where: { spotifyId },
            data:  { previewUrl: match.previewUrl, cachedAt: new Date() },
          });
          return res.json({ ...cached, previewUrl: match.previewUrl });
        }
      } catch (_) { /* search failed — return what we have */ }
      return res.json(cached);
    }

    return res.status(404).json({ error: 'Song not found' });
  } catch (err) {
    console.error('Song fetch error:', err.message);
    res.status(502).json({ error: 'Could not reach iTunes. Try again.' });
  }
});

module.exports = router;
