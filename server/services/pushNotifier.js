const webpush = require('web-push')

const VAPID_READY = !!(
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_EMAIL
)

if (VAPID_READY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

async function pushNotify(prisma, userId, payload) {
  if (!VAPID_READY) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        await prisma.pushSubscription.deleteMany({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }
}

module.exports = { pushNotify }
