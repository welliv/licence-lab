// Market rates for showing and quoting prices in dollars (or euros, pounds, yen...). The protocol and the invoice stay in sats.
// Two independent public sources, both keyless and callable from the browser:
//   - Alby rates API (getalby.com/api/rates/<code>.json): BTC in that currency; no time of its own, so we use the fetch time.
//   - mempool.space (/api/v1/prices): BTC in USD, EUR, GBP, CAD, CHF, AUD and JPY, with its own `time`.
// Rules:
//   - A sale is priced only on an agreed rate: both sources answer within 2% of each other; the agreed rate is their average.
//   - Sources that disagree by more than 2%: no quote. Only one source answering: no quote, unless the last agreed
//     rate is under 10 minutes old (then that rate is used, with its time shown).
//   - Rates are reused for 1 minute. A rate older than 10 minutes (by the source's own time where it has one) cannot price a sale.
//   - Sats are always whole: a price is rounded UP, so the artist never gets less.

export const SATS_PER_BTC = 100_000_000;
export const CURRENCIES = [
  { code: 'USD', name: 'US dollar', unit: 'US dollar' }, { code: 'EUR', name: 'Euro', unit: 'euro' }, { code: 'GBP', name: 'Pound sterling', unit: 'pound' },
  { code: 'JPY', name: 'Japanese yen', unit: 'Japanese yen' }, { code: 'CHF', name: 'Swiss franc', unit: 'Swiss franc' },
  { code: 'CAD', name: 'Canadian dollar', unit: 'Canadian dollar' }, { code: 'AUD', name: 'Australian dollar', unit: 'Australian dollar' },
] as const;
export type Currency = (typeof CURRENCIES)[number]['code'];
export const FRESH_MS = 60_000;
export const MAX_AGE_MS = 10 * 60_000;
/** Two sources must agree within this fraction (2%). */
export const MAX_SPREAD = 0.02;

export type SourceId = 'alby' | 'mempool';
export interface Source { id: SourceId; name: string; url: (c: Currency) => string; ownTime: boolean; read(json: any, c: Currency, fetchedAt: number): Rate }
export interface Rate { currency: Currency; btc: number; at: number; source: string; ownTime?: boolean }

const isCurrency = (c: string): c is Currency => CURRENCIES.some(x => x.code === c);
const positive = (x: unknown) => { const n = Number(x); if (!Number.isFinite(n) || n <= 0) throw new Error('the source gave no usable rate'); return n; };

/** Read one Alby answer. Anything odd is an error, never a guessed rate. */
export function parseRate(json: any, currency: Currency, at: number): Rate {
  if (String(json?.code ?? '').toUpperCase() !== currency) throw new Error(`the source answered for ${json?.code ?? 'no currency'}, not ${currency}`);
  return { currency, btc: positive(json?.rate_float), at, source: 'Alby rates API', ownTime: false };
}
/** Read one mempool.space answer; its `time` (Unix seconds) is the time of the price. */
export function parseMempool(json: any, currency: Currency, fetchedAt: number): Rate {
  const t = Number(json?.time); if (!Number.isFinite(t) || t <= 0) throw new Error('the source gave no time');
  const at = Math.min(t * 1000, fetchedAt);
  return { currency, btc: positive(json?.[currency]), at, source: 'mempool.space', ownTime: true };
}
export const SOURCES: Source[] = [
  { id: 'alby', name: 'Alby rates API', url: c => `https://getalby.com/api/rates/${c.toLowerCase()}.json`, ownTime: false, read: parseRate },
  { id: 'mempool', name: 'mempool.space', url: () => 'https://mempool.space/api/v1/prices', ownTime: true, read: parseMempool },
];
/** Kept for the code drawer and older callers. */
export const RATE_SOURCE = { name: SOURCES.map(s => s.name).join(' + '), url: 'https://getalby.com/api/rates/' } as const;

/** How far apart two rates are, as a fraction of the lower one. */
export const spreadOf = (a: number, b: number) => Math.abs(a - b) / Math.min(a, b);
/** Agreed rate of two answers: their average, dated by the older of the two times. Null if they are more than 2% apart. */
export function agree(a: Rate, b: Rate): Rate | null {
  if (a.currency !== b.currency || spreadOf(a.btc, b.btc) > MAX_SPREAD) return null;
  return { currency: a.currency, btc: (a.btc + b.btc) / 2, at: Math.min(a.at, b.at), source: `${a.source} + ${b.source}` };
}

export const satsPerUnit = (r: Rate) => SATS_PER_BTC / r.btc;
const digits = (c: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).resolvedOptions().maximumFractionDigits ?? 2;
export function satsToFiat(sats: number, r: Rate): number {
  if (!Number.isInteger(sats) || sats < 0) throw new Error('sats must be a whole number, 0 or more');
  const f = 10 ** digits(r.currency); return Math.round((sats * r.btc / SATS_PER_BTC) * f) / f;
}
export function fiatToSats(amount: number, r: Rate): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('amount must be 0 or more');
  return Math.ceil(amount * SATS_PER_BTC / r.btc - 1e-6);
}
export const formatFiat = (amount: number, c: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).format(amount);
export const formatSats = (s: number) => `${Math.round(s).toLocaleString('en-GB')} sats`;
export const utcTime = (ms: number) => new Date(ms).toISOString().slice(11, 16) + ' UTC';
export const ageText = (ms: number) => ms < 60_000 ? 'just now' : `${Math.floor(ms / 60_000)} min ago`;
export const usable = (r: Rate | null, now: number) => !!r && now - r.at <= MAX_AGE_MS;

/** live: two sources agree now · last-known: not both answering, last agreed rate under 10 min old ·
 *  too-old: last agreed rate over 10 min old · none: never had an agreed rate · disagree: both answer, > 2% apart ·
 *  one-source: one answers and there is no recent agreed rate. Only live and last-known can price a sale. */
export type RateStatus = 'live' | 'last-known' | 'too-old' | 'none' | 'disagree' | 'one-source';
export interface SourceAnswer { id: SourceId; name: string; rate: Rate | null; error?: string }
export interface RateState { currency: Currency; rate: Rate | null; status: RateStatus; sources: SourceAnswer[]; spread?: number; error?: string; checkedAt: number }
export const canPrice = (s: Pick<RateState, 'status' | 'rate'> | null, now: number) => !!s && (s.status === 'live' || s.status === 'last-known') && usable(s.rate, now);

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;
export class RateBook {
  private agreed = new Map<Currency, Rate>(); private last = new Map<Currency, RateState>();
  constructor(private fetcher: Fetcher = (u) => fetch(u, { cache: 'no-store' }), private now: () => number = Date.now, private sources: Source[] = SOURCES) {}
  lastKnown(c: Currency) { return this.agreed.get(c) ?? null; }
  private async ask(s: Source, c: Currency): Promise<SourceAnswer> {
    const t = this.now();
    try {
      const res = await this.fetcher(s.url(c)); if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rate = s.read(await res.json(), c, t);
      if (t - rate.at > MAX_AGE_MS) throw new Error(`its price is from ${utcTime(rate.at)}, too old`);
      return { id: s.id, name: s.name, rate };
    } catch (e: any) { return { id: s.id, name: s.name, rate: null, error: e?.message ?? String(e) }; }
  }
  async get(currency: string, o: { force?: boolean } = {}): Promise<RateState> {
    if (!isCurrency(currency)) throw new Error(`unsupported currency ${currency}`);
    const t = this.now(); const prev = this.last.get(currency);
    if (!o.force && prev && prev.status === 'live' && t - prev.checkedAt < FRESH_MS) return prev;
    const sources = await Promise.all(this.sources.map(s => this.ask(s, currency)));
    const ok = sources.filter(s => s.rate); const lastAgreed = this.agreed.get(currency) ?? null;
    let st: RateState;
    if (ok.length === 2) {
      const spread = spreadOf(ok[0].rate!.btc, ok[1].rate!.btc); const a = agree(ok[0].rate!, ok[1].rate!);
      if (a) { this.agreed.set(currency, a); st = { currency, rate: a, status: 'live', sources, spread, checkedAt: t }; }
      else st = { currency, rate: lastAgreed, status: 'disagree', sources, spread, error: `the sources are ${(spread * 100).toFixed(1)}% apart`, checkedAt: t };
    } else {
      const error = sources.filter(s => !s.rate).map(s => `${s.name}: ${s.error}`).join('; ');
      const status: RateStatus = lastAgreed ? (usable(lastAgreed, t) ? 'last-known' : 'too-old') : ok.length === 1 ? 'one-source' : 'none';
      st = { currency, rate: lastAgreed, status, sources, error, checkedAt: t };
    }
    this.last.set(currency, st); return st;
  }
}

export type QuoteCode = 'no_rate' | 'rate_too_old' | 'sources_disagree' | 'one_source' | 'below_band' | 'above_band';
export type QuoteCheck = { ok: true; sats: number } | { ok: false; code: QuoteCode; sats?: number; text: string };
/** The pricing agent's own check before it signs a quote: an agreed, fresh rate, and a sats price inside the band the artist signed. */
export function checkQuote(priceFiat: number, s: Pick<RateState, 'status' | 'rate' | 'spread'> | Rate | null, band: { min: number; max: number }, now: number): QuoteCheck {
  const st = s && 'btc' in s ? { status: 'live' as RateStatus, rate: s } : s;
  if (st?.status === 'disagree') return { ok: false, code: 'sources_disagree', text: `The two sources are ${((st.spread ?? 0) * 100).toFixed(1)}% apart (more than ${MAX_SPREAD * 100}%), so no quote.` };
  if (st?.status === 'one-source') return { ok: false, code: 'one_source', text: 'Only one source answered and there is no recent agreed rate, so no quote.' };
  const rate = st?.rate ?? null;
  if (!rate) return { ok: false, code: 'no_rate', text: 'No market rate, so no quote.' };
  if (st!.status === 'too-old' || !usable(rate, now)) return { ok: false, code: 'rate_too_old', text: `The last agreed rate is from ${utcTime(rate.at)}, more than ${MAX_AGE_MS / 60_000} minutes old, so no quote.` };
  const sats = fiatToSats(priceFiat, rate);
  if (sats < band.min) return { ok: false, code: 'below_band', sats, text: `${formatSats(sats)} is below the lowest price Alice signed (${formatSats(band.min)}).` };
  if (sats > band.max) return { ok: false, code: 'above_band', sats, text: `${formatSats(sats)} is above the highest price Alice signed (${formatSats(band.max)}).` };
  return { ok: true, sats };
}
