// The action registry: one place for every protocol action a scenario can take. Scenarios are data that call these.
import { Lab, LAB_KIND, USES, short, type Event, type LicenceBundle, type Requirements, tagv, KIND } from './lab';
import { CAST } from './cast';

export interface Out { ok: boolean; summary: string; fields?: { label: string; value: string; mono?: boolean }[]; json?: unknown; code?: string; proves?: number[]; badge?: 'real' | 'sim' | 'limit' | 'open' | 'fail' | 'recorded'; trace?: string[]; verdict?: import('./lab').Verdict }
const F = (label: string, value: string | number, mono = true) => ({ label, value: String(value), mono });
export { F };

/** S1: Ava's key (in a simulated NIP-46 signer), her node, her binding, vouching, agent rules. */
export function onboardAva(lab: Lab, artist = 'ava', o: { nodeId?: string; quiet?: boolean } = {}) {
  const nodeId = o.nodeId ?? `node.${artist}`; lab.setUp(artist);
  lab.makeNode(nodeId, artist, `${lab.name(artist)}'s node`);
  const binding = lab.bind(artist, nodeId); lab.a[`binding.${artist}`] = binding; lab.a[`node.${artist}`] = nodeId;
  lab.publish(binding, artist, 'binding ✍');
  if (!o.quiet) lab.log({ from: artist, to: 'relays', text: `Node binding signed: "this Lightning node ${short(lab.nodes[nodeId].pub)} is mine" (event ${short(binding.id)})`, badge: 'real', code: `makeBinding(avaKey, nodePub, signLnMessage(bindMessage(avaPub), nodeKey))` });
  return binding;
}
export function vouch(lab: Lab, voucher: string, artist: string) {
  const e = lab.sign(voucher, LAB_KIND.VOUCH, [['L', 'mll.vouch'], ['l', 'artist-key', 'mll.vouch'], ['p', lab.pub(artist)], ['released', 'rain', '2026-03-01']], `This key belongs to the artist ${lab.name(artist)}, who released "Rain" with us.`);
  lab.a[`vouch.${voucher}.${artist}`] = e; lab.publish(e, voucher, 'vouch ✍'); return e;
}
/** S2: hash the track, sign an offer with co-owners, collect consents. */
export function signOffer(lab: Lab, artist: string, kind: keyof typeof USES, o: { price?: number; coOwners?: { pubkey: string; role: string; bps: number }[]; name?: string; binding?: Event; validUntil?: number; masterSha256?: string; termsText?: string } = {}) {
  const binding = o.binding ?? lab.a[`binding.${artist}`];
  const input = lab.offerInput(artist, kind, { priceSats: o.price ?? (kind === 'creator' ? 2_000 : kind === 'advert' ? 20_000 : kind === 'training' ? 50_000 : 5_000), bindingId: binding.id, coOwners: o.coOwners ?? lab.coOwners(), validUntil: o.validUntil, masterSha256: o.masterSha256, ...(o.termsText ? { termsText: o.termsText } : {}) });
  const offer = lab.lib.makeOffer(lab.key(artist), input); const name = o.name ?? `offer.${kind}`; lab.a[name] = offer; lab.a[`${name}.consents`] = [];
  lab.publish(offer, artist, `offer (${kind}) ✍`); return offer;
}
export function consent(lab: Lab, who: string, offerName: string) {
  const offer: Event = lab.a[offerName]; const p = offer.tags.find(t => t[0] === 'p' && t[1] === lab.pub(who));
  const c = lab.lib.makeConsent(lab.key(who), offer, Number(p?.[3] ?? 0), `${who}@lab.test`); (lab.a[`${offerName}.consents`] ??= []).push(c);
  lab.publish(c, who, 'consent ✍'); return c;
}
export function listing(lab: Lab, offerName: string, artist = 'ava') {
  const offer = lab.a[offerName], binding = lab.a[`binding.${artist}`] ?? lab.a[`${offerName}.binding`], consents = lab.a[`${offerName}.consents`] ?? [];
  try { lab.lib.checkDeal(offer, binding, consents, null); return { forSale: true, reason: 'all co-owners consented; shares add up', offer, binding, consents }; }
  catch (e: any) { return { forSale: false, reason: e.message, code: e.code, offer, binding, consents }; }
}
export function releaseRain(lab: Lab, kinds: (keyof typeof USES)[] = ['creator', 'advert', 'training', 'podcast'], artist = 'ava') {
  ['jay', 'nova', 'lena'].forEach(x => lab.setUp(x));
  for (const k of kinds) { signOffer(lab, artist, k); for (const who of ['jay', 'nova', 'lena']) consent(lab, who, `offer.${k}`); }
}
/** A full honest purchase (request → 402 → pay → bundle). Used by setups and by buying steps. */
export function purchase(lab: Lab, buyer: string, offerName: string, o: { seconds?: number; name?: string; fresh?: boolean; artist?: string; invoiceTimestamp?: number; payer?: string; useOverride?: string[] } = {}) {
  const artist = o.artist ?? 'ava'; const { offer, binding, consents } = listing(lab, offerName, artist);
  const use = o.useOverride ?? [...offer.tags.find((t: string[]) => t[0] === 'use')!.slice(1, 5), ...(offer.tags.find((t: string[]) => t[0] === 'use')!.some((s: string) => s.startsWith('max-seconds')) ? [`seconds=${o.seconds ?? 60}`] : [])];
  const r = o.fresh === false ? { request: lab.lib.makeRequest(lab.key(buyer), { offer, binding, use, network: tagNet(), notBefore: lab.notBefore() }), link: undefined }
    : lab.lib.makePrivateRequest(lab.key(buyer), { offer, binding, use, network: tagNet(), notBefore: lab.notBefore() });
  lab.flow(buyer, artist, 'request ✍ (fresh key)', 'event');
  const { rec, reqs } = lab.issueInvoice({ nodeId: lab.a[`node.${artist}`], creditTo: artist, offer, binding, consents, request: r.request, label: `${offerName} for ${buyer}`, timestamp: o.invoiceTimestamp });
  lab.flow(artist, buyer, `402 + invoice ${Number(reqs.amount) / 1000} sats`, 'invoice');
  const p = lab.pay(o.payer ?? buyer, rec.bolt11); if (!p.ok) throw new Error(p.error);
  lab.flow(artist, buyer, '🔑 preimage', 'preimage');
  const b = lab.bundle(o.name ?? `bundle.${buyer}`, { offer, binding, consents, request: r.request, invoice: rec.bolt11, preimage: p.preimage! });
  if (r.link) lab.a[`${o.name ?? `bundle.${buyer}`}.link`] = r.link;
  return { bundle: b, request: r.request, link: r.link, reqs, rec };
}
export const tagNet = () => 'lnbtc:00000008819873e925422c1ff0f99f7c';
/** Seller node pays each co-owner their share and signs a sales statement (simulated payouts, real signed statements). */
export function payout(lab: Lab, offerName: string, b: LicenceBundle, artist = 'ava', o: { skip?: string[] } = {}) {
  const offer: Event = lab.a[offerName]; const total = Number(tagv(b.request, 'amount')) / 1000; const lines: string[] = [];
  const statements: Event[] = [];
  for (const p of offer.tags.filter(t => t[0] === 'p')) { const who = Object.keys(CAST).find(id => lab.ready.has(id) && lab.pub(id) === p[1]) ?? 'unknown'; const share = Math.floor(total * Number(p[3]) / 10000);
    if (o.skip?.includes(who)) { lines.push(`${lab.name(who)}: left out`); continue; }
    const inv = lab.plainInvoice('node.wallets', who, share, `payout ${who}`); lab.balances[artist] -= share; lab.balances[who] = (lab.balances[who] ?? 0) + share; inv.paid = true;
    lab.flow(artist, who, `⚡ ${share} sats (${Number(p[3]) / 100}%)`, 'payment');
    const st = lab.lib.makeStatement(lab.key(artist), offer.id, lab.chain.tip.height, [{ request: b.request.id, paymentHash: '', amountMsat: total * 1000, payouts: [{ pubkey: p[1], amountMsat: share * 1000, paymentHash: inv.paymentHash }] }]);
    statements.push(st); (lab.a[`statements.${who}`] ??= []).push(st); lines.push(`${lab.name(who)}: ${share} sats`); }
  return { lines, statements };
}
export function report(lab: Lab, reporter: string, target: Event, reason: string, purpose = 'main') {
  const e = lab.sign(reporter, LAB_KIND.REPORT, [['e', target.id, 'impersonation'], ['p', target.pubkey, 'impersonation']], reason, purpose); lab.publish(e, reporter, '🚩 report'); return e;
}
export function statusRecord(lab: Lab, artist: string, revoked: string[]) {
  const e = lab.sign(artist, LAB_KIND.APPDATA, [['d', `mll-status:${new Date(lab.now * 1000).toISOString().slice(0, 10)}`], ['tip', String(lab.chain.tip.height)], ...revoked.map(r => ['revoked', r])], JSON.stringify({ revoked, offers: Object.keys(lab.a).filter(k => /^offer\.[a-z]+$/.test(k)).map(k => lab.a[k].id) }));
  lab.publish(e, artist, 'status record ✍'); return e;
}
export function reqsSummary(reqs: Requirements) { return [F('HTTP', '402 Payment Required'), F('scheme / network', `${reqs.scheme} / ${reqs.network.slice(0, 22)}…`), F('amount', `${Number(reqs.amount) / 1000} sats`), F('payTo (node)', short(reqs.payTo, 10)), F('invoice', short(reqs.extra.invoice, 18))]; }
export { KIND };
