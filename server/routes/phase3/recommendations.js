const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { thisMonthStart } = require('../../services/phase4/scoring');

const router = express.Router();
const prisma = new PrismaClient();

const SAFE_USER = { id: true, username: true, displayName: true, avatarUrl: true };

// POST /api/recommendations — send a song recommendation to a friend
router.post('/', auth, async (req, res) => {
  try {
    const { songId, recipientId, context } = req.body;

    if (!songId || !recipientId) {
      return res.status(400).json({ error: 'songId and recipientId are required' });
    }
    if (recipientId === req.userId) {
      return res.status(400).json({ error: 'Cannot recommend to yourself' });
    }
    if (context && context.length > 200) {
      return res.status(400).json({ error: 'Context must be 200 characters or fewer' });
    }

    // Must be accepted friends
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: req.userId, addresseeId: recipientId },
          { requesterId: recipientId, addresseeId: req.userId },
        ],
      },
    });
    if (!friendship) {
      return res.status(403).json({ error: 'You can only recommend songs to friends' });
    }

    // Song must be in cache
    const song = await prisma.song.findUnique({ where: { spotifyId: songId } });
    if (!song) return res.status(404).json({ error: 'Song not found — search for it first' });

    const rec = await prisma.recommendation.create({
      data: {
        senderId: req.userId,
        recipientId,
        songId,
        context: context?.trim() || null,
      },
      include: {
        song: true,
        sender: { select: SAFE_USER },
      },
    });

    // Upsert daily_scores — increment recs_sent for today
    const today = new Date(new Date().toISOString().slice(0, 10));
    await prisma.dailyScore.upsert({
      where: { userId_scoreDate: { userId: req.userId, scoreDate: today } },
      create: { userId: req.userId, scoreDate: today, recsSent: 1, likesReceived: 0, dailyScore: 0 },
      update: { recsSent: { increment: 1 } },
    });

    res.status(201).json(rec);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommendations/inbox — get all recommendations received by current user
// ?sort=score  → order by sender's monthly score (highest first)
// ?sort=latest → order by sent time (default)
router.get('/inbox', auth, async (req, res) => {
  try {
    const recs = await prisma.recommendation.findMany({
      where: { recipientId: req.userId },
      include: {
        song: true,
        sender: { select: SAFE_USER },
        likes: { where: { likerId: req.userId }, select: { id: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });

    let mapped = recs.map(r => ({
      id: r.id,
      sentAt: r.sentAt,
      context: r.context,
      song: r.song,
      sender: r.sender,
      liked: r.likes.length > 0,
      likeId: r.likes[0]?.id ?? null,
      likeCount: r._count.likes,
    }));

    if (req.query.sort === 'score' && mapped.length > 0) {
      const month = thisMonthStart();
      const senderIds = [...new Set(mapped.map(r => r.sender.id))];
      const scores = await prisma.monthlyScore.findMany({
        where: { userId: { in: senderIds }, month },
      });
      const scoreMap = Object.fromEntries(scores.map(s => [s.userId, Number(s.monthlyScore)]));
      mapped.sort((a, b) => (scoreMap[b.sender.id] ?? 0) - (scoreMap[a.sender.id] ?? 0));
    }

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommendations/pending-count — inbox items the user hasn't liked yet
router.get('/pending-count', auth, async (req, res) => {
  try {
    const count = await prisma.recommendation.count({
      where: {
        recipientId: req.userId,
        likes: { none: { likerId: req.userId } },
      },
    });
    res.json({ count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommendations/conversation/:friendId
// Returns all recs in both directions, sorted chronologically, with like/tag data
router.get('/conversation/:friendId', auth, async (req, res) => {
  try {
    const me       = req.userId;
    const friendId = req.params.friendId;

    const [received, sent] = await Promise.all([
      // Recs the friend sent to me — include whether I liked them + my tags
      prisma.recommendation.findMany({
        where: { senderId: friendId, recipientId: me },
        include: {
          song: true,
          likes: { where: { likerId: me }, include: { feedbacks: true } },
        },
        orderBy: { sentAt: 'asc' },
      }),
      // Recs I sent to the friend — include whether they liked them + their tags
      prisma.recommendation.findMany({
        where: { senderId: me, recipientId: friendId },
        include: {
          song: true,
          likes: { where: { likerId: friendId }, include: { feedbacks: true } },
        },
        orderBy: { sentAt: 'asc' },
      }),
    ]);

    const fmt = (recs, dir) =>
      recs.map(r => ({
        id:        r.id,
        sentAt:    r.sentAt,
        direction: dir,
        song:      r.song,
        context:   r.context,
        liked:     r.likes.length > 0,
        likeId:    r.likes[0]?.id ?? null,
        tags:      r.likes[0]?.feedbacks?.map(f => f.tag) ?? [],
      }));

    const messages = [
      ...fmt(received, 'received'),
      ...fmt(sent, 'sent'),
    ].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

    res.json(messages);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
