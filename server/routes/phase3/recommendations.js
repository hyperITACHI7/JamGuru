const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { thisMonthStart } = require('../../services/phase4/scoring');
const { notify } = require('../../sse');
const { pushNotify } = require('../../services/pushNotifier');

const router = express.Router();
const prisma = new PrismaClient();

const SAFE_USER = { id: true, username: true, displayName: true, avatarUrl: true };

// POST /api/recommendations — send a song recommendation to a friend
router.post('/', auth, async (req, res) => {
  try {
    const { songId, recipientId, context, requestId } = req.body;

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

    // Check if the recipient has already discovered or reacted to this song
    const [alreadyLiked, alreadyInPlaylist, alreadyDisliked, alreadyDismissed, alreadyLikedRec] = await Promise.all([
      prisma.songLike.findUnique({ where: { userId_spotifyId: { userId: recipientId, spotifyId: songId } } }),
      prisma.playlistSong.findFirst({ where: { spotifyId: songId, playlist: { userId: recipientId } } }),
      prisma.songDislike.findUnique({ where: { userId_spotifyId: { userId: recipientId, spotifyId: songId } } }),
      prisma.recommendation.findFirst({ where: { recipientId, songId, dismissedAt: { not: null } }, select: { id: true } }),
      // Belt-and-suspenders: also check if they've liked any prior recommendation of this song
      prisma.like.findFirst({ where: { likerId: recipientId, recommendation: { songId } }, select: { id: true } }),
    ]);
    const preDiscovered = !!(alreadyLiked || alreadyInPlaylist || alreadyLikedRec);
    const priorFeedback = alreadyDisliked ? 'disliked' : alreadyDismissed ? 'dismissed' : null;

    const rec = await prisma.recommendation.create({
      data: {
        senderId: req.userId,
        recipientId,
        songId,
        context:      context?.trim() || null,
        requestId:    requestId ?? null,
        preDiscovered,
        priorFeedback,
      },
      include: {
        song: true,
        sender: { select: SAFE_USER },
      },
    });

    if (requestId) {
      await prisma.songRequest.updateMany({
        where: { id: requestId, status: 'OPEN' },
        data:  { status: 'FULFILLED' },
      });
    }

    // Upsert daily_scores — increment recs_sent for today
    const today = new Date(new Date().toISOString().slice(0, 10));
    await prisma.dailyScore.upsert({
      where: { userId_scoreDate: { userId: req.userId, scoreDate: today } },
      create: { userId: req.userId, scoreDate: today, recsSent: 1, likesReceived: 0, dailyScore: 0 },
      update: { recsSent: { increment: 1 } },
    });

    notify(recipientId, 'new_dm_rec', { fromFriendId: req.userId });

    // Push notification (fire-and-forget)
    prisma.user.findUnique({ where: { id: req.userId }, select: { displayName: true } })
      .then(sender => pushNotify(prisma, recipientId, {
        title: `${sender.displayName} sent you a song 🎵`,
        body: 'Tap to check your inbox',
        url: '/jamguru',
      })).catch(() => {})

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
      where: {
        recipientId:   req.userId,
        preDiscovered: false,
        priorFeedback: null,
        OR: [
          { dismissedAt: null },
          // Disliked ("not my vibe") — show but disabled
          { dismissedAt: { not: null }, song: { songDislikes: { some: { userId: req.userId } } } },
        ],
      },
      include: {
        song: {
          include: {
            songDislikes: { where: { userId: req.userId }, select: { id: true } },
          },
        },
        sender: { select: SAFE_USER },
        likes: { where: { likerId: req.userId }, select: { id: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });

    let mapped = recs.map(r => {
      const { songDislikes, ...songData } = r.song;
      return {
        id:        r.id,
        sentAt:    r.sentAt,
        context:   r.context,
        song:      songData,
        sender:    r.sender,
        liked:     r.likes.length > 0,
        likeId:    r.likes[0]?.id ?? null,
        likeCount: r._count.likes,
        disliked:  songDislikes.length > 0,
      };
    });

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
        recipientId:   req.userId,
        preDiscovered: false,
        priorFeedback: null,
        dismissedAt:   null,
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

    const [received, sent, requests] = await Promise.all([
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
      // Song requests in either direction
      prisma.songRequest.findMany({
        where: {
          OR: [
            { senderId: me, recipientId: friendId },
            { senderId: friendId, recipientId: me },
          ],
        },
        orderBy: { sentAt: 'asc' },
      }),
    ]);

    const fmt = (recs, dir) =>
      recs.map(r => ({
        type:          'recommendation',
        id:            r.id,
        sentAt:        r.sentAt,
        direction:     dir,
        song:          r.song,
        context:       r.context,
        requestId:     r.requestId ?? null,
        liked:         r.likes.length > 0,
        likeId:        r.likes[0]?.id ?? null,
        tags:          r.likes[0]?.feedbacks?.map(f => f.tag) ?? [],
        dismissed:     !!r.dismissedAt,
        preDiscovered: !!r.preDiscovered,
        priorFeedback: r.priorFeedback ?? null,
      }));

    const messages = [
      ...fmt(received, 'received'),
      ...fmt(sent, 'sent'),
      ...requests.map(r => ({
        type:        'request',
        id:          r.id,
        sentAt:      r.sentAt,
        direction:   r.senderId === me ? 'sent' : 'received',
        templateId:  r.templateId,
        variables:   r.variables,
        renderedText: r.renderedText,
        status:      r.status,
      })),
    ].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

    res.json(messages);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommendations/friend-status/:friendId?ids=a,b,c
// Batch check: for each spotifyId, has this friend already liked/playlisted it (preDiscovered)
// or disliked/dismissed a past recommendation of it (priorFeedback)? Used by the sender's song
// pickers (library/AI) to show a non-blocking "already explored" hint before sending.
router.get('/friend-status/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    if (ids.length === 0) return res.json({});

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: req.userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: req.userId },
        ],
      },
    });
    if (!friendship) return res.status(403).json({ error: 'You can only check friends' });

    const [likes, playlistSongs, dislikes, dismissed] = await Promise.all([
      prisma.songLike.findMany({ where: { userId: friendId, spotifyId: { in: ids } }, select: { spotifyId: true } }),
      prisma.playlistSong.findMany({ where: { spotifyId: { in: ids }, playlist: { userId: friendId } }, select: { spotifyId: true } }),
      prisma.songDislike.findMany({ where: { userId: friendId, spotifyId: { in: ids } }, select: { spotifyId: true } }),
      prisma.recommendation.findMany({ where: { recipientId: friendId, songId: { in: ids }, dismissedAt: { not: null } }, select: { songId: true } }),
    ]);

    const likedSet     = new Set(likes.map(l => l.spotifyId));
    const playlistSet  = new Set(playlistSongs.map(p => p.spotifyId));
    const dislikedSet  = new Set(dislikes.map(d => d.spotifyId));
    const dismissedSet = new Set(dismissed.map(d => d.songId));

    const result = {};
    for (const id of ids) {
      const preDiscovered = likedSet.has(id) || playlistSet.has(id);
      const priorFeedback = dislikedSet.has(id) ? 'disliked' : dismissedSet.has(id) ? 'dismissed' : null;
      if (preDiscovered || priorFeedback) result[id] = { preDiscovered, priorFeedback };
    }
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/recommendations/:id/reconsider — recipient clears prior-feedback to re-evaluate
router.patch('/:id/reconsider', auth, async (req, res) => {
  try {
    const rec = await prisma.recommendation.findUnique({
      where:  { id: req.params.id },
      select: { recipientId: true },
    });
    if (!rec) return res.status(404).json({ error: 'Not found' });
    if (rec.recipientId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    await prisma.recommendation.update({
      where: { id: req.params.id },
      data:  { priorFeedback: null },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
