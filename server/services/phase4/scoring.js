// All score recalculation logic for Phase 4.
const { pushNotify } = require('../pushNotifier');
// Called after every like or unlike — always recomputes from source-of-truth counts
// so scores stay consistent even if events arrive out of order.

const FEEDBACK_TAGS = [
  'Great vocals', 'Gym song', 'Nostalgic', 'Amazing lyrics',
  'Road trip vibe', 'Late night', 'Happy vibes',
];

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function thisMonthStart() {
  return new Date(new Date().toISOString().slice(0, 7) + '-01');
}

// Recompute all scores affected by a like or unlike on `recommendationId`.
// Safe to call after the like row is already inserted or deleted.
async function recomputeScores(prisma, { recommendationId, likerId }) {
  const rec = await prisma.recommendation.findUnique({ where: { id: recommendationId } });
  const senderId = rec.senderId;
  const today      = todayDate();
  const monthStart = thisMonthStart();

  // ── 1. Sender's daily_score for today ──────────────────────────────────────

  // Count actual likes sender received today (from all recommendations they sent)
  const likesReceivedToday = await prisma.like.count({
    where: {
      recommendation: { senderId },
      likedAt: { gte: today },
    },
  });

  const senderDaily = await prisma.dailyScore.findUnique({
    where: { userId_scoreDate: { userId: senderId, scoreDate: today } },
  });

  const recsSentToday = senderDaily ? Number(senderDaily.recsSent) : 0;
  const dailyScore    = recsSentToday > 0 ? likesReceivedToday / recsSentToday : 0;

  await prisma.dailyScore.upsert({
    where: { userId_scoreDate: { userId: senderId, scoreDate: today } },
    create: { userId: senderId, scoreDate: today, likesReceived: likesReceivedToday, recsSent: recsSentToday, dailyScore },
    update: { likesReceived: likesReceivedToday, dailyScore },
  });

  // ── 2. Sender's monthly_score ───────────────────────────────────────────────

  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  const allDailyScores = await prisma.dailyScore.findMany({
    where: { userId: senderId, scoreDate: { gte: monthStart, lte: monthEnd } },
  });

  const monthlyScore = allDailyScores.reduce((sum, d) => sum + Number(d.dailyScore), 0);

  await prisma.monthlyScore.upsert({
    where: { userId_month: { userId: senderId, month: monthStart } },
    create: { userId: senderId, month: monthStart, monthlyScore },
    update: { monthlyScore },
  });

  // ── 3. Personal trust ranking: liker → sender ──────────────────────────────
  // trustScore = SUM over each day sender sent recs of (liked_that_day / sent_that_day)
  // Rewards consistent daily quality; someone who sent 1 rec once can't permanently
  // outrank someone sending great picks every day.

  const allRecs = await prisma.recommendation.findMany({
    where: { senderId, recipientId: likerId, sentAt: { gte: monthStart } },
    select: { id: true, sentAt: true },
  });

  const likedIds = new Set(
    (await prisma.like.findMany({
      where: { likerId, recommendationId: { in: allRecs.map(r => r.id) } },
      select: { recommendationId: true },
    })).map(l => l.recommendationId)
  );

  const byDay = new Map();
  for (const rec of allRecs) {
    const day = rec.sentAt.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { sent: 0, liked: 0 });
    byDay.get(day).sent++;
    if (likedIds.has(rec.id)) byDay.get(day).liked++;
  }

  let trustScore = 0;
  for (const { sent, liked } of byDay.values()) {
    if (sent > 0) trustScore += liked / sent;
  }

  const likesGiven   = likedIds.size;
  const recsReceived = allRecs.length;

  const prevTop = await prisma.personalTrustRanking.findFirst({
    where: { ownerId: likerId, month: monthStart, trustScore: { gt: 0 } },
    orderBy: [{ trustScore: 'desc' }, { likesGiven: 'desc' }],
    select: { friendId: true },
  });

  await prisma.personalTrustRanking.upsert({
    where: { ownerId_friendId_month: { ownerId: likerId, friendId: senderId, month: monthStart } },
    create: { ownerId: likerId, friendId: senderId, month: monthStart, likesGiven, recsReceived, trustScore },
    update: { likesGiven, recsReceived, trustScore },
  });

  const newTop = await prisma.personalTrustRanking.findFirst({
    where: { ownerId: likerId, month: monthStart, trustScore: { gt: 0 } },
    orderBy: [{ trustScore: 'desc' }, { likesGiven: 'desc' }],
    select: { friendId: true },
  });

  if (newTop?.friendId === senderId && prevTop?.friendId !== senderId) {
    prisma.user.findUnique({ where: { id: likerId }, select: { displayName: true } })
      .then(liker => pushNotify(prisma, senderId, {
        title: `You're ${liker?.displayName}'s JamGuru 👑`,
        body: "They trust your music taste the most this month!",
        url: '/jamguru',
      })).catch(() => {})
  }
}

module.exports = { recomputeScores, FEEDBACK_TAGS, todayDate, thisMonthStart };
