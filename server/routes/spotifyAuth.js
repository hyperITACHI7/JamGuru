const express       = require('express');
const crypto        = require('crypto');
const jwt           = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authMiddleware   = require('../middleware/auth');
const spotifyAuth        = require('../services/spotifyAuth');
const { enrichSongTags } = require('../services/lastfm');
const { refreshTasteProfile } = require('../services/tasteProfile');

const router = express.Router();
const prisma = new PrismaClient();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Derive a safe username from a Spotify display name
async function generateUniqueUsername(displayName) {
  const base = (displayName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15) || 'user';

  let username = base;
  let existing = await prisma.user.findUnique({ where: { username } });
  let attempts = 0;
  while (existing && attempts < 10) {
    username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    existing = await prisma.user.findUnique({ where: { username } });
    attempts++;
  }
  return username;
}

// ── GET /api/auth/spotify ─────────────────────────────────────────────────────
// Redirects the browser to Spotify's OAuth consent screen
router.get('/', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.redirect(spotifyAuth.getAuthUrl(state));
});

// ── GET /api/auth/spotify/callback ────────────────────────────────────────────
// Spotify redirects here after the user grants permission
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  const CLIENT_URL = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';

  if (error || !code) {
    return res.redirect(`${CLIENT_URL}/login?error=spotify_denied`);
  }

  try {
    const tokens  = await spotifyAuth.exchangeCode(code);
    const profile = await spotifyAuth.getSpotifyProfile(tokens.access_token);

    let user = await prisma.user.findUnique({ where: { spotifyUserId: profile.id } });

    if (!user) {
      const username    = await generateUniqueUsername(profile.display_name);
      const displayName = profile.display_name || username;
      const avatarUrl   = profile.images?.[0]?.url ?? null;

      user = await prisma.user.create({
        data: {
          username,
          displayName,
          avatarUrl,
          spotifyUserId:       profile.id,
          spotifyAccessToken:  tokens.access_token,
          spotifyRefreshToken: tokens.refresh_token,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          spotifyAccessToken:  tokens.access_token,
          spotifyRefreshToken: tokens.refresh_token,
        },
      });
    }

    const jamToken = generateToken(user.id);
    res.redirect(`${CLIENT_URL}/spotify-callback?token=${jamToken}&isNew=${!user.spotifyAccessToken}`);
  } catch (err) {
    const detail = JSON.stringify(err.response?.data || err.message);
    require('fs').writeFileSync('./spotify_error.log', detail + '\n' + err.stack);
    console.error('Spotify callback error:', detail);
    res.redirect(`${CLIENT_URL}/login?error=spotify_failed`);
  }
});

// ── POST /api/auth/spotify/sync-liked ─────────────────────────────────────────
// Fetches the user's Spotify liked songs and upserts them as SongLikes
router.post('/sync-liked', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.spotifyAccessToken) {
      return res.status(400).json({ error: 'No Spotify account linked' });
    }

    let accessToken = user.spotifyAccessToken;

    // Refresh token if needed
    try {
      const tracks = await spotifyAuth.getLikedTracks(accessToken);
      return await persistLikes(req.userId, tracks, res);
    } catch (err) {
      if (err.response?.status === 401 && user.spotifyRefreshToken) {
        accessToken = await spotifyAuth.refreshAccessToken(user.spotifyRefreshToken);
        await prisma.user.update({
          where: { id: req.userId },
          data:  { spotifyAccessToken: accessToken },
        });
        const tracks = await spotifyAuth.getLikedTracks(accessToken);
        return await persistLikes(req.userId, tracks, res);
      }
      throw err;
    }
  } catch (err) {
    console.error('Sync liked error:', err.message);
    res.status(502).json({ error: 'Could not sync liked songs from Spotify' });
  }
});

async function persistLikes(userId, tracks, res) {
  // Upsert all songs
  await Promise.all(
    tracks.map(t =>
      prisma.song.upsert({
        where:  { spotifyId: t.spotifyId },
        create: { ...t, cachedAt: new Date() },
        update: { ...t, cachedAt: new Date() },
      })
    )
  );

  // Fire-and-forget Last.fm tag enrichment for each synced song
  for (const t of tracks) {
    enrichSongTags(prisma, t.spotifyId, t.title, t.artist);
  }

  // Upsert SongLikes (ignore duplicates)
  let added = 0;
  for (const t of tracks) {
    const existing = await prisma.songLike.findUnique({
      where: { userId_spotifyId: { userId, spotifyId: t.spotifyId } },
    });
    if (!existing) {
      await prisma.songLike.create({ data: { userId, spotifyId: t.spotifyId } });
      added++;
    }
  }

  // Fire-and-forget taste profile refresh — runs after sync, does not block response
  refreshTasteProfile(prisma, userId).catch(() => {});

  res.json({ synced: tracks.length, added });
}

module.exports = router;
