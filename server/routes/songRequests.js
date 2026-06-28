const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')
const { notify } = require('../sse')

const router = express.Router()
const prisma = new PrismaClient()

// POST /api/song-requests
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, templateId, variables, renderedText } = req.body

    if (!recipientId || !templateId || !variables || !renderedText) {
      return res.status(400).json({ error: 'recipientId, templateId, variables, and renderedText are required' })
    }
    if (recipientId === req.userId) {
      return res.status(400).json({ error: 'Cannot send a request to yourself' })
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: req.userId, addresseeId: recipientId },
          { requesterId: recipientId, addresseeId: req.userId },
        ],
      },
    })
    if (!friendship) return res.status(403).json({ error: 'You can only send requests to friends' })

    const request = await prisma.songRequest.create({
      data: {
        senderId:    req.userId,
        recipientId,
        templateId,
        variables,
        renderedText,
        status: 'OPEN',
      },
    })

    notify(recipientId, 'new_dm_req', { fromFriendId: req.userId });

    res.status(201).json(request)
  } catch (e) {
    console.error('POST /song-requests error:', e.message)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
