const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { refreshTasteProfile } = require('../services/tasteProfile');

const router = express.Router();
const prisma = new PrismaClient();

const TASTE_SELECT = {
  tasteGenres:    true,
  tasteMoods:     true,
  tasteArtists:   true,
  tasteEras:      true,
  tastePinned:    true,
  tasteUpdatedAt: true,
};

// ── GET /api/profile/taste ────────────────────────────────────────────────────
// Returns the current user's taste profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: TASTE_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      genres:    user.tasteGenres,
      moods:     user.tasteMoods,
      artists:   user.tasteArtists,
      eras:      user.tasteEras,
      pinned:    user.tastePinned,
      updatedAt: user.tasteUpdatedAt,
    });
  } catch (e) {
    console.error('[taste/get]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/profile/taste/:username ─────────────────────────────────────────
// Returns any user's taste profile (public — for friend profile views)
router.get('/:username', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { username: req.params.username },
      select: TASTE_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      genres:    user.tasteGenres,
      moods:     user.tasteMoods,
      artists:   user.tasteArtists,
      eras:      user.tasteEras,
      updatedAt: user.tasteUpdatedAt,
    });
  } catch (e) {
    console.error('[taste/get-by-username]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/profile/taste ──────────────────────────────────────────────────
// User manually edits one or more categories. Writes to both taste fields
// and the pinned set so AI doesn't overwrite on next refresh.
router.patch('/', auth, async (req, res) => {
  const { genres, moods, artists, eras } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: { tastePinned: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pinned = (user.tastePinned && typeof user.tastePinned === 'object')
      ? { ...user.tastePinned }
      : {};

    const updates = {};
    if (genres  !== undefined) { updates.tasteGenres  = genres;  pinned.genres  = genres; }
    if (moods   !== undefined) { updates.tasteMoods   = moods;   pinned.moods   = moods; }
    if (artists !== undefined) { updates.tasteArtists = artists; pinned.artists = artists; }
    if (eras    !== undefined) { updates.tasteEras    = eras;    pinned.eras    = eras; }
    updates.tastePinned = pinned;

    const updated = await prisma.user.update({
      where:  { id: req.userId },
      data:   updates,
      select: TASTE_SELECT,
    });

    res.json({
      genres:    updated.tasteGenres,
      moods:     updated.tasteMoods,
      artists:   updated.tasteArtists,
      eras:      updated.tasteEras,
      pinned:    updated.tastePinned,
      updatedAt: updated.tasteUpdatedAt,
    });
  } catch (e) {
    console.error('[taste/patch]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/profile/taste/refresh ──────────────────────────────────────────
// Triggers an AI re-analysis of the user's taste profile
router.post('/refresh', auth, async (req, res) => {
  try {
    await refreshTasteProfile(prisma, req.userId);
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: TASTE_SELECT,
    });
    res.json({
      genres:    user.tasteGenres,
      moods:     user.tasteMoods,
      artists:   user.tasteArtists,
      eras:      user.tasteEras,
      pinned:    user.tastePinned,
      updatedAt: user.tasteUpdatedAt,
    });
  } catch (e) {
    console.error('[taste/refresh]', e);
    res.status(500).json({ error: 'Failed to refresh taste profile' });
  }
});

module.exports = router;
