// The Stop 1 playlist: per-track prices and splits in whole cents that add up exactly, and real licences for every track.
import { describe, it, expect } from 'vitest';
import { Lab } from '../src/engine/lab';
import { CATALOGUE, CENTS_PER_SAT, licenseTrack, priceSats, shareCents } from '../src/engine/catalogue';
import { DEMO_CENTS_PER_SAT, usd, splitCents } from '../src/engine/money';
const fakeSha = (s: string) => Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(s.charCodeAt(i % s.length) + i) % 16]).join('');
describe('playlist prices and splits', () => {
  it('uses the same demo rate as the page', () => { expect(CENTS_PER_SAT).toBe(DEMO_CENTS_PER_SAT); });
  it('every track: shares add up to 100% and the cents add up to the price exactly', () => {
    for (const t of CATALOGUE) { expect(t.shares.reduce((a, s) => a + s.bps, 0)).toBe(10_000); const c = shareCents(t);
      expect(c.reduce((a, b) => a + b, 0)).toBe(t.priceCents); c.forEach(x => expect(Number.isInteger(x)).toBe(true));
      expect(c).toEqual(splitCents(t.priceCents, t.shares.map(s => s.bps))); expect(Number.isInteger(priceSats(t))).toBe(true); expect(t.shares[0].who).toBe(t.seller); }
  });
  it('the prices and splits on the page', () => {
    const show = Object.fromEntries(CATALOGUE.map(t => [t.title, [usd(t.priceCents), ...t.shares.map((s, k) => `${s.who} ${usd(shareCents(t)[k])}`)].join(' ')]));
    expect(show).toEqual({ Rain: '$5.00 alice $3.25 carol $1.00 dave $0.75', 'Northern Lights': '$4.00 dave $4.00', 'Night Shift': '$6.00 carol $4.80 erin $1.20', 'Paper Boats': '$3.00 erin $3.00', 'Rain (Frank remix)': '$7.00 frank $4.20 alice $2.80' });
  });
  it('solo tracks have no co-owners; the remix shares with Alice, the original artist', () => {
    for (const k of ['dave', 'erin']) expect(CATALOGUE.find(t => t.cast === k)!.shares).toHaveLength(1);
    const remix = CATALOGUE.find(t => t.cast === 'frank')!; expect(remix.shares.find(s => s.who === 'alice')?.role).toBe('original artist');
  });
  it('every track sells with a valid licence naming its own file, and the payout in sats matches the dollar split', async () => {
    const lab = new Lab('catalogue-test');
    for (const t of CATALOGUE) { const sha = t.cast === 'alice' ? lab.trackHash : fakeSha(t.title); const r = await licenseTrack(lab, t, sha);
      expect(r.verdict.result.ok, t.title).toBe(true); expect(r.verdict.passed).toBe(9); expect(r.verdict.ownership?.status, t.title).toBe('pass');
      expect(r.bundle.offer.tags.find(x => x[0] === 'x')?.[1]).toBe(sha); expect(Number(r.bundle.offer.tags.find(x => x[0] === 'price')![1])).toBe(priceSats(t));
      expect(r.split.map(s => s.sats * CENTS_PER_SAT)).toEqual(shareCents(t)); expect(r.statements).toBe(t.shares.length - 1); }
  });
});
