const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { suggestSong, suggestForMe, getInteractionContext } = require('../../services/ai');

const router = express.Router();
const prisma = new PrismaClient();

const SAFE_USER = { id: true, username: true, displayName: true, avatarUrl: true };

// GET /api/ai/context/:friendId — interaction history (useful for debugging)
router.get('/ai/context/:friendId', auth, async (req, res) => {
  try {
    const context = await getInteractionContext(prisma, req.userId, req.params.friendId);

    const fmt = recs => recs.map(r => ({
      song: { title: r.song.title, artist: r.song.artist },
      liked: r.likes.length > 0,
      tags: r.likes[0]?.feedbacks?.map(f => f.tag) ?? [],
    }));

    res.json({
      sentByMe:     fmt(context.sentByMe),
      sentByFriend: fmt(context.sentByFriend),
    });
  } catch (e) {
    console.error('[ai/context]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ai/suggest/me — get 3 personalised song suggestions for the current user
// Must be declared before /:friendId to avoid route conflict
router.post('/ai/suggest/me', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured' });
    }
    const songs = await suggestForMe(prisma, req.userId);
    res.json({ songs });
  } catch (e) {
    console.error('[ai/suggest/me]', e.message);
    res.status(500).json({ error: e.message || 'Could not generate suggestions' });
  }
});

// POST /api/ai/suggest/:friendId — get AI song suggestion
router.post('/ai/suggest/:friendId', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured. Set AI_API_KEY in server/.env' });
    }

    const [me, friend] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId }, select: SAFE_USER }),
      prisma.user.findUnique({ where: { id: req.params.friendId }, select: SAFE_USER }),
    ]);

    if (!friend) return res.status(404).json({ error: 'Friend not found' });

    const { song, aiQuery } = await suggestSong(
      prisma,
      req.userId,
      req.params.friendId,
      me.displayName,
      friend.displayName
    );

    res.json({ song, aiQuery });
  } catch (e) {
    console.error('[ai/suggest]', e.message);
    res.status(500).json({ error: e.message || 'AI suggestion failed' });
  }
});

module.exports = router;
