// Dollars on the main path: the demo rate, and splits that always add up to the price exactly.
import { describe, it, expect } from 'vitest';
import { splitCents, usd, usdFromSats, satsToCents, PRICE_CENTS, BUDGET_USD, SCALE_CENTS } from '../src/engine/money';
import { Lab } from '../src/engine/lab';
import * as S from '../src/engine/story';
describe('dollars (demo rate)', () => {
  it('the 100-sat price reads as $5.00, and the budget and 1,000 licences in dollars', () => {
    expect(PRICE_CENTS).toBe(500); expect(usd(PRICE_CENTS)).toBe('$5.00'); expect(usdFromSats(S.PRICE)).toBe('$5.00');
    expect(usd(BUDGET_USD.perPayment, { whole: true })).toBe('$25'); expect(usd(BUDGET_USD.daily, { whole: true })).toBe('$7,500'); expect(usd(SCALE_CENTS, { whole: true })).toBe('$5,000');
    expect(SCALE_CENTS).toBeLessThanOrEqual(BUDGET_USD.daily);
  });
  it('$5.00 = $3.25 + $1.00 + $0.75 (Alice 65%, Carol 20%, Dave 15%)', () => {
    expect(splitCents(500, [6500, 2000, 1500])).toEqual([325, 100, 75]); expect(splitCents(500, [65, 20, 15]).map(c => usd(c))).toEqual(['$3.25', '$1.00', '$0.75']);
  });
  it('any split adds up to the total exactly, to the cent', () => {
    for (const [t, w] of [[100, [1, 1, 1]], [1, [65, 20, 15]], [999, [6500, 2000, 1500]], [12345, [3, 7]], [7, [1, 1, 1, 1, 1, 1, 1, 1]], [0, [1, 2]]] as [number, number[]][]) {
      const s = splitCents(t, w); expect(s.reduce((a, b) => a + b, 0)).toBe(t); s.forEach(c => expect(Number.isInteger(c) && c >= 0).toBe(true)); }
    expect(splitCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(() => splitCents(1.5, [1])).toThrow();
  });
  it('the real Stop 1 split in sats converts to dollars that add up to the price', async () => {
    const r = await S.hearAndLicense(new Lab('money-test')); const cents = splitCents(satsToCents(r.split.reduce((a, b) => a + b.sats, 0)), r.split.map(s => s.sats));
    expect(cents.reduce((a, b) => a + b, 0)).toBe(PRICE_CENTS); expect(Object.fromEntries(r.split.map((s, i) => [s.id, usd(cents[i])]))).toEqual({ alice: '$3.25', carol: '$1.00', dave: '$0.75' });
  });
});
