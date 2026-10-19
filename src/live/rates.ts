// Market rates for showing and quoting prices in dollars (or euros, pounds, yen...). The protocol and the invoice stay in sats.
// Source: Alby's public rates API (the same feed Alby's sandbox uses). One request per currency; the answer is BTC in that currency.
// Rules: reuse a rate for 1 minute; if the source fails, keep showing the last rate with its time; a rate older than
// 10 minutes cannot be used for a quote. Sats are always whole: a dollar price is rounded UP, so the artist never gets less.

export const SATS_PER_BTC = 100_000_000;
export const RATE_SOURCE = { name: 'Alby rates API', url: 'https://getalby.com/api/rates/' } as const;
export const CURRENCIES = [
  { code: 'USD', name: 'US dollar', unit: 'US dollar' }, { code: 'EUR', name: 'Euro', unit: 'euro' }, { code: 'GBP', name: 'Pound sterling', unit: 'pound' },
  { code: 'JPY', name: 'Japanese yen', unit: 'Japanese yen' }, { code: 'CHF', name: 'Swiss franc', unit: 'Swiss franc' },
  { code: 'CAD', name: 'Canadian dollar', unit: 'Canadian dollar' }, { code: 'AUD', name: 'Australian dollar', unit: 'Australian dollar' },
] as const;
export type Currency = (typeof CURRENCIES)[number]['code'];
/** Reuse a rate without asking again for this long. */
export const FRESH_MS = 60_000;
/** A rate older than this cannot price a sale (the source itself caches for 10 minutes). */
export const MAX_AGE_MS = 10 * 60_000;

export interface Rate { currency: Currency; btc: number; at: number; source: string }
export type RateStatus = 'live' | 'last-known' | 'too-old' | 'none';
export interface RateState { currency: Currency; rate: Rate | null; status: RateStatus; error?: string; checkedAt: number }

const isCurrency = (c: string): c is Currency => CURRENCIES.some(x => x.code === c);
const digits = (c: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).resolvedOptions().maximumFractionDigits ?? 2;

/** Read one answer from the rates API. Anything odd is an error, never a guessed rate. */
export function parseRate(json: any, currency: Currency, at: number): Rate {
  const btc = Number(json?.rate_float);
  if (String(json?.code ?? '').toUpperCase() !== currency) throw new Error(`the source answered for ${json?.code ?? 'no currency'}, not ${currency}`);
  if (!Number.isFinite(btc) || btc <= 0) throw new Error('the source gave no usable rate');
  return { currency, btc, at, source: RATE_SOURCE.name };
}

/** Sats in one unit of the currency (e.g. sats per dollar). */
export const satsPerUnit = (r: Rate) => SATS_PER_BTC / r.btc;
/** Whole sats to money, rounded to the currency's smallest unit (cents; whole yen). */
export function satsToFiat(sats: number, r: Rate): number {
  if (!Number.isInteger(sats) || sats < 0) throw new Error('sats must be a whole number, 0 or more');
  const d = digits(r.currency); const f = 10 ** d; return Math.round((sats * r.btc / SATS_PER_BTC) * f) / f;
}
/** Money to whole sats, rounded up so the seller never receives less than the price. */
export function fiatToSats(amount: number, r: Rate): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('amount must be 0 or more');
  return Math.ceil(amount * SATS_PER_BTC / r.btc - 1e-6);
}
export const formatFiat = (amount: number, c: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).format(amount);
export const formatSats = (s: number) => `${Math.round(s).toLocaleString('en-GB')} sats`;
export const utcTime = (ms: number) => new Date(ms).toISOString().slice(11, 16) + ' UTC';
export const ageText = (ms: number) => ms < 60_000 ? 'just now' : `${Math.floor(ms / 60_000)} min ago`;
/** Can this rate price a sale now? */
export const usable = (r: Rate | null, now: number) => !!r && now - r.at <= MAX_AGE_MS;

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;
/** Rates per currency: cached for a minute, last good rate kept when the source fails. */
export class RateBook {
  private last = new Map<Currency, Rate>();
  constructor(private fetcher: Fetcher = (u) => fetch(u, { cache: 'no-store' }), private now: () => number = Date.now) {}
  lastKnown(c: Currency) { return this.last.get(c) ?? null; }
  async get(currency: string, o: { force?: boolean } = {}): Promise<RateState> {
    if (!isCurrency(currency)) throw new Error(`unsupported currency ${currency}`);
    const t = this.now(); const prev = this.last.get(currency) ?? null;
    if (!o.force && prev && t - prev.at < FRESH_MS) return { currency, rate: prev, status: 'live', checkedAt: t };
    try {
      const res = await this.fetcher(RATE_SOURCE.url + currency.toLowerCase() + '.json');
      if (!res.ok) throw new Error(`the source answered HTTP ${res.status}`);
      const rate = parseRate(await res.json(), currency, t); this.last.set(currency, rate);
      return { currency, rate, status: 'live', checkedAt: t };
    } catch (e: any) {
      const error = e?.message ?? String(e);
      if (!prev) return { currency, rate: null, status: 'none', error, checkedAt: t };
      return { currency, rate: prev, status: usable(prev, t) ? 'last-known' : 'too-old', error, checkedAt: t };
    }
  }
}

export type QuoteCheck = { ok: true; sats: number } | { ok: false; code: 'no_rate' | 'rate_too_old' | 'below_band' | 'above_band'; sats?: number; text: string };
/** The pricing agent's own check before it signs a quote: a fresh rate, and a sats price inside the band the artist signed. */
export function checkQuote(priceFiat: number, rate: Rate | null, band: { min: number; max: number }, now: number): QuoteCheck {
  if (!rate) return { ok: false, code: 'no_rate', text: 'No market rate, so no quote.' };
  if (!usable(rate, now)) return { ok: false, code: 'rate_too_old', text: `The last rate is from ${utcTime(rate.at)}, more than ${MAX_AGE_MS / 60_000} minutes old, so no quote.` };
  const sats = fiatToSats(priceFiat, rate);
  if (sats < band.min) return { ok: false, code: 'below_band', sats, text: `${formatSats(sats)} is below the lowest price Alice signed (${formatSats(band.min)}).` };
  if (sats > band.max) return { ok: false, code: 'above_band', sats, text: `${formatSats(sats)} is above the highest price Alice signed (${formatSats(band.max)}).` };
  return { ok: true, sats };
}
