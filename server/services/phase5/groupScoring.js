// Group score recalculation — called after every group like or unlike.
// Formula: Group Daily Score = Likes Received Today / (Group Recs Sent Today × Group Size)
// Group scores are completely isolated from personal trust rankings.

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

async function recomputeGroupScore(prisma, { groupId, recommendationId }) {
  const today = todayDate();

  const groupSize = await prisma.groupMember.count({ where: { groupId } });

  // Count likes received today on all group recommendations for this group
  const likesReceived = await prisma.like.count({
    where: {
      recommendation: { groupId },
      likedAt: { gte: today },
    },
  });

  // Count recs sent to this group today
  const recsSent = await prisma.recommendation.count({
    where: { groupId, sentAt: { gte: today } },
  });

  const denominator = recsSent * groupSize;
  const dailyScore = denominator > 0 ? likesReceived / denominator : 0;

  await prisma.groupScore.upsert({
    where: { groupId_scoreDate: { groupId, scoreDate: today } },
    create: { groupId, scoreDate: today, likesReceived, recsSent, groupSize, dailyScore },
    update: { likesReceived, recsSent, groupSize, dailyScore },
  });
}

module.exports = { recomputeGroupScore, todayDate };
