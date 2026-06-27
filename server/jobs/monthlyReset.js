const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function newMonthDate() {
  const now = new Date();
  return new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
}

async function runMonthlyReset() {
  const month = newMonthDate();
  console.log(`[monthlyReset] Initializing month ${month.toISOString().slice(0, 7)}…`);

  const users = await prisma.user.findMany({ select: { id: true } });

  let initialized = 0;
  for (const { id } of users) {
    await prisma.monthlyScore.upsert({
      where: { userId_month: { userId: id, month } },
      create: { userId: id, month, monthlyScore: 0 },
      update: {},
    });
    initialized++;
  }

  console.log(`[monthlyReset] Done — initialized ${initialized} monthly score rows for ${month.toISOString().slice(0, 7)}`);
  return { initialized, month: month.toISOString().slice(0, 7) };
}

function scheduleMonthlyReset() {
  // 00:01 on the 1st of every month
  cron.schedule('1 0 1 * *', () => {
    runMonthlyReset().catch(e => console.error('[monthlyReset] Error:', e));
  });
  console.log('[monthlyReset] Scheduled: 00:01 on the 1st of each month');
}

module.exports = { scheduleMonthlyReset, runMonthlyReset };
