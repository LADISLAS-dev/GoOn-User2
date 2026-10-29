const express = require('express');
const { getExchangeRates } = require('../services/exchangeRateService');

const router = express.Router();

router.get('/', async (_req, res) => {
  const { base, rates, fetchedAt, source } = await getExchangeRates();
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ success: true, base, rates, updatedAt: new Date(fetchedAt).toISOString(), source });
});

module.exports = router;
