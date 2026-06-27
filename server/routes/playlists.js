const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/playlists — list current user's playlists
router.get('/', authMiddleware, async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { songs: true } } },
    });
    res.json({ playlists });
  } catch (e) {
    console.error('GET /playlists error:', e.message);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// GET /api/playlists/:id — get a playlist with its songs
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const playlist = await prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        songs: {
          orderBy: { position: 'asc' },
          include: { song: true },
        },
      },
    });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ playlist });
  } catch (e) {
    console.error('GET /playlists/:id error:', e.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

module.exports = router;
