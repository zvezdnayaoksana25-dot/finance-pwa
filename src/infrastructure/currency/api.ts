import { Currency, ExchangeRate } from '../../domain';

export type RateProvider = (base: Currency, quote: Currency, signal?: AbortSignal) => Promise<{ rate: number; source: string }>;

const API_URL = 'https://api.frankfurter.app/latest';

export const frankfurterProvider: RateProvider = async (base, quote, signal) => {
  if (base === quote) return { rate: 1, source: 'same-currency' };
  const response = await fetch(`${API_URL}?from=${base}&to=${quote}`, { signal });
  if (!response.ok) throw new Error(`Currency API вернул HTTP ${response.status}`);
  const body = await response.json() as { rates?: Record<string, number> };
  const rate = body.rates?.[quote];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error('Currency API вернул неизвестную валюту');
  return { rate, source: 'Frankfurter (ECB)' };
};

export function reciprocalRate(rate: ExchangeRate, base: Currency, quote: Currency): number {
  if (rate.baseCurrency === base && rate.quoteCurrency === quote) return rate.rate;
  if (rate.baseCurrency === quote && rate.quoteCurrency === base) return 1 / rate.rate;
  throw new Error('Несовместимая валютная пара');
}

export async function fetchUsdRubRate(provider: RateProvider = frankfurterProvider, signal?: AbortSignal): Promise<Omit<ExchangeRate, 'id' | 'createdAt' | 'updatedAt'>> {
  const fetchedAt = new Date().toISOString();
  const result = await provider('USD', 'RUB', signal);
  return { baseCurrency: 'USD', quoteCurrency: 'RUB', rate: result.rate, source: result.source, fetchedAt };
}

export function latestUsdRubRate(rates: ExchangeRate[]): ExchangeRate | undefined {
  return rates.filter((item) => !item.deletedAt && item.baseCurrency === 'USD' && item.quoteCurrency === 'RUB').sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0];
}

export function convertMinor(amountMinor: number, from: Currency, to: Currency, usdRub: number): number {
  if (from === to) return amountMinor;
  const value = amountMinor / 100;
  return Math.round((from === 'USD' ? value * usdRub : value / usdRub) * 100);
}
