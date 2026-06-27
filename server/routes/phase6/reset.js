const express = require('express');
const { runMonthlyReset } = require('../../jobs/monthlyReset');

const router = express.Router();

// POST /api/phase6/reset — manual trigger for testing
router.post('/reset', async (req, res) => {
  try {
    const result = await runMonthlyReset();
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[phase6/reset]', e);
    res.status(500).json({ error: 'Reset failed', details: e.message });
  }
});

module.exports = router;
