const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { thisMonthStart } = require('../services/phase4/scoring');

const router = express.Router();
const prisma = new PrismaClient();

const safeUserFields = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
};

// PATCH /api/users/me — must be declared before /:username to avoid ambiguity
router.patch('/me', authMiddleware, async (req, res) => {
  const { displayName, bio, avatarUrl } = req.body;

  const updateData = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (bio !== undefined) updateData.bio = bio;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: safeUserFields,
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:username — public profile; enriched when caller is authenticated
router.get('/:username', async (req, res) => {
  // Optional caller identification — don't fail if unauthenticated
  let callerId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      callerId = decoded.userId;
    } catch {}
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: safeUserFields,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const month = thisMonthStart();

    // Friend count
    const friendCount = await prisma.friendship.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
    });

    // Their JamGuru: the friend they trust most this month
    const topTrust = await prisma.personalTrustRanking.findFirst({
      where: { ownerId: user.id, month, trustScore: { gt: 0 } },
      orderBy: { trustScore: 'desc' },
      include: { friend: { select: { id: true, username: true, displayName: true } } },
    });
    const myJamGuru = topTrust?.friend ?? null;

    // How many listeners this person is JamGuru for
    const candidateOwners = await prisma.personalTrustRanking.findMany({
      where: { friendId: user.id, month, trustScore: { gt: 0 } },
      select: { ownerId: true },
    });
    let jamGuruForCount = 0;
    await Promise.all(
      candidateOwners.map(async ({ ownerId }) => {
        const top = await prisma.personalTrustRanking.findFirst({
          where: { ownerId, month },
          orderBy: { trustScore: 'desc' },
        });
        if (top?.friendId === user.id) jamGuruForCount++;
      })
    );

    // Friendship status — only when caller is authenticated and not their own profile
    let friendshipStatus = null;
    if (callerId && callerId !== user.id) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: callerId, addresseeId: user.id },
            { requesterId: user.id, addresseeId: callerId },
          ],
        },
      });
      if (friendship) {
        if (friendship.status === 'ACCEPTED') {
          friendshipStatus = 'ACCEPTED';
        } else if (friendship.requesterId === callerId) {
          friendshipStatus = 'PENDING_SENT';
        } else {
          friendshipStatus = 'PENDING_RECEIVED';
        }
      }
    }

    res.json({ ...user, jamGuruForCount, friendCount, myJamGuru, friendshipStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
