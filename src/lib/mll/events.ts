// The licence events. Kind numbers are placeholders (see docs/01-first-principles.md).
import { finalizeEvent, getPublicKey, getEventHash, type Event } from 'nostr-tools/pure';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256hex, randomBytes, bytesToHex, hexToBytes } from './util.js';
export type { Event };
export const KIND = { OFFER: 30402, REQUEST: 3410, BINDING: 3411, REVOCATION: 3412, CONSENT: 3413, STATEMENT: 3414, LINK: 3415, QUOTE: 3416, OWNER_VOUCH: 1985 } as const;
export const tag = (e: Event, n: string) => e.tags.find(t => t[0] === n);
export const tagv = (e: Event, n: string) => tag(e, n)?.[1];
export const tagsOf = (e: Event, n: string) => e.tags.filter(t => t[0] === n);
const now = () => Math.floor(Date.now() / 1000);
const sign = (sk: Uint8Array, kind: number, tags: string[][], content = '', created_at = now()) => finalizeEvent({ kind, tags, content, created_at }, sk);

export const bindMessage = (artistPub: string) => `MLL-BIND:${artistPub}`;
/** notBefore (MUTINYNET ROUND, N-1): a recent block hash. Revocations of this binding or its offers count only from that block on,
 *  so a verifier scans [binding not-before, anchor] instead of the whole chain (3.5M blocks on Mutinynet).
 *  V2 A12b pre-rotation: `next` = nextKeyHash(next public key). Once a binding with `next` is timestamped (title record), only that
 *  next key can retire this key (a rotation transfer), so a thief holding this key cannot rotate it away or out-race the owner.
 *  V2 A18: `method` records how the node signed (`lnd-signmessage`, or `nwc-sign_message` for a per-user node reached over NWC). */
export function makeBinding(sk: Uint8Array, nodePub: string, nodeSig: string, scope: string[] = ['*'], notBefore?: string, o: { next?: string; method?: 'lnd-signmessage' | 'nwc-sign_message' } = {}) {
  return sign(sk, KIND.BINDING, [['node', nodePub], ['scope', ...scope], ['node-sig', nodeSig, o.method ?? 'lnd-signmessage'], ['revoke-via', 'opreturn'], ...(notBefore ? [['not-before', notBefore]] : []), ...(o.next ? [['next', o.next]] : [])]);
}
/** Pre-rotation commitment: SHA-256 of the next key's 32-byte x-only public key. */
export const nextKeyHash = (nextPub: string) => sha256hex(hexToBytes(nextPub));
export interface OfferInput { track: string; masterSha256: string; use: string[]; termsText: string; priceSats: number;
  payLink: string; bindingId: string; validUntil: number; coOwners: { pubkey: string; role: string; bps: number }[]; title?: string;
  /** V2 S21: an online pricing key may quote any price from priceSats (floor) to priceMax, signed in a QUOTE event; the main key stays offline. */
  priceKey?: string; priceMax?: number; }
export function makeOffer(sk: Uint8Array, o: OfferInput) {
  const d = `${o.track}:${o.use[0]}`;
  return sign(sk, KIND.OFFER, [['d', d], ['title', o.title ?? o.track], ['x', o.masterSha256], ['use', ...o.use],
    ['terms', sha256hex(o.termsText)], ['terms-text', o.termsText], ['price', String(o.priceSats), 'SATS'],
    ['pay-link', o.payLink, 'x402:exact:lnbtc', 'http:1'], ['binding', o.bindingId], ['valid-until', String(o.validUntil)],
    ...o.coOwners.map(c => ['p', c.pubkey, c.role, String(c.bps)]),
    ...(o.priceKey ? [['price-key', o.priceKey], ['price-max', String(o.priceMax ?? o.priceSats)]] : [])]);
}
/** V2 S21: a price quote by the offer's pricing key. `expires` is a block height: a request must name a not-before block at or below it. */
export function makeQuote(priceSk: Uint8Array, offer: Event, priceSats: number, expires: number, note = '') {
  return sign(priceSk, KIND.QUOTE, [['e', offer.id], ['price', String(priceSats), 'SATS'], ['expires', String(expires)]], note);
}
/** V2 ownership root: a voucher (distributor, label, registry) states that `owner` holds the rights to the recording `x` (its SHA-256).
 *  NIP-32 label. The protocol cannot judge ownership; a verifier decides which vouchers it trusts. */
export function makeOwnerVouch(voucherSk: Uint8Array, owner: string, x: string, ref = '') {
  return sign(voucherSk, KIND.OWNER_VOUCH, [['L', 'mll.owner'], ['l', 'owner', 'mll.owner'], ['p', owner], ['x', x], ...(ref ? [['ref', ref]] : [])], ref ? `Rights holder of ${x.slice(0, 12)}… (${ref})` : '');
}
export function makeConsent(sk: Uint8Array, offer: Event, bps: number, payout: string) {
  return sign(sk, KIND.CONSENT, [['e', offer.id], ['terms', tagv(offer, 'terms')!], ['share', String(bps)], ['payout', payout]]);
}
export interface RequestInput { offer: Event; binding: Event; use: string[]; network: string; notBefore: string; nonce?: string; quote?: Event }
export function makeRequest(sk: Uint8Array, r: RequestInput) {
  const o = r.offer; const price = r.quote ? tagv(r.quote, 'price')! : tagv(o, 'price')!;
  return sign(sk, KIND.REQUEST, [['e', o.id], ['terms', tagv(o, 'terms')!], ['x', tagv(o, 'x')!], ['use', ...r.use],
    ['licensor', o.pubkey], ['node', tagv(r.binding, 'node')!], ['amount', String(Number(price) * 1000)],
    ['network', r.network], ['nonce', r.nonce ?? bytesToHex(randomBytes(32))], ['not-before', r.notBefore], ...(r.quote ? [['quote', r.quote.id]] : [])]);
}
export function makeRevocation(sk: Uint8Array, targetId: string, reason: 'compromise' | 'retire') {
  return sign(sk, KIND.REVOCATION, [['e', targetId], ['reason', reason]]);
}
/** Signed statement of sales and payouts the artist sends each co-owner (new; forced by split auditing). */
export interface SaleLine { request: string; paymentHash: string; amountMsat: number; payouts: { pubkey: string; amountMsat: number; paymentHash: string }[] }
export function makeStatement(sk: Uint8Array, offerId: string, periodEnd: number, lines: SaleLine[]) {
  return sign(sk, KIND.STATEMENT, [['e', offerId], ['period-end', String(periodEnd)]], JSON.stringify(lines));
}
/** Strict verification. Do NOT use nostr-tools verifyEvent here: it caches a "verified" flag on the object
 *  (a Symbol property), and `{...event}` copies that flag, so an edited copy of a signed event still "verifies". */
export const LIMITS = { maxTags: 64, maxTagLen: 16, maxEventBytes: 32_768 } as const;
const HEX = (n: number) => new RegExp(`^[0-9a-f]{${n}}$`);
/** Shape check (AUDIT F-14/F-07): canonical lowercase hex, integer fields, string-only tags, bounded size. */
export function wellFormed(e: any): boolean {
  if (!e || typeof e !== 'object') return false;
  if (!HEX(64).test(e.id) || !HEX(64).test(e.pubkey) || !HEX(128).test(e.sig)) return false;
  if (!Number.isSafeInteger(e.created_at) || e.created_at < 0 || !Number.isSafeInteger(e.kind) || e.kind < 0 || e.kind > 65535) return false;
  if (typeof e.content !== 'string' || !Array.isArray(e.tags) || e.tags.length > LIMITS.maxTags) return false;
  for (const t of e.tags) if (!Array.isArray(t) || t.length < 1 || t.length > LIMITS.maxTagLen || !t.every((x: unknown) => typeof x === 'string')) return false;
  try { if (JSON.stringify(e).length > LIMITS.maxEventBytes) return false; } catch { return false; }
  return true;
}
export function verifyEvent(e: Event): boolean {
  try { if (!wellFormed(e)) return false; if (getEventHash(e) !== e.id) return false; return schnorr.verify(e.sig, e.id, e.pubkey); } catch { return false; }
}
/** AUDIT F-08: tags that must appear exactly once (no first-wins / last-wins ambiguity between implementations). */
export function uniqueTags(e: Event, names: string[]): string | null {
  for (const n of names) { const c = e.tags.filter(t => t[0] === n).length; if (c !== 1) return `${c === 0 ? 'missing' : 'duplicate'} tag "${n}"`; }
  return null;
}
export { getPublicKey };
// --- AUDIT residual risk 4 / F-21: a fresh buyer key per licence ---
// The request is signed by a one-off key derived from the buyer's main key, the offer and the request nonce, so two licences
// cannot be linked by key and the buyer stores nothing new (the nonce is inside the request). The buyer can later prove
// "this licence is mine" with a private link that BOTH keys sign; a link signed only by the main key would let anyone claim
// anyone's licence.
import { secp256k1 as _secp } from '@noble/curves/secp256k1';
import { hmac } from '@noble/hashes/hmac';
import { sha256 as _sha256 } from '@noble/hashes/sha256';
import { hexToBytes as _h2b, utf8ToBytes as _u8 } from '@noble/hashes/utils';
export function deriveLicenceKey(mainSk: Uint8Array, offerId: string, nonce: string): Uint8Array {
  for (let ctr = 0; ; ctr++) { const k = hmac(_sha256, mainSk, _u8(`MLL-LICENCE-KEY/v1/${offerId}/${nonce}/${ctr}`));
    if (_secp.utils.isValidPrivateKey(k)) return k; }
}
export const linkMessage = (mainPub: string, licencePub: string, requestId: string) => _sha256(_u8(`MLL-LINK/v1:${mainPub}:${licencePub}:${requestId}`));
/** Private holder link: main key signs a Nostr-shaped event; the licence key's BIP-340 signature is a tag inside it. Do not publish. */
export function makeLink(mainSk: Uint8Array, licenceSk: Uint8Array, request: Event) {
  const mainPub = getPublicKey(mainSk), licPub = getPublicKey(licenceSk);
  if (licPub !== request.pubkey) throw new Error('licence key did not sign this request');
  const lsig = bytesToHex(schnorr.sign(linkMessage(mainPub, licPub, request.id), licenceSk));
  return sign(mainSk, KIND.LINK, [['p', licPub], ['e', request.id], ['licence-sig', lsig]]);
}
export function checkLink(link: Event, request: Event): string | null {
  if (link.kind !== KIND.LINK || !verifyEvent(link)) return 'link is not validly signed';
  if (uniqueTags(link, ['p', 'e', 'licence-sig'])) return 'link tags malformed';
  if (tagv(link, 'p') !== request.pubkey || tagv(link, 'e') !== request.id) return 'link names a different licence key or request';
  try { if (!schnorr.verify(tagv(link, 'licence-sig')!, linkMessage(link.pubkey, request.pubkey, request.id), request.pubkey)) return 'licence key did not co-sign the link'; } catch { return 'licence key did not co-sign the link'; }
  return null;
}
/** Derive + sign in one go: returns the request (signed by the fresh key) and the private link. */
export function makePrivateRequest(mainSk: Uint8Array, r: RequestInput) {
  const nonce = r.nonce ?? bytesToHex(randomBytes(32)); const lk = deriveLicenceKey(mainSk, r.offer.id, nonce);
  const request = makeRequest(lk, { ...r, nonce }); return { request, link: makeLink(mainSk, lk, request), licenceKey: lk };
}
