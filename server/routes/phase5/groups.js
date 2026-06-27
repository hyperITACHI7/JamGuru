const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { recomputeGroupScore, todayDate } = require('../../services/phase5/groupScoring');

const router = express.Router();
const prisma = new PrismaClient();

const SAFE_USER = { id: true, username: true, displayName: true, avatarUrl: true };

// ── Group management ────────────────────────────────────────────────────────

// POST /api/groups — create a group; creator is automatically a member
router.post('/', auth, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });
    if (name.trim().length > 60) return res.status(400).json({ error: 'Group name must be 60 characters or fewer' });

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        createdBy: req.userId,
        members: {
          create: [
            { userId: req.userId },
            ...memberIds
              .filter(id => id !== req.userId)
              .map(userId => ({ userId })),
          ],
        },
      },
      include: {
        members: { include: { user: { select: SAFE_USER } } },
        creator: { select: SAFE_USER },
      },
    });

    res.status(201).json(group);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups — list groups the current user belongs to
router.get('/', auth, async (req, res) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.userId },
      include: {
        group: {
          include: {
            creator: { select: SAFE_USER },
            _count: { select: { members: true, recommendations: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json(
      memberships.map(m => ({
        ...m.group,
        memberCount: m.group._count.members,
        recCount: m.group._count.recommendations,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id — group detail + member list
router.get('/:id', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: SAFE_USER },
        members: { include: { user: { select: SAFE_USER } }, orderBy: { joinedAt: 'asc' } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    res.json(group);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/members — add a member (creator only)
router.post('/:id/members', auth, async (req, res) => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.createdBy !== req.userId) return res.status(403).json({ error: 'Only the group creator can add members' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
      await prisma.groupMember.create({ data: { groupId: req.params.id, userId } });
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'User is already a member' });
      if (e.code === 'P2003') return res.status(404).json({ error: 'User not found' });
      throw e;
    }

    const updated = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: { select: SAFE_USER } }, orderBy: { joinedAt: 'asc' } } },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/groups/:id/members/:userId — remove a member (creator can remove anyone; member can leave)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isSelf = req.params.userId === req.userId;
    const isCreator = group.createdBy === req.userId;
    if (!isSelf && !isCreator) return res.status(403).json({ error: 'Permission denied' });

    // Creator cannot leave their own group without transferring or deleting
    if (isSelf && isCreator) return res.status(400).json({ error: 'Creator cannot leave the group. Delete the group instead.' });

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: req.params.id, userId: req.params.userId } },
    });

    res.json({ removed: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Group recommendations ───────────────────────────────────────────────────

// POST /api/groups/:id/recommendations — send a song to the group
router.post('/:id/recommendations', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const { songId, context, groupRequestId } = req.body;
    if (!songId) return res.status(400).json({ error: 'songId is required' });
    if (context && context.length > 200) return res.status(400).json({ error: 'Context must be 200 characters or fewer' });

    const song = await prisma.song.findUnique({ where: { spotifyId: songId } });
    if (!song) return res.status(404).json({ error: 'Song not found — search for it first' });

    const rec = await prisma.recommendation.create({
      data: {
        senderId: req.userId,
        groupId: req.params.id,
        songId,
        context: context?.trim() || null,
        groupRequestId: groupRequestId ?? null,
      },
      include: { song: true, sender: { select: SAFE_USER } },
    });

    if (groupRequestId) {
      await prisma.groupSongRequest.updateMany({
        where: { id: groupRequestId, status: 'OPEN' },
        data: { status: 'FULFILLED' },
      });
    }

    // Update group score — increment recsSent
    const today = todayDate();
    await prisma.groupScore.upsert({
      where: { groupId_scoreDate: { groupId: req.params.id, scoreDate: today } },
      create: {
        groupId: req.params.id,
        scoreDate: today,
        recsSent: 1,
        likesReceived: 0,
        groupSize: await prisma.groupMember.count({ where: { groupId: req.params.id } }),
        dailyScore: 0,
      },
      update: { recsSent: { increment: 1 } },
    });

    res.status(201).json(rec);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/requests — send a song request to the group
router.post('/:id/requests', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const { templateId, variables, renderedText } = req.body;
    if (!templateId || !variables || !renderedText) {
      return res.status(400).json({ error: 'templateId, variables, and renderedText are required' });
    }

    const request = await prisma.groupSongRequest.create({
      data: { groupId: req.params.id, senderId: req.userId, templateId, variables, renderedText, status: 'OPEN' },
    });
    res.status(201).json(request);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id/feed — recommendations + song requests, merged chronologically
router.get('/:id/feed', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const [recs, requests] = await Promise.all([
      prisma.recommendation.findMany({
        where: { groupId: req.params.id },
        include: {
          song: true,
          sender: { select: SAFE_USER },
          likes: { where: { likerId: req.userId }, select: { id: true } },
          _count: { select: { likes: true } },
        },
        orderBy: { sentAt: 'desc' },
        take: 50,
      }),
      prisma.groupSongRequest.findMany({
        where: { groupId: req.params.id },
        include: { sender: { select: SAFE_USER } },
        orderBy: { sentAt: 'desc' },
        take: 50,
      }),
    ]);

    const combined = [
      ...recs.map(r => ({
        type: 'recommendation',
        id: r.id, sentAt: r.sentAt, context: r.context,
        song: r.song, sender: r.sender,
        liked: r.likes.length > 0, likeId: r.likes[0]?.id ?? null,
        likeCount: r._count.likes,
        groupRequestId: r.groupRequestId ?? null,
      })),
      ...requests.map(r => ({
        type: 'request',
        id: r.id, sentAt: r.sentAt,
        sender: r.sender, senderId: r.senderId,
        templateId: r.templateId, variables: r.variables,
        renderedText: r.renderedText, status: r.status,
      })),
    ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    res.json(combined);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Group likes (isolated from personal scoring) ────────────────────────────

// POST /api/groups/:id/recommendations/:recId/like
router.post('/:id/recommendations/:recId/like', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const rec = await prisma.recommendation.findUnique({ where: { id: req.params.recId } });
    if (!rec || rec.groupId !== req.params.id) return res.status(404).json({ error: 'Recommendation not found in this group' });

    let like;
    try {
      like = await prisma.like.create({
        data: { recommendationId: req.params.recId, likerId: req.userId },
      });
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'Already liked' });
      throw e;
    }

    // Update group score only — no personal trust ranking changes
    await recomputeGroupScore(prisma, { groupId: req.params.id, recommendationId: req.params.recId });

    const likeCount = await prisma.like.count({ where: { recommendationId: req.params.recId } });
    res.json({ liked: true, likeCount, likeId: like.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/groups/:id/recommendations/:recId/like
router.delete('/:id/recommendations/:recId/like', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const like = await prisma.like.findFirst({
      where: { recommendationId: req.params.recId, likerId: req.userId },
    });
    if (!like) return res.status(404).json({ error: 'Like not found' });

    await prisma.like.delete({ where: { id: like.id } });
    await recomputeGroupScore(prisma, { groupId: req.params.id, recommendationId: req.params.recId });

    const likeCount = await prisma.like.count({ where: { recommendationId: req.params.recId } });
    res.json({ liked: false, likeCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id/score — group's current daily score
router.get('/:id/score', auth, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

    const today = todayDate();

    const daily = await prisma.groupScore.findUnique({
      where: { groupId_scoreDate: { groupId: req.params.id, scoreDate: today } },
    });

    // Monthly score = sum of all daily scores for this group this month
    const monthStart = new Date(new Date().toISOString().slice(0, 7) + '-01');
    const allDaily = await prisma.groupScore.findMany({
      where: { groupId: req.params.id, scoreDate: { gte: monthStart } },
    });
    const monthlyScore = allDaily.reduce((sum, d) => sum + Number(d.dailyScore), 0);

    res.json({
      dailyScore: daily ? Number(daily.dailyScore) : 0,
      monthlyScore,
      today: {
        likesReceived: daily?.likesReceived ?? 0,
        recsSent: daily?.recsSent ?? 0,
        groupSize: daily?.groupSize ?? await prisma.groupMember.count({ where: { groupId: req.params.id } }),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
