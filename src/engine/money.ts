// Dollars on the main path. The protocol and the real test payment stay in sats; the page shows US dollars
// at one fixed, clearly labelled demo rate (test money, not a market rate). All maths is in whole cents.
import { PRICE, BUDGET, SCALE } from './story';
/** Demo rate: 1 test sat = 5 US cents, so the 100-sat price reads as $5.00. Test money only; not a market rate. */
export const DEMO_CENTS_PER_SAT = 5;
export const DEMO_RATE_LABEL = '1 test sat = $0.05';
export const satsToCents = (sats: number) => Math.round(sats * DEMO_CENTS_PER_SAT);
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
/** "$5.00" (or "$7,500" with whole: true when the amount has no cents). */
export const usd = (cents: number, o: { whole?: boolean } = {}) => (o.whole && cents % 100 === 0 ? fmt0 : fmt).format(cents / 100);
export const usdFromSats = (sats: number, o: { whole?: boolean } = {}) => usd(satsToCents(sats), o);
/** Split a total in cents by weights (e.g. sats or basis points) so the parts always add up to the total exactly (largest remainder). */
export function splitCents(totalCents: number, weights: number[]): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error('total must be whole cents');
  const sum = weights.reduce((a, b) => a + b, 0); if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map(w => (totalCents * w) / sum); const out = raw.map(Math.floor); let left = totalCents - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
  return out;
}
export const PRICE_CENTS = satsToCents(PRICE); // $5.00
export const BUDGET_USD = { perPayment: satsToCents(BUDGET.maxPerPaymentSat), daily: satsToCents(BUDGET.dailyCapSat) }; // $25, $7,500
export const SCALE_CENTS = satsToCents(PRICE * SCALE); // $5,000 for 1,000 licences
