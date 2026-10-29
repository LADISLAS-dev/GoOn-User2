import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExchangeRates } from '../services/api';

const RATES_KEY = 'goon.exchangeRates.v1';
const DISPLAY_KEY = 'goon.displayCurrency.v1';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export const DISPLAY_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'XOF', 'XAF', 'MAD', 'NGN'];

let memory = null;

// Taux indicatifs utilisés si l'API de taux est injoignable, pour ne pas bloquer le panier.
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, CHF: 0.88, XOF: 604, XAF: 604, MAD: 10, NGN: 1500, GHS: 15,
  BRL: 5.5, MXN: 18, JPY: 150, CNY: 7.2, INR: 83, AUD: 1.52,
};

export function currencyScale(currency) {
  try {
    return 10 ** new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch (_) {
    return 100;
  }
}

export async function loadRates() {
  if (memory && Date.now() - memory.fetchedAt < MAX_AGE_MS) return memory.rates;
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(RATES_KEY)) || 'null');
    if (stored?.rates && Date.now() - stored.fetchedAt < MAX_AGE_MS) {
      memory = stored;
      return stored.rates;
    }
  } catch (_) {}
  try {
    const { rates } = await getExchangeRates();
    memory = { rates, fetchedAt: Date.now() };
    AsyncStorage.setItem(RATES_KEY, JSON.stringify(memory)).catch(() => {});
    return rates;
  } catch (_) {
    return memory?.rates || FALLBACK_RATES;
  }
}

export function convertMinor(minor, from, to, rates) {
  if (!from || !to || from === to) return minor;
  if (!rates?.[from] || !rates?.[to]) return null;
  const major = (minor || 0) / currencyScale(from);
  return Math.round((major / rates[from]) * rates[to] * currencyScale(to));
}

export async function getStoredDisplayCurrency() {
  return (await AsyncStorage.getItem(DISPLAY_KEY).catch(() => '')) || '';
}

export function storeDisplayCurrency(currency) {
  return AsyncStorage.setItem(DISPLAY_KEY, currency || '').catch(() => {});
}
