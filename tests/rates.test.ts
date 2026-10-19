// Market rates: conversion both ways, whole sats, the band check, and what happens when the rate source fails or is old.
import { describe, it, expect } from 'vitest';
import { RateBook, parseRate, satsToFiat, fiatToSats, satsPerUnit, checkQuote, usable, formatFiat, MAX_AGE_MS, FRESH_MS, type Rate } from '../src/live/rates';
import { Lab } from '../src/engine/lab';
import { quotedSale, signBand, bandOf, BAND } from '../src/engine/livePrice';

const usd: Rate = { currency: 'USD', btc: 80_000, at: 0, source: 'test' };
const jpy: Rate = { currency: 'JPY', btc: 12_000_000, at: 0, source: 'test' };
const answer = (code: string, rate: number) => ({ ok: true, status: 200, json: async () => ({ code, symbol: '$', rate_float: rate }) });

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

describe('rate source', () => {
  it('reads the Alby answer and refuses a wrong or empty one', () => {
    expect(parseRate({ code: 'USD', rate_float: 82787.46 }, 'USD', 5).btc).toBe(82787.46);
    expect(() => parseRate({ code: 'EUR', rate_float: 1 }, 'USD', 5)).toThrow(/EUR/); expect(() => parseRate({ code: 'USD', rate_float: 0 }, 'USD', 5)).toThrow();
  });
  it('asks once a minute, then again', async () => {
    let t = 1_000, calls = 0; const book = new RateBook(async () => { calls++; return answer('USD', 80_000); }, () => t);
    expect((await book.get('USD')).status).toBe('live'); t += FRESH_MS - 1; await book.get('USD'); expect(calls).toBe(1); t += 2; await book.get('USD'); expect(calls).toBe(2);
  });
  it('when the source fails it keeps the last rate with its time, then stops quoting once it is too old', async () => {
    let t = 0, up = true; const book = new RateBook(async () => { if (!up) throw new Error('offline'); return answer('USD', 80_000); }, () => t);
    await book.get('USD'); up = false; t = 5 * 60_000;
    const s1 = await book.get('USD', { force: true }); expect(s1.status).toBe('last-known'); expect(s1.rate!.at).toBe(0); expect(s1.error).toBe('offline');
    t = MAX_AGE_MS + 1; const s2 = await book.get('USD', { force: true }); expect(s2.status).toBe('too-old'); expect(usable(s2.rate, t)).toBe(false);
    expect(checkQuote(20, s2.rate, BAND, t)).toMatchObject({ ok: false, code: 'rate_too_old' });
  });
  it('no rate at all: no quote', async () => {
    const book = new RateBook(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const s = await book.get('GBP'); expect(s.status).toBe('none'); expect(s.error).toMatch(/503/); expect(checkQuote(20, s.rate, BAND, Date.now())).toMatchObject({ ok: false, code: 'no_rate' });
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
