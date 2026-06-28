const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/notifications/vapid-key — public key is safe to expose
router.get('/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' })
  res.json({ publicKey: key })
})

// POST /api/notifications/subscribe — save a push subscription for the current user
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, expirationTime, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' })
    }
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: req.userId, endpoint } },
      create: { userId: req.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { p256dh: keys.p256dh, auth: keys.auth },
    })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/notifications/subscribe — remove a push subscription
router.delete('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
    await prisma.pushSubscription.deleteMany({ where: { userId: req.userId, endpoint } })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
