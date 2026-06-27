const express = require('express');
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

// GET /api/users/:username — public profile
router.get('/:username', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: safeUserFields,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Compute real JamGuru-for count: how many users is this person the #1 trusted friend of?
    const month = thisMonthStart();
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

    res.json({ ...user, jamGuruForCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
