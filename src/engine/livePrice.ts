// Live price: Alice signs one offer with a price band in sats and names Echo's pricing key. At sale time Echo turns
// Alice's dollar price into sats at the market rate and signs a short quote. Alice's node checks the quote with the real
// library (checkDeal): a quote outside the band is refused, whatever the rate says. Practice money; real signatures.
import { Lab, tagv, type Event, type Verdict } from './lab';
import { listing, tagNet } from './actions';
import { baseWorld, anchorAndVerify } from '../scenarios/common';

/** The band Alice signs once, in sats. */
export const BAND = { min: 15_000, max: 30_000 };
/** Alice's list price for a Creator licence, in US dollars. */
export const LIST_USD = 20;

export function signBand(lab: Lab): Event {
  if (lab.a['price.band']) return lab.a['price.band'];
  lab.setUpAll(['alice', 'echo', 'bob', 'distributor']); baseWorld(lab, { kinds: ['creator'] });
  const { binding } = listing(lab, 'offer.creator');
  const offer = lab.lib.makeOffer(lab.key('alice'), lab.offerInput('alice', 'creator', { bindingId: binding.id, coOwners: [], priceSats: BAND.min, priceKey: lab.pub('echo', 'pricing'), priceMax: BAND.max, validUntil: lab.chain.tip.height + 144 * 30 }));
  lab.a['price.band'] = offer; return offer;
}

export type QuotedSale = { ok: true; quote: Event; offer: Event; verdict: Verdict; sats: number } | { ok: false; quote: Event; offer: Event; code: string; reason: string; sats: number };
let n = 0;
/** Echo signs a quote for `sats`; Alice's node checks it; if it passes, Bob pays and the licence is checked in full. */
export async function quotedSale(lab: Lab, sats: number, note: string): Promise<QuotedSale> {
  const offer = signBand(lab); const { binding } = listing(lab, 'offer.creator');
  const quote = lab.lib.makeQuote(lab.key('echo', 'pricing'), offer, sats, lab.chain.tip.height + 6, note);
  const rq = lab.lib.makePrivateRequest(lab.key('bob'), { offer, binding, use: ['creator-video', 'worldwide', 'perpetual', 'non-exclusive', 'seconds=30'], network: tagNet(), notBefore: lab.notBefore(), quote });
  try { lab.lib.checkDeal(offer, binding, [], rq.request, quote); } catch (e: any) { return { ok: false, quote, offer, sats, code: e.code ?? 'deal', reason: e.message }; }
  lab.balances.bob = Math.max(lab.balances.bob ?? 0, BAND.max * 2);
  const x = lab.issueInvoice({ nodeId: 'node.alice', creditTo: 'alice', offer, binding, consents: [], request: rq.request, label: 'live-price sale', skipDealCheck: true });
  const p = lab.pay('bob', x.rec.bolt11); if (!p.ok) return { ok: false, quote, offer, sats, code: 'payment', reason: p.error ?? 'payment failed' };
  const b = lab.bundle(`bundle.price.${++n}`, { offer, binding, consents: [], request: rq.request, invoice: x.rec.bolt11, preimage: p.preimage!, quote });
  const verdict = await anchorAndVerify(lab, b, 'live-price licence');
  return { ok: true, quote, offer, sats, verdict };
}
export const bandOf = (offer: Event) => ({ min: Number(tagv(offer, 'price')), max: Number(tagv(offer, 'price-max')) });
