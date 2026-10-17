// The Stop 1 playlist and licence types. Five real recordings (public/music), each with a creator price in US cents and who shares the money,
// and three licence types: Personal (DRAFT type), Creator and Business (the spec's "advert" use). All prices are whole dollars, so at the
// fixed demo rate (5 cents a test sat) every price and every share is a whole number of sats. The protocol still runs in sats.
import type { Lab } from './lab';
import { onboardAlice, signOffer, consent, purchase, payout, release } from './actions-story';
import { anchorAndVerify } from '../scenarios/common';
import { hearAndLicense, PRICE } from './story';
export const CENTS_PER_SAT = 5; // keep in step with DEMO_CENTS_PER_SAT in src/ui/money.ts (a test checks this)
export interface Share { who: string; role: string; bps: number }
export interface CatalogueTrack { cast: string; title: string; seller: string; priceCents: number; shares: Share[]; blurb: string }
/** Keyed by the cast name in tracks.json. priceCents is the Creator price. The first share is the seller's. */
export const CATALOGUE: CatalogueTrack[] = [
  { cast: 'alice', title: 'Rain', seller: 'alice', priceCents: 500, shares: [{ who: 'alice', role: 'artist', bps: 6500 }, { who: 'carol', role: 'producer', bps: 2000 }, { who: 'dave', role: 'singer', bps: 1500 }], blurb: 'Shared with her producer and singer' },
  { cast: 'dave', title: 'Northern Lights', seller: 'dave', priceCents: 400, shares: [{ who: 'dave', role: 'artist', bps: 10_000 }], blurb: 'Solo: all his' },
  { cast: 'carol', title: 'Night Shift', seller: 'carol', priceCents: 600, shares: [{ who: 'carol', role: 'artist', bps: 8000 }, { who: 'erin', role: 'co-writer', bps: 2000 }], blurb: 'Co-written with Erin' },
  { cast: 'erin', title: 'Paper Boats', seller: 'erin', priceCents: 300, shares: [{ who: 'erin', role: 'artist', bps: 10_000 }], blurb: 'Solo: all hers' },
  { cast: 'frank', title: 'Rain (Frank remix)', seller: 'frank', priceCents: 700, shares: [{ who: 'frank', role: 'remixer', bps: 6000 }, { who: 'alice', role: 'original artist', bps: 4000 }], blurb: 'A remix: Alice, who made the original, gets 40%' },
];
export type LicenceType = 'personal' | 'creator' | 'business';
/** What each licence type allows, in 5–6 plain words, and which protocol use it maps to. Personal is a DRAFT type (not in the spec yet). */
export const LICENCES: { id: LicenceType; label: string; allows: string; use: 'personal' | 'creator' | 'advert'; draft: boolean }[] = [
  { id: 'personal', label: 'Personal', allows: 'Just for you, no money made', use: 'personal', draft: true },
  { id: 'creator', label: 'Creator', allows: 'Use in your videos, forever', use: 'creator', draft: false },
  { id: 'business', label: 'Business', allows: 'Use in ads for one year', use: 'advert', draft: false },
];
export const licence = (id: LicenceType) => LICENCES.find(l => l.id === id)!;
export const catalogueFor = (cast?: string) => CATALOGUE.find(c => c.cast === cast);
/** Default price for a track and licence type: Personal $1, Creator the track's price, Business ten times Creator. */
export const defaultPriceCents = (t: CatalogueTrack, type: LicenceType = 'creator') => type === 'personal' ? 100 : type === 'business' ? t.priceCents * 10 : t.priceCents;
export const PRICE_STEP_CENTS = 100, PRICE_MIN_CENTS = 100, PRICE_MAX_CENTS = 20_000; // Alice's price stepper: $1 to $200 in $1 steps
export const toSats = (cents: number) => cents / CENTS_PER_SAT;
export const priceSats = (t: CatalogueTrack, cents = t.priceCents) => toSats(cents);
/** Share amounts in whole cents that add up to the price exactly (largest remainder). */
export function shareCents(t: CatalogueTrack, priceCents = t.priceCents): number[] {
  const raw = t.shares.map(s => (priceCents * s.bps) / 10_000); const out = raw.map(Math.floor); let left = priceCents - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]); for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
  return out;
}
const TERM_TEXT: Record<LicenceType, (title: string, by: string) => string> = {
  personal: (t, by) => `Personal licence for "${t}" by ${by} (DRAFT licence type): play and use the recording privately and in your own non-commercial videos, worldwide, perpetual; no money may be made from it.`,
  creator: (t, by) => `Standard creator licence for "${t}" by ${by}: non-exclusive use of the recording in online video, worldwide, perpetual.`,
  business: (t, by) => `Advert licence for "${t}" by ${by}: non-exclusive use of the recording in adverts and brand videos, worldwide, 1 year.`,
};
export const termsFor = (t: CatalogueTrack, sellerName: string, type: LicenceType = 'creator') => `${TERM_TEXT[type](t.title, sellerName)} I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.`;
/** Make sure the seller is set up and a signed offer exists for this track, licence type and price. Returns the offer's name. */
export function ensureOffer(lab: Lab, t: CatalogueTrack, sha256: string, type: LicenceType, priceCents: number) {
  const sats = toSats(priceCents); const name = `offer.t.${t.cast}.${type}.${sats}`; if (lab.a[name]) return name;
  const co = t.shares.filter(s => s.who !== t.seller);
  if (t.seller === 'alice') release(lab); // Rain's world: Alice's key, wallet and distributor voucher
  lab.setUpAll([t.seller, ...co.map(s => s.who), 'distributor']); if (!lab.a[`binding.${t.seller}`]) onboardAlice(lab, t.seller, { quiet: true });
  if (!lab.a[`ownervouch.${t.cast}`]) { lab.a[`ownervouch.${t.cast}`] = t.seller === 'alice' && sha256 === lab.trackHash ? true : lab.ownerVouch('distributor', t.seller, `distributor record for "${t.title}"`, sha256); }
  signOffer(lab, t.seller, licence(type).use, { name, price: sats, coOwners: co.map(s => ({ pubkey: lab.pub(s.who), role: s.role, bps: s.bps })), masterSha256: sha256, title: t.title, track: t.cast, termsText: termsFor(t, lab.name(t.seller), type) });
  for (const s of co) consent(lab, s.who, name);
  lab.stamp(lab.a[name].id, `proof of release (${t.title}, ${type})`); lab.anchorBatch(`Proof of release: ${t.title} (${type})`);
  return name;
}
/** Bob's agent licenses a playlist track with the chosen licence type and price. Rain's default (Creator, $5) is the main-path sale exactly as before. */
export async function licenseTrack(lab: Lab, t: CatalogueTrack, sha256: string, o: { type?: LicenceType; priceCents?: number } = {}) {
  const type = o.type ?? 'creator'; const priceCents = o.priceCents ?? defaultPriceCents(t, type);
  if (t.cast === 'alice' && type === 'creator' && toSats(priceCents) === PRICE) return { ...(await hearAndLicense(lab)), track: t, type, priceCents };
  const name = ensureOffer(lab, t, sha256, type, priceCents); lab.setUp('bob');
  const ids = t.shares.map(s => s.who); const before = Object.fromEntries(ids.map(k => [k, lab.balances[k] ?? 0]));
  const t0 = performance.now(); const r = purchase(lab, 'bob', name, { artist: t.seller, name: `bundle.${name}`, seconds: 60 }); const verdict = await anchorAndVerify(lab, r.bundle, `licence for ${t.title} (${type})`);
  const ms = performance.now() - t0; const p = payout(lab, name, r.bundle, t.seller);
  const split = ids.map(k => ({ who: lab.name(k), id: k, sats: (lab.balances[k] ?? 0) - before[k] }));
  return { bundle: r.bundle, verdict, ms, split, statements: p.statements.length, block: verdict.result.anchoredHeight, track: t, type, priceCents };
}
/** "Put up your song": your own file (hashed on your device, never uploaded) becomes a signed offer with your licence type and price; Bob buys it.
 *  No distributor has vouched for it, so ownership stays "unverified". The seller key is the Lab's "alice" key, shown on the page as "you". */
export async function ownSongSale(lab: Lab, f: { title: string; sha256: string; type: LicenceType; priceCents: number }) {
  release(lab); lab.setUp('bob'); const sats = toSats(f.priceCents); const name = `offer.own.${f.sha256.slice(0, 8)}.${f.type}.${sats}`;
  const t: CatalogueTrack = { cast: 'own', title: f.title, seller: 'alice', priceCents: f.priceCents, shares: [{ who: 'alice', role: 'artist', bps: 10_000 }], blurb: '' };
  if (!lab.a[name]) signOffer(lab, 'alice', licence(f.type).use, { name, price: sats, coOwners: [], masterSha256: f.sha256, title: f.title, track: 'own', termsText: termsFor(t, 'you', f.type) });
  const r = purchase(lab, 'bob', name, { name: `bundle.${name}`, seconds: 60 }); const verdict = await anchorAndVerify(lab, r.bundle, 'your song');
  verdict.file = { ok: lab.a[name].tags.find((x: string[]) => x[0] === 'x')?.[1] === f.sha256, offerHash: f.sha256, fileHash: f.sha256, label: f.title, recomputed: true };
  return { offer: lab.a[name], bundle: r.bundle, verdict };
}
