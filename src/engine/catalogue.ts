// The Stop 1 playlist: five real recordings (public/music), each with a price in US cents and who shares the money.
// Prices are whole dollars so that, at the fixed demo rate (5 cents a test sat), every price and every share is a whole number of sats.
// The protocol still runs in sats: priceSats is what the signed offer and the invoice say.
import type { Lab } from './lab';
import { onboardAlice, signOffer, consent, purchase, payout } from './actions';
import { anchorAndVerify } from '../scenarios/common';
import { hearAndLicense } from './story';
export const CENTS_PER_SAT = 5; // keep in step with DEMO_CENTS_PER_SAT in src/ui/money.ts (a test checks this)
export interface Share { who: string; role: string; bps: number }
export interface CatalogueTrack { cast: string; title: string; seller: string; priceCents: number; shares: Share[]; blurb: string }
/** Keyed by the cast name in tracks.json. The seller's share is what is left after the co-owners. */
export const CATALOGUE: CatalogueTrack[] = [
  { cast: 'alice', title: 'Rain', seller: 'alice', priceCents: 500, shares: [{ who: 'alice', role: 'artist', bps: 6500 }, { who: 'carol', role: 'producer', bps: 2000 }, { who: 'dave', role: 'singer', bps: 1500 }], blurb: 'Shared with her producer and singer' },
  { cast: 'dave', title: 'Northern Lights', seller: 'dave', priceCents: 400, shares: [{ who: 'dave', role: 'artist', bps: 10_000 }], blurb: 'Solo: all his' },
  { cast: 'carol', title: 'Night Shift', seller: 'carol', priceCents: 600, shares: [{ who: 'carol', role: 'artist', bps: 8000 }, { who: 'erin', role: 'co-writer', bps: 2000 }], blurb: 'Co-written with Erin' },
  { cast: 'erin', title: 'Paper Boats', seller: 'erin', priceCents: 300, shares: [{ who: 'erin', role: 'artist', bps: 10_000 }], blurb: 'Solo: all hers' },
  { cast: 'frank', title: 'Rain (Frank remix)', seller: 'frank', priceCents: 700, shares: [{ who: 'frank', role: 'remixer', bps: 6000 }, { who: 'alice', role: 'original artist', bps: 4000 }], blurb: 'A remix: Alice, who made the original, gets 40%' },
];
export const catalogueFor = (cast?: string) => CATALOGUE.find(c => c.cast === cast);
export const priceSats = (t: CatalogueTrack) => t.priceCents / CENTS_PER_SAT;
/** Share amounts in whole cents that add up to the price exactly (largest remainder). */
export function shareCents(t: CatalogueTrack): number[] {
  const raw = t.shares.map(s => (t.priceCents * s.bps) / 10_000); const out = raw.map(Math.floor); let left = t.priceCents - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]); for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
  return out;
}
export const termsFor = (t: CatalogueTrack, sellerName: string) => `Standard creator licence for "${t.title}" by ${sellerName}: non-exclusive use of the recording in online video, worldwide, perpetual. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.`;
/** Bob licenses any playlist track. Rain uses the main-path world exactly as before; the others get their own signed offer
 *  naming the track's real SHA-256, the seller's own key and wallet, co-owner consents, a distributor's owner voucher, and the payout. */
export async function licenseTrack(lab: Lab, t: CatalogueTrack, sha256: string) {
  if (t.cast === 'alice') return { ...(await hearAndLicense(lab)), track: t };
  const name = `offer.track.${t.cast}`; const co = t.shares.filter(s => s.who !== t.seller);
  if (!lab.a[name]) {
    lab.setUpAll([t.seller, ...co.map(s => s.who), 'distributor', 'bob']); if (!lab.a[`binding.${t.seller}`]) onboardAlice(lab, t.seller, { quiet: true });
    lab.ownerVouch('distributor', t.seller, `distributor record for "${t.title}"`, sha256);
    signOffer(lab, t.seller, 'creator', { name, price: priceSats(t), coOwners: co.map(s => ({ pubkey: lab.pub(s.who), role: s.role, bps: s.bps })), masterSha256: sha256, title: t.title, track: t.cast, termsText: termsFor(t, lab.name(t.seller)) });
    for (const s of co) consent(lab, s.who, name);
    lab.stamp(lab.a[name].id, `proof of release (${t.title})`); lab.anchorBatch(`Proof of release: ${t.title}`);
  }
  const ids = t.shares.map(s => s.who); const before = Object.fromEntries(ids.map(k => [k, lab.balances[k] ?? 0]));
  const t0 = performance.now(); const r = purchase(lab, 'bob', name, { artist: t.seller, name: `bundle.track.${t.cast}`, seconds: 60 }); const verdict = await anchorAndVerify(lab, r.bundle, `licence for ${t.title}`);
  const ms = performance.now() - t0; const p = payout(lab, name, r.bundle, t.seller);
  const split = ids.map(k => ({ who: lab.name(k), id: k, sats: (lab.balances[k] ?? 0) - before[k] }));
  return { bundle: r.bundle, verdict, ms, split, statements: p.statements.length, block: verdict.result.anchoredHeight, track: t };
}
