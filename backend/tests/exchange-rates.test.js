const test = require('node:test');
const assert = require('node:assert/strict');
const { getExchangeRates, resetExchangeRateCache, FALLBACK_RATES } = require('../services/exchangeRateService');

test('exchange rates are cached and fall back when the provider fails', async () => {
  resetExchangeRateCache();
  let calls = 0;
  const live = await getExchangeRates({ now: 1000, fetcher: async () => { calls += 1; return { USD: 1, EUR: 0.9 }; } });
  assert.equal(live.source, 'live');
  await getExchangeRates({ now: 2000, fetcher: async () => { calls += 1; return {}; } });
  assert.equal(calls, 1);

  resetExchangeRateCache();
  const fallback = await getExchangeRates({ now: 1000, fetcher: async () => { throw new Error('down'); } });
  assert.equal(fallback.source, 'fallback');
  assert.deepEqual(fallback.rates, FALLBACK_RATES);
  resetExchangeRateCache();
});

test('minor amounts convert between currencies using USD-based rates', () => {
  const { convertMinorAmount } = require('../services/exchangeRateService');
  const rates = { USD: 1, EUR: 0.9, XOF: 600 };
  assert.equal(convertMinorAmount(1000, 'USD', 'EUR', rates), 900);
  assert.equal(convertMinorAmount(1000, 'USD', 'XOF', rates), 6000);
  assert.equal(convertMinorAmount(500, 'EUR', 'EUR', rates), 500);
  assert.equal(convertMinorAmount(500, 'EUR', 'ZZZ', rates), null);
});
