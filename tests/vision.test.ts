// Licence types (Personal draft, Creator, Business), Alice's price stepper, and Stop 2: ClipAI's agent inside a monthly budget,
// plus the Harbour Music catalogue subscription (draft) and its renewal inside the budget.
import { describe, it, expect } from 'vitest';
import { Lab } from '../src/engine/lab';
import { CATALOGUE, LICENCES, defaultPriceCents, shareCents, licenseTrack, toSats, CENTS_PER_SAT, PRICE_MIN_CENTS, PRICE_MAX_CENTS, PRICE_STEP_CENTS } from '../src/engine/catalogue';
import { videoLicences, subscribe, renew, catalogueHash, PLAN, VIDEOS, budgetLeftCents, setBudget } from '../src/engine/company';
import { usd } from '../src/ui/money';
const fakeSha = (s: string) => Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(s.charCodeAt(i % s.length) + i * 7) % 16]).join('');
describe('licence types and prices', () => {
  it('Rain: Personal $1, Creator $5, Business $50; each allows something plain; only Personal is draft', () => {
    const rain = CATALOGUE[0]; expect(LICENCES.map(l => usd(defaultPriceCents(rain, l.id)))).toEqual(['$1.00', '$5.00', '$50.00']);
    expect(LICENCES.map(l => l.draft)).toEqual([true, false, false]); LICENCES.forEach(l => { const w = l.allows.split(' ').length; expect(w).toBeGreaterThanOrEqual(5); expect(w).toBeLessThanOrEqual(6); });
    expect(LICENCES.map(l => l.use)).toEqual(['personal', 'creator', 'advert']);
  });
  it('every track, every licence type and every price the stepper allows: shares are whole cents and whole sats that add up exactly', () => {
    for (const t of CATALOGUE) for (let c = PRICE_MIN_CENTS; c <= PRICE_MAX_CENTS; c += PRICE_STEP_CENTS) {
      const s = shareCents(t, c); expect(s.reduce((a, b) => a + b, 0)).toBe(c); s.forEach(x => { expect(Number.isInteger(x)).toBe(true); expect(Number.isInteger(x / CENTS_PER_SAT)).toBe(true); }); }
    for (const t of CATALOGUE) for (const l of LICENCES) expect(defaultPriceCents(t, l.id) % PRICE_STEP_CENTS).toBe(0);
  });
  it('Rain Business $50 = $32.50 + $10.00 + $7.50; Personal $1 = $0.65 + $0.20 + $0.15', () => {
    expect(shareCents(CATALOGUE[0], 5000).map(c => usd(c))).toEqual(['$32.50', '$10.00', '$7.50']); expect(shareCents(CATALOGUE[0], 100).map(c => usd(c))).toEqual(['$0.65', '$0.20', '$0.15']);
  });
  it('every track sells under every licence type and a changed price: valid licence, right use, payout matches the dollar split', async () => {
    const lab = new Lab('types-test');
    for (const t of CATALOGUE) for (const l of LICENCES) for (const cents of [defaultPriceCents(t, l.id), defaultPriceCents(t, l.id) + 300]) {
      const sha = t.cast === 'alice' ? lab.trackHash : fakeSha(t.title); const r = await licenseTrack(lab, t, sha, { type: l.id, priceCents: cents });
      expect(r.verdict.result.ok, `${t.title} ${l.id} ${cents}`).toBe(true); expect(r.verdict.ownership?.status).toBe('pass');
      expect(r.bundle.offer.tags.find(x => x[0] === 'use')![1]).toBe(l.use === 'creator' ? 'creator-video' : l.use);
      expect(Number(r.bundle.offer.tags.find(x => x[0] === 'price')![1])).toBe(toSats(cents)); expect(r.bundle.offer.tags.find(x => x[0] === 'x')![1]).toBe(sha);
      expect(r.split.map(s => s.sats * CENTS_PER_SAT)).toEqual(shareCents(t, cents)); }
  }, 60_000);
});
describe('Stop 2: ClipAI inside a monthly budget', () => {
  const shas = Object.fromEntries(CATALOGUE.map(t => [t.cast, fakeSha(t.title)]));
  it(`licenses all ${VIDEOS} user videos inside $3,000; stops at the budget when it is $1,000`, async () => {
    const a = await videoLicences(new Lab('clip-a'), shas, 300_000); expect(a.bought).toBe(VIDEOS); expect(a.refused).toBe(0); expect(a.spentSats * CENTS_PER_SAT).toBe(250_000); expect(a.sampleOk).toBe(a.sample);
    const credited = Object.values(a.credits).reduce((x, y) => x + y, 0); expect(credited).toBe(a.spentSats);
    const b = await videoLicences(new Lab('clip-b'), shas, 100_000); expect(b.bought).toBeLessThan(VIDEOS); expect(b.refused).toBe(VIDEOS - b.bought); expect(b.spentSats * CENTS_PER_SAT).toBeLessThanOrEqual(100_000); expect(b.reason).toMatch(/cap/);
  }, 60_000);
  it('the catalogue subscription: $99 lands with Harbour Music and splits to its artists; it renews next month inside the budget', async () => {
    const lab = new Lab('sub'); const x = catalogueHash(['dave', 'erin', 'frank'].map(c => shas[c]));
    const m1 = await subscribe(lab, x, 300_000); expect(m1.ok).toBe(true); if (!m1.ok) return;
    expect(m1.verdict.result.ok).toBe(true); expect(m1.verdict.ownership?.status).toBe('pass'); expect(m1.bundle.offer.tags.find(t => t[0] === 'use')![3]).toBe('1m');
    expect(m1.split.map(s => s.sats * CENTS_PER_SAT)).toEqual([2970, 2475, 2475, 1980]); expect(m1.split.reduce((a, s) => a + s.sats, 0) * CENTS_PER_SAT).toBe(PLAN.priceCents);
    expect(m1.until - m1.from).toBe(30 * 86400); expect(m1.budgetLeftCents).toBe(300_000 - 9_900);
    const m2 = await renew(lab, x, 300_000); expect(m2.ok).toBe(true); if (!m2.ok) return; expect(m2.month).toBe(2); expect(m2.verdict.result.ok).toBe(true); expect(m2.from).toBeLessThan(m1.until); expect(m2.budgetLeftCents).toBe(300_000 - 9_900);
  });
  it('renewal is refused when the budget left is below $99, and goes through when a person raises it', async () => {
    const lab = new Lab('sub-low'); const x = catalogueHash(['a', 'b'].map(fakeSha));
    await videoLicences(lab, shas, 260_000); expect(budgetLeftCents(lab)).toBe(10_000); // $2,500 spent, $100 left
    const ok = await subscribe(lab, x, 260_000); expect(ok.ok).toBe(true); expect(budgetLeftCents(lab)).toBe(100);
    const lab2 = new Lab('sub-low2'); await videoLicences(lab2, shas, 255_000); const no = await subscribe(lab2, x, 255_000); expect(no.ok).toBe(false); if (!no.ok) expect(no.reason).toMatch(/cap/);
    setBudget(lab2, 300_000); const yes = await subscribe(lab2, x, 300_000); expect(yes.ok).toBe(true);
  }, 60_000);
});
