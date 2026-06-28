const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const SAFE_USER = { id: true, username: true, displayName: true, avatarUrl: true };

// GET /api/friends — list accepted friends
router.get('/', auth, async (req, res) => {
  try {
    const rows = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: req.userId }, { addresseeId: req.userId }],
      },
      include: {
        requester: { select: SAFE_USER },
        addressee: { select: SAFE_USER },
      },
    });
    const friends = rows.map(f =>
      f.requesterId === req.userId ? f.addressee : f.requester
    );
    res.json(friends);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/friends/inbox-summary — per-friend and per-group unreacted activity counts
router.get('/inbox-summary', auth, async (req, res) => {
  const me = req.userId;
  try {
    const [dmNewRecs, dmOpenReqs, groupNewRecs, groupOpenReqs] = await Promise.all([
      // DM recs from friends not yet liked or dismissed
      prisma.recommendation.findMany({
        where: { recipientId: me, groupId: null, dismissedAt: null, likes: { none: { likerId: me } } },
        select: { senderId: true },
      }),
      // DM song requests I received that are still open
      prisma.songRequest.findMany({
        where: { recipientId: me, status: 'OPEN' },
        select: { senderId: true },
      }),
      // Group recs not from me, not liked/dismissed by me
      prisma.recommendation.findMany({
        where: {
          groupId: { not: null },
          senderId: { not: me },
          dismissedAt: null,
          likes: { none: { likerId: me } },
          group: { members: { some: { userId: me } } },
        },
        select: { groupId: true },
      }),
      // Group requests not from me, still open
      prisma.groupSongRequest.findMany({
        where: {
          senderId: { not: me },
          status: 'OPEN',
          group: { members: { some: { userId: me } } },
        },
        select: { groupId: true },
      }),
    ]);

    const dmSongs = {}, dmReqs = {}, grpSongs = {}, grpReqs = {};
    for (const r of dmNewRecs)  dmSongs[r.senderId] = (dmSongs[r.senderId] ?? 0) + 1;
    for (const r of dmOpenReqs) dmReqs[r.senderId]  = (dmReqs[r.senderId]  ?? 0) + 1;
    for (const r of groupNewRecs)  grpSongs[r.groupId] = (grpSongs[r.groupId] ?? 0) + 1;
    for (const r of groupOpenReqs) grpReqs[r.groupId]  = (grpReqs[r.groupId]  ?? 0) + 1;

    const friendIds = [...new Set([...Object.keys(dmSongs), ...Object.keys(dmReqs)])];
    const groupIds  = [...new Set([...Object.keys(grpSongs), ...Object.keys(grpReqs)])];

    res.json({
      friends: friendIds.map(id => ({
        friendId: id, newSongsCount: dmSongs[id] ?? 0, openRequestCount: dmReqs[id] ?? 0,
      })),
      groups: groupIds.map(id => ({
        groupId: id, newSongsCount: grpSongs[id] ?? 0, openRequestCount: grpReqs[id] ?? 0,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/friends/requests — incoming pending requests
router.get('/requests', auth, async (req, res) => {
  try {
    const rows = await prisma.friendship.findMany({
      where: { addresseeId: req.userId, status: 'PENDING' },
      include: { requester: { select: SAFE_USER } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/friends/search?q= — find users by username prefix
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim().toLowerCase();
    if (q.length < 2) return res.json([]);

    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: 'insensitive' }, NOT: { id: req.userId } },
      select: SAFE_USER,
      take: 10,
    });

    const enriched = await Promise.all(
      users.map(async u => {
        const f = await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: req.userId, addresseeId: u.id },
              { requesterId: u.id, addresseeId: req.userId },
            ],
          },
        });
        return {
          ...u,
          friendshipStatus: f?.status ?? null,
          isRequester: f ? f.requesterId === req.userId : null,
          friendshipId: f?.id ?? null,
        };
      })
    );

    res.json(enriched);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/friends/request/:targetId — send friend request
router.post('/request/:targetId', auth, async (req, res) => {
  try {
    const { targetId } = req.params;
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: req.userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(409).json({ error: 'Already friends' });
      }
      if (existing.requesterId === req.userId) {
        return res.status(409).json({ error: 'Request already sent' });
      }
      // Reverse request exists — auto-accept
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      });
      return res.json({ ...updated, autoAccepted: true });
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId: req.userId, addresseeId: targetId },
    });
    res.status(201).json(friendship);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/friends/accept/:requesterId — accept an incoming request
router.post('/accept/:requesterId', auth, async (req, res) => {
  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        requesterId: req.params.requesterId,
        addresseeId: req.userId,
        status: 'PENDING',
      },
    });
    if (!friendship) return res.status(404).json({ error: 'Pending request not found' });

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' },
      include: { requester: { select: SAFE_USER } },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/friends/:userId — unfriend or cancel a pending request
router.delete('/:userId', auth, async (req, res) => {
  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: req.params.userId },
          { requesterId: req.params.userId, addresseeId: req.userId },
        ],
      },
    });
    if (!friendship) return res.status(404).json({ error: 'Friendship not found' });

    await prisma.friendship.delete({ where: { id: friendship.id } });
    res.json({ message: 'Removed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
