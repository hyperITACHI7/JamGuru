const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { recomputeScores, FEEDBACK_TAGS } = require('../../services/phase4/scoring');
const { pushNotify } = require('../../services/pushNotifier');
const { refreshTasteProfile } = require('../../services/tasteProfile');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/recommendations/:id/like
router.post('/recommendations/:id/like', auth, async (req, res) => {
  try {
    const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id }, include: { song: true } });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.recipientId !== req.userId) return res.status(403).json({ error: 'Not your recommendation' });
    if (rec.senderId === req.userId) return res.status(400).json({ error: 'Cannot like your own recommendation' });

    let like;
    try {
      like = await prisma.like.create({
        data: { recommendationId: req.params.id, likerId: req.userId },
      });
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'Already liked' });
      throw e;
    }

    // Also save the song to the user's Liked Songs playlist
    await prisma.songLike.upsert({
      where: { userId_spotifyId: { userId: req.userId, spotifyId: rec.songId } },
      create: { userId: req.userId, spotifyId: rec.songId },
      update: {},
    });

    await recomputeScores(prisma, { recommendationId: req.params.id, likerId: req.userId });
    refreshTasteProfile(prisma, req.userId).catch(() => {});

    // Push notification to rec sender (fire-and-forget)
    prisma.user.findUnique({ where: { id: req.userId }, select: { displayName: true } })
      .then(liker => pushNotify(prisma, rec.senderId, {
        title: `${liker.displayName} loved your rec ❤️`,
        body: rec.song?.title ?? 'Your recommendation',
        url: '/jamguru',
      })).catch(() => {})

    const likeCount = await prisma.like.count({ where: { recommendationId: req.params.id } });
    res.json({ liked: true, likeCount, likeId: like.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/recommendations/:id/like
router.delete('/recommendations/:id/like', auth, async (req, res) => {
  try {
    const like = await prisma.like.findFirst({
      where: { recommendationId: req.params.id, likerId: req.userId },
    });
    if (!like) return res.status(404).json({ error: 'Like not found' });

    await prisma.like.delete({ where: { id: like.id } });
    await recomputeScores(prisma, { recommendationId: req.params.id, likerId: req.userId });

    const likeCount = await prisma.like.count({ where: { recommendationId: req.params.id } });
    res.json({ liked: false, likeCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/likes/songs — merged: direct song likes + songs from liked recommendations
router.get('/likes/songs', auth, async (req, res) => {
  try {
    const [directLikes, recLikes] = await Promise.all([
      prisma.songLike.findMany({
        where: { userId: req.userId },
        include: { song: true },
        orderBy: { likedAt: 'desc' },
      }),
      prisma.like.findMany({
        where: { likerId: req.userId },
        include: { recommendation: { include: { song: true } } },
        orderBy: { likedAt: 'desc' },
      }),
    ]);

    const seen = new Set();
    const songs = [];

    for (const sl of directLikes) {
      if (!seen.has(sl.spotifyId)) { seen.add(sl.spotifyId); songs.push(sl.song); }
    }
    for (const like of recLikes) {
      const song = like.recommendation?.song;
      if (song && !seen.has(song.spotifyId)) { seen.add(song.spotifyId); songs.push(song); }
    }

    res.json({ songs, count: songs.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/songs/:id/liked — check if the current user has directly liked this song
router.get('/songs/:id/liked', auth, async (req, res) => {
  try {
    const sl = await prisma.songLike.findUnique({
      where: { userId_spotifyId: { userId: req.userId, spotifyId: req.params.id } },
    });
    res.json({ liked: !!sl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/songs/:id/like — directly like a song (saves it to Liked Songs)
router.post('/songs/:id/like', auth, async (req, res) => {
  try {
    const song = await prisma.song.findUnique({ where: { spotifyId: req.params.id } });
    if (!song) return res.status(404).json({ error: 'Song not cached — search for it first' });

    await prisma.songLike.upsert({
      where: { userId_spotifyId: { userId: req.userId, spotifyId: req.params.id } },
      create: { userId: req.userId, spotifyId: req.params.id },
      update: {},
    });
    refreshTasteProfile(prisma, req.userId).catch(() => {});
    res.json({ liked: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/songs/:id/like — unlike a directly liked song
router.delete('/songs/:id/like', auth, async (req, res) => {
  try {
    await prisma.songLike.deleteMany({
      where: { userId: req.userId, spotifyId: req.params.id },
    });
    res.json({ liked: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/songs/:id/dislike — song-level dislike (for group chats and general use)
router.post('/songs/:id/dislike', auth, async (req, res) => {
  try {
    const song = await prisma.song.findUnique({ where: { spotifyId: req.params.id } });
    if (!song) return res.status(404).json({ error: 'Song not cached — search for it first' });

    await prisma.songDislike.upsert({
      where: { userId_spotifyId: { userId: req.userId, spotifyId: req.params.id } },
      create: { userId: req.userId, spotifyId: req.params.id },
      update: {},
    });
    refreshTasteProfile(prisma, req.userId).catch(() => {});
    res.json({ disliked: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/recommendations/:id/dismiss — remove from inbox without algorithmic penalty
router.post('/recommendations/:id/dismiss', auth, async (req, res) => {
  try {
    const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.recipientId !== req.userId) return res.status(403).json({ error: 'Not your recommendation' });

    await prisma.recommendation.update({
      where: { id: req.params.id },
      data: { dismissedAt: new Date(), dismissedById: req.userId },
    });

    res.json({ dismissed: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/recommendations/:id/dislike — remove from inbox + feed negative signal to taste profile
router.post('/recommendations/:id/dislike', auth, async (req, res) => {
  try {
    const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.recipientId !== req.userId) return res.status(403).json({ error: 'Not your recommendation' });

    await prisma.songDislike.upsert({
      where: { userId_spotifyId: { userId: req.userId, spotifyId: rec.songId } },
      create: { userId: req.userId, spotifyId: rec.songId },
      update: {},
    });

    await prisma.recommendation.update({
      where: { id: req.params.id },
      data: { dismissedAt: new Date(), dismissedById: req.userId },
    });

    refreshTasteProfile(prisma, req.userId).catch(() => {});

    res.json({ disliked: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/recommendations/:id/dismiss — undo a dismiss
router.delete('/recommendations/:id/dismiss', auth, async (req, res) => {
  try {
    const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.recipientId !== req.userId) return res.status(403).json({ error: 'Not your recommendation' });

    await prisma.recommendation.update({
      where: { id: req.params.id },
      data: { dismissedAt: null, dismissedById: null },
    });

    res.json({ dismissed: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/recommendations/:id/dislike — undo a dislike
router.delete('/recommendations/:id/dislike', auth, async (req, res) => {
  try {
    const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.recipientId !== req.userId) return res.status(403).json({ error: 'Not your recommendation' });

    await prisma.songDislike.deleteMany({
      where: { userId: req.userId, spotifyId: rec.songId },
    });

    await prisma.recommendation.update({
      where: { id: req.params.id },
      data: { dismissedAt: null, dismissedById: null },
    });

    refreshTasteProfile(prisma, req.userId).catch(() => {});

    res.json({ disliked: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/likes/:id/feedback — attach/replace feedback tags on a like
router.post('/likes/:id/feedback', auth, async (req, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags must be an array' });

    const validTags = tags.filter(t => FEEDBACK_TAGS.includes(t));

    const like = await prisma.like.findFirst({
      where: { id: req.params.id, likerId: req.userId },
    });
    if (!like) return res.status(404).json({ error: 'Like not found or not yours' });

    await prisma.likeFeedback.deleteMany({ where: { likeId: req.params.id } });
    if (validTags.length > 0) {
      await prisma.likeFeedback.createMany({
        data: validTags.map(tag => ({ likeId: req.params.id, tag })),
      });
    }

    res.json({ tags: validTags });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
