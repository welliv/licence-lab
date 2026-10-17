// The main-path story: four short chapters on one Lab world. Every signature, invoice, timestamp and check is the real
// library; money, relays and blocks are simulated, exactly as in the scenarios. The UI words for each result live in ui/plain.ts.
import { Lab, short, tagv, type Verdict, type LicenceBundle } from './lab';
import { onboardAva, vouch, signOffer, consent, purchase, payout, listing, tagNet } from './actions';
import { anchorAndVerify } from '../scenarios/common';

export const PRICE = 100;
const JAY = (lab: Lab) => [{ pubkey: lab.pub('jay'), role: 'producer', bps: 2000 }];
/** Chapter 1: Ava (through her agent) puts "Rain" up for licence: key, own wallet node, vouching, signed offer, Jay's consent. */
export function artistSells(lab: Lab) {
  lab.setUpAll(['ava', 'echo', 'jay', 'distributor']); onboardAva(lab, 'ava', { quiet: true }); vouch(lab, 'distributor', 'ava');
  const offer = signOffer(lab, 'ava', 'creator', { price: PRICE, coOwners: JAY(lab) }); const c = consent(lab, 'jay', 'offer.creator');
  lab.stamp(offer.id, 'proof of release'); lab.anchorBatch('Proof of release'); lab.titleOrigin = lab.pub('ava');
  const l = listing(lab, 'offer.creator'); return { offer, consent: c, forSale: l.forSale, reason: l.reason };
}
export const has = (lab: Lab, k: string) => !!lab.a[k];
/** Home page: a person licenses "Rain" by hand (Mia's role, "you"). */
export async function youBuy(lab: Lab) {
  if (!has(lab, 'offer.creator')) artistSells(lab); lab.setUp('mia');
  const t0 = performance.now(); const r = purchase(lab, 'mia', 'offer.creator', { name: 'bundle.you', seconds: 60 }); const v = await anchorAndVerify(lab, r.bundle, 'your licence'); payout(lab, 'offer.creator', r.bundle);
  return { bundle: r.bundle, verdict: v, ms: performance.now() - t0 };
}
/** Chapter 2: Scout, ClipAI's agent, buys inside the budget ClipAI set (NWC limits). */
export async function agentBuys(lab: Lab) {
  if (!has(lab, 'offer.creator')) artistSells(lab); lab.setUpAll(['clipai', 'scout']); lab.setNwc('scout', { maxPerPaymentSat: 500, dailyCapSat: 5_000 });
  const before = { ava: lab.balances.ava ?? 0, jay: lab.balances.jay ?? 0, clipai: lab.balances.clipai };
  const t0 = performance.now(); const { offer, binding, consents } = listing(lab, 'offer.creator');
  const use = [...offer.tags.find((t: string[]) => t[0] === 'use')!.slice(1, 5), 'seconds=30'];
  const rq = lab.lib.makePrivateRequest(lab.key('scout'), { offer, binding, use, network: tagNet(), notBefore: lab.notBefore() });
  const { reqs, rec } = lab.issueInvoice({ nodeId: 'node.ava', creditTo: 'ava', offer, binding, consents, request: rq.request, label: 'Scout buys' });
  const p = lab.agentPay('scout', reqs, rq.request, offer, binding); if (!p.ok) throw new Error(p.error);
  const b = lab.bundle('bundle.scout', { offer, binding, consents, request: rq.request, invoice: rec.bolt11, preimage: p.preimage! }); const ms = performance.now() - t0;
  const v = await anchorAndVerify(lab, b, 'Scout licence'); payout(lab, 'offer.creator', b);
  return { bundle: b, verdict: v, ms, trace: p.trace, paid: before.clipai - lab.balances.clipai, ava: lab.balances.ava - before.ava, jay: lab.balances.jay - before.jay, budget: lab.nwc.scout };
}
/** Chapter 3: anyone checks the licence, then a forged copy (price edited after Ava signed). */
export async function anyoneVerifies(lab: Lab) {
  if (!has(lab, 'bundle.scout')) await agentBuys(lab); const b: LicenceBundle = lab.a['bundle.scout'];
  return lab.verify(b);
}
export async function forgedCopy(lab: Lab) {
  if (!has(lab, 'bundle.scout')) await agentBuys(lab); const x: LicenceBundle = structuredClone(lab.a['bundle.scout']);
  x.offer.tags = x.offer.tags.map(t => t[0] === 'price' ? ['price', '1', 'SATS'] : t); return lab.verify(x);
}
/** Chapter 4: Ava sells her rights in "Rain" to Harbour Music. Jay co-signs. Then: old licence, old key, new owner. */
export async function rightsChange(lab: Lab) {
  if (!has(lab, 'bundle.scout')) await agentBuys(lab);
  const t = lab.addTransfer('ava', { x: lab.trackHash, from: lab.pub('ava'), to: lab.pub('harbour'), reason: 'sale', coOwners: JAY(lab), note: 'Ava sells her rights in "Rain" to Harbour Music. Jay keeps his 20%.' }, { anchor: false });
  lab.cosign('jay', t.event, 'co-owner'); lab.anchorTitle(t, 'rights sale to Harbour'); lab.advance(1800);
  const earlier = await lab.verify(lab.a['bundle.scout']);
  lab.setUpAll(['sam', 'harbour']); const old = purchase(lab, 'sam', 'offer.creator', { name: 'bundle.oldkey', seconds: 30 }); const oldV = await anchorAndVerify(lab, old.bundle, 'old key sale');
  onboardAva(lab, 'harbour', { quiet: true }); signOffer(lab, 'harbour', 'creator', { name: 'offer.harbour', price: PRICE, coOwners: JAY(lab) }); consent(lab, 'jay', 'offer.harbour');
  const nw = purchase(lab, 'sam', 'offer.harbour', { artist: 'harbour', name: 'bundle.harbour', seconds: 30 }); const newV = await anchorAndVerify(lab, nw.bundle, 'Harbour sale');
  return { transfer: t, block: t.anchor!.height!, earlier, oldKey: oldV, newOwner: newV };
}
export const describeOffer = (lab: Lab) => { const o = lab.a['offer.creator']; return o ? { id: short(o.id), price: Number(tagv(o, 'price')), use: o.tags.find((t: string[]) => t[0] === 'use') } : null; };
export type { Verdict };
