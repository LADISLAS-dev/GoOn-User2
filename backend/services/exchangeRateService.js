const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

// Taux indicatifs utilisés uniquement si le fournisseur est injoignable et qu'aucun cache n'existe.
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, CHF: 0.88, XOF: 604, XAF: 604, MAD: 10, NGN: 1500, GHS: 15,
  BRL: 5.5, MXN: 18, JPY: 150, CNY: 7.2, INR: 83, AUD: 1.52,
};

let cache = null;

async function fetchRates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(RATES_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Exchange provider status ${response.status}`);
    const payload = await response.json();
    if (payload?.result !== 'success' || !payload.rates || typeof payload.rates !== 'object') {
      throw new Error('Exchange provider payload invalid');
    }
    return payload.rates;
  } finally {
    clearTimeout(timer);
  }
}

async function getExchangeRates({ now = Date.now(), fetcher = fetchRates } = {}) {
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;
  try {
    const rates = await fetcher();
    cache = { base: 'USD', rates, fetchedAt: now, source: 'live' };
  } catch (_) {
    cache = cache
      ? { ...cache, fetchedAt: now - CACHE_TTL_MS + 5 * 60 * 1000, source: 'stale' }
      : { base: 'USD', rates: FALLBACK_RATES, fetchedAt: now - CACHE_TTL_MS + 5 * 60 * 1000, source: 'fallback' };
  }
  return cache;
}

function currencyScale(currency) {
  try {
    return 10 ** new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch (_) {
    return 100;
  }
}

function convertMinorAmount(minor, from, to, rates) {
  if (from === to) return minor;
  if (!rates?.[from] || !rates?.[to]) return null;
  return Math.round(((minor / currencyScale(from)) / rates[from]) * rates[to] * currencyScale(to));
}

function resetExchangeRateCache() {
  cache = null;
}

module.exports = { getExchangeRates, convertMinorAmount, resetExchangeRateCache, FALLBACK_RATES };
