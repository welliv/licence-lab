// Market rates: conversion both ways, whole sats, the band check, and what happens when the rate source fails or is old.
import { describe, it, expect } from 'vitest';
import { RateBook, parseRate, parseMempool, agree, spreadOf, canPrice, satsToFiat, fiatToSats, satsPerUnit, checkQuote, formatFiat, MAX_AGE_MS, FRESH_MS, type Rate } from '../src/live/rates';
import { Lab } from '../src/engine/lab';
import { quotedSale, signBand, bandOf, BAND } from '../src/engine/livePrice';

const usd: Rate = { currency: 'USD', btc: 80_000, at: 0, source: 'test' };
const jpy: Rate = { currency: 'JPY', btc: 12_000_000, at: 0, source: 'test' };

describe('conversion', () => {
  it('sats to dollars, rounded to the cent', () => { expect(satsToFiat(100_000, usd)).toBe(80); expect(satsToFiat(1, usd)).toBe(0); expect(satsToFiat(1_234, usd)).toBe(0.99); });
  it('dollars to whole sats, rounded up so the seller never gets less', () => {
    expect(fiatToSats(20, usd)).toBe(25_000); expect(fiatToSats(0.01, usd)).toBe(13); expect(Number.isInteger(fiatToSats(19.99, usd))).toBe(true);
    expect(satsToFiat(fiatToSats(19.99, usd), usd)).toBeGreaterThanOrEqual(19.99);
  });
  it('both ways agree to within a cent of sats', () => { for (const s of [1_000, 24_158, 99_999]) expect(Math.abs(fiatToSats(satsToFiat(s, usd), usd) - s)).toBeLessThanOrEqual(13); });
  it('yen has no minor unit', () => { expect(satsToFiat(10_000, jpy)).toBe(1200); expect(formatFiat(1200, 'JPY')).toBe('¥1,200'); expect(formatFiat(20, 'USD')).toBe('$20.00'); });
  it('sats per dollar', () => { expect(satsPerUnit(usd)).toBe(1250); });
  it('refuses nonsense input', () => { expect(() => satsToFiat(1.5, usd)).toThrow(); expect(() => fiatToSats(-1, usd)).toThrow(); expect(() => fiatToSats(NaN, usd)).toThrow(); });
});

// A stub for both sources: Alby answers per currency, mempool.space answers all currencies with its own time.
type Net = { alby?: number | null; mempool?: number | null; mempoolTime?: number };
const stub = (net: Net, now: () => number) => async (url: string) => {
  const ok = (body: any) => ({ ok: true, status: 200, json: async () => body });
  if (url.includes('getalby.com')) { if (net.alby == null) throw new Error('offline'); const c = url.match(/rates\/(\w+)\.json/)![1].toUpperCase(); return ok({ code: c, rate_float: net.alby }); }
  if (url.includes('mempool.space')) { if (net.mempool == null) throw new Error('offline'); return ok({ time: Math.floor((net.mempoolTime ?? now()) / 1000), USD: net.mempool, EUR: net.mempool, GBP: net.mempool, JPY: net.mempool }); }
  throw new Error('unknown url ' + url);
};

describe('rate sources', () => {
  it('reads both answers and refuses a wrong or empty one', () => {
    expect(parseRate({ code: 'USD', rate_float: 82787.46 }, 'USD', 5).btc).toBe(82787.46);
    expect(() => parseRate({ code: 'EUR', rate_float: 1 }, 'USD', 5)).toThrow(/EUR/); expect(() => parseRate({ code: 'USD', rate_float: 0 }, 'USD', 5)).toThrow();
    const m = parseMempool({ time: 1_792_396_502, USD: 82634 }, 'USD', 1_792_396_510_000); expect(m.btc).toBe(82634); expect(m.at).toBe(1_792_396_502_000); expect(m.ownTime).toBe(true);
    expect(() => parseMempool({ USD: 1 }, 'USD', 5)).toThrow(/time/);
  });
  it('agree: within 2%, the average is the rate, dated by the older time', async () => {
    let t = 1_000_000; const book = new RateBook(stub({ alby: 80_000, mempool: 81_000, mempoolTime: t - 30_000 }, () => t), () => t);
    const s = await book.get('USD'); expect(s.status).toBe('live'); expect(s.rate!.btc).toBe(80_500); expect(s.rate!.at).toBe(t - 30_000); expect(s.spread).toBeCloseTo(0.0125, 4);
    expect(checkQuote(20, s, BAND, t)).toMatchObject({ ok: true }); expect(canPrice(s, t)).toBe(true);
  });
  it('asks once a minute, then again', async () => {
    let t = 1_000, calls = 0; const f = stub({ alby: 80_000, mempool: 80_000 }, () => t); const book = new RateBook(async u => { calls++; return f(u); }, () => t);
    await book.get('USD'); t += FRESH_MS - 1; await book.get('USD'); expect(calls).toBe(2); t += 2; await book.get('USD'); expect(calls).toBe(4);
  });
  it('disagree by more than 2%: no quote, even with a recent agreed rate', async () => {
    let t = 1_000_000; const net: Net = { alby: 80_000, mempool: 80_000 }; const book = new RateBook(stub(net, () => t), () => t);
    await book.get('USD'); net.mempool = 84_000; t += 30_000; const s = await book.get('USD', { force: true });
    expect(s.status).toBe('disagree'); expect(s.spread).toBeCloseTo(0.05, 3); expect(s.sources.every(x => x.rate)).toBe(true);
    expect(checkQuote(20, s, BAND, t)).toMatchObject({ ok: false, code: 'sources_disagree' }); expect(canPrice(s, t)).toBe(false);
    expect(spreadOf(80_000, 81_600)).toBeCloseTo(0.02, 6); expect(agree({ currency: 'USD', btc: 80_000, at: 0, source: 'a' }, { currency: 'USD', btc: 81_600, at: 0, source: 'b' })).not.toBeNull();
    expect(agree({ currency: 'USD', btc: 80_000, at: 0, source: 'a' }, { currency: 'USD', btc: 81_700, at: 0, source: 'b' })).toBeNull();
  });
  it('one source down with no agreed rate yet: no quote', async () => {
    const t = 1_000_000; const book = new RateBook(stub({ alby: 80_000, mempool: null }, () => t), () => t);
    const s = await book.get('USD'); expect(s.status).toBe('one-source'); expect(s.rate).toBeNull(); expect(s.error).toMatch(/mempool.space: offline/);
    expect(checkQuote(20, s, BAND, t)).toMatchObject({ ok: false, code: 'one_source' });
  });
  it('one source down after an agreed rate: the last agreed rate prices sales for 10 minutes, then stops', async () => {
    let t = 1_000_000; const net: Net = { alby: 80_000, mempool: 80_000 }; const book = new RateBook(stub(net, () => t), () => t);
    await book.get('USD'); net.mempool = null; t += 5 * 60_000;
    const s1 = await book.get('USD', { force: true }); expect(s1.status).toBe('last-known'); expect(s1.rate!.at).toBe(1_000_000); expect(checkQuote(20, s1, BAND, t)).toMatchObject({ ok: true, sats: 25_000 });
    t = 1_000_000 + MAX_AGE_MS + 1; const s2 = await book.get('USD', { force: true }); expect(s2.status).toBe('too-old'); expect(checkQuote(20, s2, BAND, t)).toMatchObject({ ok: false, code: 'rate_too_old' });
  });
  it('both down: last agreed rate with its time, then too old; never had one: no rate', async () => {
    let t = 1_000_000; const net: Net = { alby: 80_000, mempool: 80_000 }; const book = new RateBook(stub(net, () => t), () => t);
    await book.get('USD'); net.alby = null; net.mempool = null; t += 60_000;
    expect((await book.get('USD', { force: true })).status).toBe('last-known'); t += MAX_AGE_MS; expect((await book.get('USD', { force: true })).status).toBe('too-old');
    const fresh = new RateBook(stub({}, () => t), () => t); const s = await fresh.get('GBP'); expect(s.status).toBe('none'); expect(checkQuote(20, s, BAND, t)).toMatchObject({ ok: false, code: 'no_rate' });
  });
  it('a source whose own time is over 10 minutes old counts as not answering', async () => {
    const t = 10_000_000; const book = new RateBook(stub({ alby: 80_000, mempool: 80_000, mempoolTime: t - MAX_AGE_MS - 1_000 }, () => t), () => t);
    const s = await book.get('USD'); expect(s.status).toBe('one-source'); expect(s.sources.find(x => x.id === 'mempool')!.error).toMatch(/too old/);
  });
});

describe('band check', () => {
  it('the agent checks the band before quoting', () => {
    expect(checkQuote(20, usd, BAND, 0)).toEqual({ ok: true, sats: 25_000 });
    expect(checkQuote(40, usd, BAND, 0)).toMatchObject({ ok: false, code: 'above_band', sats: 50_000 });
    expect(checkQuote(5, usd, BAND, 0)).toMatchObject({ ok: false, code: 'below_band' });
  });
  it('Alice\'s node accepts a quote inside her signed band and the licence verifies', async () => {
    const lab = new Lab('rates-ok'); expect(bandOf(signBand(lab))).toEqual(BAND);
    const r = await quotedSale(lab, fiatToSats(20, usd), '≈ $20.00'); expect(r.ok).toBe(true); if (r.ok) expect(r.verdict.result.ok).toBe(true);
  });
  it('Alice\'s node refuses a quote outside the band, even if the pricing key signs it', async () => {
    const lab = new Lab('rates-bad'); const r = await quotedSale(lab, fiatToSats(40, usd), '≈ $40.00'); expect(r.ok).toBe(false); if (!r.ok) expect(r.code).toBe('quote_band');
    const low = await quotedSale(lab, 14_999, 'too low'); expect(low.ok).toBe(false);
  });
});
