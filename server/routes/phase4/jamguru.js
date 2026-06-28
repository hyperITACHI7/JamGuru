const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/auth');
const { thisMonthStart } = require('../../services/phase4/scoring');

const router = express.Router();
const prisma = new PrismaClient();

const SAFE_USER = { id: true, username: true, displayName: true, avatarUrl: true };

// GET /api/jamguru/mine — who is the current user's JamGuru this month?
router.get('/jamguru/mine', auth, async (req, res) => {
  try {
    const month = thisMonthStart();

    const top = await prisma.personalTrustRanking.findFirst({
      where: { ownerId: req.userId, month, trustScore: { gt: 0 } },
      orderBy: [{ trustScore: 'desc' }, { likesGiven: 'desc' }],
      include: { friend: { select: SAFE_USER } },
    });

    if (!top) return res.json({ jamguru: null, discoveryCount: 0 });

    res.json({ jamguru: top.friend, discoveryCount: top.likesGiven });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jamguru/count — how many people is the current user JamGuru for?
router.get('/jamguru/count', auth, async (req, res) => {
  try {
    const month = thisMonthStart();

    // All ranking rows where I am the friend and have a positive trust score
    const meAsJamguru = await prisma.personalTrustRanking.findMany({
      where: { friendId: req.userId, month, trustScore: { gt: 0 } },
      select: { ownerId: true, trustScore: true },
    });

    if (meAsJamguru.length === 0) return res.json({ count: 0 });

    // For each of those owners, verify I actually hold their top slot
    let count = 0;
    for (const row of meAsJamguru) {
      const top = await prisma.personalTrustRanking.findFirst({
        where: { ownerId: row.ownerId, month },
        orderBy: [{ trustScore: 'desc' }, { likesGiven: 'desc' }],
      });
      if (top?.friendId === req.userId) count++;
    }

    res.json({ count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/trust-rankings — current user's personal trust ranking list, sorted by trust score
router.get('/trust-rankings', auth, async (req, res) => {
  try {
    const month = thisMonthStart();

    const rankings = await prisma.personalTrustRanking.findMany({
      where: { ownerId: req.userId, month },
      include: { friend: { select: SAFE_USER } },
      orderBy: { trustScore: 'desc' },
    });

    res.json(
      rankings.map(r => ({
        friend: r.friend,
        likesGiven: r.likesGiven,
        recsReceived: r.recsReceived,
        trustScore: Number(r.trustScore),
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
