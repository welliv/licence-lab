// verifyLicence: one function, one clear reason on failure.
import { checkLink, verifyEvent, uniqueTags, KIND, tag, tagv, tagsOf, type Event, bindMessage } from './events.js';
import { decodeInvoice } from './bolt11.js';
import { recoverLnMessage } from './lnmsg.js';
import { httpBinding, requestHash, networkById } from './x402.js';
import { sha256hex, jcs, isHex, hexToBytes, utf8ToBytes, sha256, bytesToHex } from './util.js';
import { schnorr } from '@noble/curves/secp256k1';
import { type Anchor, type ChainOracle, MLA1, MLR1, MLR2, MLR_ANY } from './chain.js';
import { verifyOts } from './ots.js';

export interface LicenceBundle { version: 1; offer: Event; binding: Event; consents: Event[]; request: Event; invoice: string; preimage: string; anchor?: Anchor }
export interface Result { holder?: string; ok: boolean; code?: string; reason?: string; checks: string[]; anchoredHeight?: number; revocationMethod?: string }
export const requestBytes = (r: Event) => utf8ToBytes(jcs(r));
export const grantDigest = (b: Pick<LicenceBundle, 'offer' | 'binding' | 'request' | 'invoice' | 'preimage'>) =>
  sha256hex(jcs({ offer: b.offer.id, binding: b.binding.id, request: b.request.id, invoice: b.invoice, preimage: b.preimage }));

/** Does the request's use fall inside the offer's use? First four fields must match; "seconds=N" must be <= offer "max-seconds=M". */
export function useWithin(offerUse: string[], reqUse: string[]): string | null {
  for (let i = 1; i <= 4; i++) if (offerUse[i] !== reqUse[i]) return `use field ${i} differs (${reqUse[i]} vs ${offerUse[i]})`;
  if (!Array.isArray(reqUse) || reqUse.length < 5 || reqUse.length > 12) return 'use must have 4 to 11 fields';
  const INT = /^[1-9]\d{0,8}$/; // AUDIT F-09: strict positive integers (no NaN, "", "1e3", "-1", "0x10")
  const lim = new Map<string, string>(); for (const s of offerUse.slice(5)) { const [k, v, ...rest] = s.split('='); if (rest.length || v === undefined || lim.has(k)) return `offer scope "${s}" malformed`; lim.set(k, v); }
  if (lim.has('max-seconds') && !INT.test(lim.get('max-seconds')!)) return 'offer max-seconds malformed';
  const seen = new Set<string>();
  for (const s of reqUse.slice(5)) { const [k, v, ...rest] = s.split('='); if (rest.length || v === undefined || seen.has(k)) return `request scope "${s}" malformed or repeated`; seen.add(k);
    if (k === 'seconds') { if (!lim.has('max-seconds') || !INT.test(v) || Number(v) > Number(lim.get('max-seconds'))) return `seconds=${v} exceeds offer or is not a positive integer`; }
    else if (!lim.has(k) || lim.get(k) !== v) return `scope ${k}=${v} not offered`; }
  for (const [k, v] of lim) if (k !== 'max-seconds' && !seen.has(k)) return `request must restate scope ${k}=${v}`;
  if (lim.has('max-seconds') && !reqUse.slice(5).some(s => s.startsWith('seconds='))) return 'request must state seconds';
  return null;
}
/** Checks shared by the seller (before invoicing) and the verifier. */
export function checkDeal(offer: Event, binding: Event, consents: Event[], request: Event | null): void {
  const F = (c: string, m: string) => { throw Object.assign(new Error(m), { code: c }); };
  // 1 offer
  if (offer.kind !== KIND.OFFER || !verifyEvent(offer)) F('offer_signature', 'offer is not validly signed');
  const du = uniqueTags(offer, ['d', 'x', 'use', 'terms', 'terms-text', 'price', 'pay-link', 'binding', 'valid-until']); if (du) F('offer_tags', du);
  if (!/^[1-9]\d{0,12}$/.test(tagv(offer, 'price')!)) F('offer_price', 'price must be a positive whole number of sats');
  if (!/^\d{1,9}$/.test(tagv(offer, 'valid-until')!)) F('offer_valid_until', 'valid-until must be a block height');
  try { const u = new URL(tagv(offer, 'pay-link')!); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw 0; } catch { F('offer_pay_link', 'pay-link must be an http(s) URL'); }
  if (sha256hex(tagv(offer, 'terms-text') ?? '') !== tagv(offer, 'terms')) F('offer_terms', 'terms-text does not hash to terms');
  if (!(tagv(offer, 'terms-text') ?? '').includes('preimage of that invoice is the proof of acceptance')) F('offer_terms', 'licence text lacks the grant rule');
  // 2 consents
  let bps = 0; const owners = new Set<string>();
  for (const p of tagsOf(offer, 'p')) {
    if (!/^[0-9a-f]{64}$/.test(p[1] ?? '') || owners.has(p[1]) || p[1] === offer.pubkey) F('consent_shares', 'co-owner key malformed, repeated or equal to the artist');
    owners.add(p[1]);
    if (!/^(0|[1-9]\d{0,4})$/.test(p[3] ?? '')) F('consent_shares', 'share must be whole basis points 0..10000');
    const share = Number(p[3]); bps += share;
    const c = consents.find(c => c.pubkey === p[1] && c.kind === KIND.CONSENT && verifyEvent(c) && !uniqueTags(c, ['e', 'terms', 'share', 'payout']) && tagv(c, 'e') === offer.id && tagv(c, 'terms') === tagv(offer, 'terms') && Number(tagv(c, 'share')) === share);
    if (!c) F('consent_missing', `co-owner ${p[1].slice(0, 12)}… (${p[2]}) has no valid consent for this offer and share`);
  }
  if (bps > 10000) F('consent_shares', 'co-owner shares exceed 100%');
  // 3 binding
  if (binding.kind !== KIND.BINDING || !verifyEvent(binding)) F('binding_signature', 'binding is not validly signed');
  { const d = uniqueTags(binding, ['node', 'scope', 'node-sig']); if (d) F('binding_tags', d); }
  { const nb = tagsOf(binding, 'not-before'); if (nb.length > 1 || (nb.length === 1 && !isHex(nb[0][1], 64))) F('binding_tags', 'binding not-before must be one block hash'); }
  if (binding.pubkey !== offer.pubkey) F('binding_artist', 'binding is signed by a different key than the offer');
  if (tagv(offer, 'binding') !== binding.id) F('binding_ref', 'offer does not name this binding');
  const scope = tag(binding, 'scope')?.slice(1) ?? [];
  if (!scope.includes('*') && !scope.includes(tagv(offer, 'd')!)) F('binding_scope', 'binding does not cover this offer');
  const node = tagv(binding, 'node')!; let rec = '';
  try { rec = recoverLnMessage(bindMessage(binding.pubkey), tagv(binding, 'node-sig')!); } catch { /* falls through */ }
  if (rec !== node) F('binding_node_sig', 'node-sig was not made by the bound node');
  if (!request) return;
  // 4 request
  if (request.kind !== KIND.REQUEST || !verifyEvent(request)) F('request_signature', 'request is not validly signed');
  { const d = uniqueTags(request, ['e', 'terms', 'x', 'use', 'licensor', 'node', 'amount', 'network', 'nonce', 'not-before']); if (d) F('request_tags', d); }
  const eq = (n: string, v: string | undefined) => { if (tagv(request, n) !== v) F('request_mismatch', `request ${n} does not match offer`); };
  eq('e', offer.id); eq('terms', tagv(offer, 'terms')); eq('x', tagv(offer, 'x')); eq('licensor', offer.pubkey); eq('node', node);
  eq('amount', String(Number(tagv(offer, 'price')) * 1000));
  if (!networkById(tagv(request, 'network') ?? '')) F('request_network', 'unknown network');
  if (!isHex(tagv(request, 'nonce'), 64)) F('request_nonce', 'nonce must be 32 bytes hex');
  if (!isHex(tagv(request, 'not-before'), 64)) F('request_not_before', 'not-before must be a block hash');
  const u = useWithin(tag(offer, 'use')!, tag(request, 'use')!); if (u) F('request_use', u);
}

export async function verifyLicence(b: LicenceBundle, chain?: ChainOracle, opts: { requireAnchor?: boolean; link?: Event } = {}): Promise<Result> {
  const checks: string[] = [];
  const fail = (code: string, reason: string): Result => ({ ok: false, code, reason, checks });
  try { checkDeal(b.offer, b.binding, b.consents, b.request); } catch (e: any) { return fail(e.code ?? 'deal', e.message); }
  let holder: string | undefined; // AUDIT F-21: optional private link proves which main key holds this per-licence key
  if (opts.link) { const l = checkLink(opts.link, b.request); if (l) return fail('link_invalid', l); holder = opts.link.pubkey; checks.push('0 holder link'); }
  checks.push('1 offer', '2 consents', '3 binding', '4 request');
  // 5 + 6 invoice
  let inv; try { inv = decodeInvoice(b.invoice); } catch (e: any) { return fail('invoice_decode', e.message); }
  if (!inv.descriptionHash || inv.description !== undefined) return fail('invoice_description', 'invoice must carry exactly one description hash and no description');
  const url = tag(b.offer, 'pay-link')![1];
  const h = requestHash(httpBinding('POST', url, requestBytes(b.request), { 'content-type': 'application/json' }));
  if (inv.descriptionHash !== h) return fail('invoice_not_committed', 'invoice description hash does not commit to this request');
  checks.push('5 invoice commits to request');
  if (inv.payee !== tagv(b.binding, 'node')) return fail('invoice_wrong_node', 'invoice was signed by a node that is not bound to the artist');
  if (inv.amountMsat?.toString() !== tagv(b.request, 'amount')) return fail('invoice_amount', 'invoice amount differs from the request');
  const net = networkById(tagv(b.request, 'network')!)!; if (!net.currency.includes(inv.currency)) return fail('invoice_network', 'invoice currency does not match request network');
  checks.push('6 invoice signer and amount');
  // 7 preimage
  if (!isHex(b.preimage, 64) || sha256hex(hexToBytes(b.preimage)) !== inv.paymentHash) return fail('preimage', 'preimage does not hash to the invoice payment hash');
  checks.push('7 preimage');
  if (!chain) return opts.requireAnchor ? fail('no_chain', 'no chain oracle given; checks 8 and 9 not done') : { ok: true, holder, checks, reason: 'checks 8 and 9 skipped: not a full verification' };
  // 8 anchor
  const D = grantDigest(b); const a = b.anchor;
  if (!a) return fail('anchor_missing', 'no timestamp proof');
  let height: number | null;
  if (a.type === 'ots') { // AUDIT F-18: follow the proof's ops from D to a Bitcoin block-header merkle root
    if (!chain.merkleRootAtHeight) return fail('anchor_unverifiable', 'chain oracle cannot serve block headers for OpenTimestamps');
    const o = await verifyOts(a.ots ?? '', D, { merkleRootAtHeight: h => chain.merkleRootAtHeight!(h) });
    if (o.status === 'pending') return fail('anchor_pending', 'OpenTimestamps proof is still pending (not yet in a block); upgrade it from the calendar');
    if (o.status !== 'confirmed') return fail('anchor_invalid', 'OpenTimestamps proof invalid: ' + o.reason);
    height = o.height!; checks.push('8a ots proof -> block ' + height);
  } else {
    height = await chain.opReturnHeight(a.txid!, a.blockhash!, MLA1 + D);
    if (height === null) return fail('anchor_invalid', 'anchor transaction does not commit to this licence digest in a confirmed block');
  }
  const nb = await chain.heightOfBlockHash(tagv(b.request, 'not-before')!);
  if (nb === null) return fail('not_before_unknown', 'not-before block is not in the best chain');
  if (height < nb) return fail('anchor_before_request', 'anchor is earlier than the request\'s not-before block');
  const vu = Number(tagv(b.offer, 'valid-until'));
  if (height > vu + 144) return fail('offer_lapsed', `anchored at ${height}, after valid-until ${vu} + 144`);
  checks.push('8 timestamp');
  // 9 revocation absence (needs a full node)
  // N-1: scan from the binding's not-before block (signed by the artist) when present; otherwise from genesis
  let from = 0; const bnb = tagv(b.binding, 'not-before');
  if (bnb) { const h0 = await chain.heightOfBlockHash(bnb); if (h0 === null) return fail('binding_not_before_unknown', 'binding not-before block is not in the best chain'); if (h0 > height) return fail('anchor_before_binding', 'anchor is earlier than the binding'); from = h0; }
  const revs = await chain.scanOpReturns(MLR_ANY, height, from);
  let hit: { payload: string; height: number } | undefined;
  for (const r of revs) {
    const target = revocationTarget(r.payload, b.offer.pubkey, [b.offer.id, b.binding.id]); if (!target) continue;
    // AUDIT F-04: an offer ("retire") revocation must not void a licence that was invoiced before it. The invoice timestamp
    // is signed by the artist's own bound node, and the buyer refuses invoices dated in the future, so the artist cannot use it
    // to rug a buyer; block time can run up to 2h fast, hence the margin. Binding (compromise) revocations stay strict,
    // because a thief holding the node key could backdate invoices.
    if (target === b.offer.id && chain.blockTime) { const t = await chain.blockTime(r.height); if (t !== null && inv.timestamp < t - 7200) continue; }
    hit = r; break;
  }
  if (hit) return fail('revoked', `a revocation (MLR1) for this offer or binding was mined at height ${hit.height}, at or before the anchor (${height})`);
  checks.push('9 no prior revocation');
  return { ok: true, holder, checks, anchoredHeight: height, revocationMethod: chain.method + (from ? ` from height ${from}` : ' from genesis') };
}
/** Self-authenticating on-chain revocation: "MLR1" || target id (32) || BIP-340 sig by artist over SHA-256("MLR1" || target). 100 bytes. */
export function revocationPayload(targetId: string, artistSk: Uint8Array): string {
  const msg = sha256(hexToBytes(MLR1 + targetId));
  return MLR1 + targetId + bytesToHex(schnorr.sign(msg, artistSk));
}
export function revocationValid(payload: string, artistPub: string, targets: string[]): boolean { return revocationTarget(payload, artistPub, targets) !== null; }
/** MUTINYNET ROUND N-2: Mutinynet (Inquisition 29.2) relays OP_RETURN only up to 80 data bytes, so the 100-byte MLR1 never
 *  propagates there (or on any node with the old default). MLR2 fits in 80: "MLR2" || first 12 bytes of target id || BIP-340 sig
 *  over SHA-256("MLR2" || full target id). The signature covers the full id, so the short prefix cannot be ground to hit another target. */
export function revocationPayloadCompact(targetId: string, artistSk: Uint8Array): string {
  return MLR2 + targetId.slice(0, 24) + bytesToHex(schnorr.sign(sha256(hexToBytes(MLR2 + targetId)), artistSk));
}
/** Which of `targets` (if any) a revocation payload validly revokes. */
export function revocationTarget(payload: string, artistPub: string, targets: string[]): string | null {
  try {
    if (payload.startsWith(MLR1) && payload.length === 8 + 64 + 128) { const t = payload.slice(8, 72); if (targets.includes(t) && schnorr.verify(payload.slice(72), sha256(hexToBytes(MLR1 + t)), artistPub)) return t; }
    if (payload.startsWith(MLR2) && payload.length === 8 + 24 + 128) { for (const t of targets) if (t.startsWith(payload.slice(8, 32)) && schnorr.verify(payload.slice(32), sha256(hexToBytes(MLR2 + t)), artistPub)) return t; }
  } catch { /* malformed */ } return null;
}
