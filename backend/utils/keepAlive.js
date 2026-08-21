const fetch = require('node-fetch');
const logger = require('./logger');

// Render's free tier suspends a web service after ~15 min without inbound HTTP
// traffic. A suspended instance takes 30–50s to wake, during which push sends
// time out and notifications are silently lost. Pinging our own public URL on a
// sub-15-min interval keeps the instance warm so sends always go through.
//
// Set KEEP_ALIVE_URL to the public base URL of this service on Render, e.g.
//   KEEP_ALIVE_URL=https://goon-user.onrender.com
// The self-ping is a no-op unless that env var is present, so local/dev runs
// are unaffected.

const PING_INTERVAL_MS = 13 * 60 * 1000; // 13 min — safely under Render's ~15 min idle window

let timer = null;

const resolveBaseUrl = () => {
  const raw =
    process.env.KEEP_ALIVE_URL ||
    process.env.RENDER_EXTERNAL_URL || // Render injects this automatically
    '';
  return typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
};

const pingOnce = async (baseUrl) => {
  try {
    const res = await fetch(`${baseUrl}/health`, { method: 'GET', timeout: 15000 });
    if (!res.ok) {
      logger.warn(`[KEEP-ALIVE] Ping returned HTTP ${res.status}`);
      return;
    }
    logger.info('[KEEP-ALIVE] Ping ok — instance kept warm');
  } catch (err) {
    logger.warn(`[KEEP-ALIVE] Ping failed: ${err.message}`);
  }
};

const startKeepAlive = () => {
  if (timer) return; // already running

  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    logger.info('[KEEP-ALIVE] Disabled (no KEEP_ALIVE_URL / RENDER_EXTERNAL_URL set)');
    return;
  }

  logger.info(`[KEEP-ALIVE] Enabled — pinging ${baseUrl}/health every 13 min`);
  timer = setInterval(() => pingOnce(baseUrl), PING_INTERVAL_MS);
  // Do not keep the event loop alive solely for this timer.
  if (typeof timer.unref === 'function') timer.unref();
};

const stopKeepAlive = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

module.exports = { startKeepAlive, stopKeepAlive };
