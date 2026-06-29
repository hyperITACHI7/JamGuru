const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { suggestSong, suggestForMe, getInteractionContext, rankSongsForRequest, suggestForGroup, rankSongsForGroupRequest, suggestForRequest, suggestForGroupRequest, suggestFromLibraryForFriend, suggestFromLibraryForGroup } = require('../../services/ai');

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

    const { excludeSpotifyIds = [] } = req.body;

    const [[me, friend], excludedSongs] = await Promise.all([
      Promise.all([
        prisma.user.findUnique({ where: { id: req.userId }, select: SAFE_USER }),
        prisma.user.findUnique({ where: { id: req.params.friendId }, select: SAFE_USER }),
      ]),
      excludeSpotifyIds.length > 0
        ? prisma.song.findMany({ where: { spotifyId: { in: excludeSpotifyIds } }, select: { spotifyId: true, title: true, artist: true } })
        : Promise.resolve([]),
    ]);

    if (!friend) return res.status(404).json({ error: 'Friend not found' });

    // Try sender's library first — pick the best match for the friend's taste
    let song    = await suggestFromLibraryForFriend(prisma, req.userId, req.params.friendId, excludeSpotifyIds);
    let aiQuery = null;

    if (!song) {
      // Library empty or no undiscovered match — fall back to AI search
      ({ song, aiQuery } = await suggestSong(prisma, req.userId, req.params.friendId, me.displayName, friend.displayName, excludedSongs));
    }

    res.json({ song, aiQuery });
  } catch (e) {
    console.error('[ai/suggest]', e.message);
    res.status(500).json({ error: e.message || 'AI suggestion failed' });
  }
});

// POST /api/ai/rank-for-request — rank user's library songs against a request
router.post('/ai/rank-for-request', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured' });
    }
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId is required' });

    // Only the recipient may ask for picks for a request
    const songRequest = await prisma.songRequest.findUnique({ where: { id: requestId } });
    if (!songRequest) return res.status(404).json({ error: 'Request not found' });
    if (songRequest.recipientId !== req.userId) return res.status(403).json({ error: 'Not your request to respond to' });

    const result = await rankSongsForRequest(prisma, req.userId, requestId);
    res.json(result);
  } catch (e) {
    console.error('[ai/rank-for-request]', e.message);
    res.status(500).json({ error: e.message || 'Failed to rank songs' });
  }
});

// POST /api/ai/suggest/group/:groupId — AI song suggestion for a group
router.post('/ai/suggest/group/:groupId', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured' });
    }
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.groupId, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    // Try sender's library first (uses stored group taste profile)
    let song    = await suggestFromLibraryForGroup(prisma, req.userId, req.params.groupId);
    let aiQuery = null;

    if (!song) {
      ({ song, aiQuery } = await suggestForGroup(prisma, req.userId, req.params.groupId));
    }

    res.json({ song, aiQuery });
  } catch (e) {
    console.error('[ai/suggest/group]', e.message);
    res.status(500).json({ error: e.message || 'AI suggestion failed' });
  }
});

// POST /api/ai/rank-for-group-request — rank user's library against a group song request
router.post('/ai/rank-for-group-request', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured' });
    }
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId is required' });

    const songRequest = await prisma.groupSongRequest.findUnique({ where: { id: requestId } });
    if (!songRequest) return res.status(404).json({ error: 'Request not found' });

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: songRequest.groupId, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const result = await rankSongsForGroupRequest(prisma, req.userId, requestId);
    res.json(result);
  } catch (e) {
    console.error('[ai/rank-for-group-request]', e.message);
    res.status(500).json({ error: e.message || 'Failed to rank songs' });
  }
});

// POST /api/ai/suggest-for-request — AI suggestions outside library for a DM request
router.post('/ai/suggest-for-request', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured' });
    }
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId is required' });
    const songRequest = await prisma.songRequest.findUnique({ where: { id: requestId } });
    if (!songRequest) return res.status(404).json({ error: 'Request not found' });
    if (songRequest.recipientId !== req.userId) return res.status(403).json({ error: 'Not your request' });
    const songs = await suggestForRequest(prisma, req.userId, requestId);
    res.json({ songs });
  } catch (e) {
    console.error('[ai/suggest-for-request]', e.message);
    res.status(500).json({ error: e.message || 'Failed to suggest songs' });
  }
});

// POST /api/ai/suggest-for-group-request — AI suggestions outside library for a group request
router.post('/ai/suggest-for-group-request', auth, async (req, res) => {
  try {
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your-groq-api-key-here') {
      return res.status(503).json({ error: 'AI provider not configured' });
    }
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId is required' });
    const songRequest = await prisma.groupSongRequest.findUnique({ where: { id: requestId } });
    if (!songRequest) return res.status(404).json({ error: 'Request not found' });
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: songRequest.groupId, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });
    const songs = await suggestForGroupRequest(prisma, req.userId, requestId);
    res.json({ songs });
  } catch (e) {
    console.error('[ai/suggest-for-group-request]', e.message);
    res.status(500).json({ error: e.message || 'Failed to suggest songs' });
  }
});

module.exports = router;
