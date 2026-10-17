// Rights transfer, succession and key rotation (Licence Lab extension; NOT in mll-audit b268e79).
// Draft spec: /workspace/submission/nip-draft/NIP-XX-music-licence.md, section "Rights transfer (draft)".
//
// A work is named by its master hash `x` (or "*" = every work of the signing key, used for key rotation).
// The chain of title starts at a key the verifier already trusts as the original owner (from vouching, S1),
// and moves only by ANCHORED transfer records. The first valid anchored record wins; later ones from the
// same holder are void (double sale), and a key that has handed its rights on can no longer sell them.
import { finalizeEvent, type Event } from 'nostr-tools/pure';
import { verifyEvent, uniqueTags, tag, tagv, tagsOf } from './events.js';
import { decodeInvoice } from './bolt11.js';
import { verifyOts } from './ots.js';
import { verifyLicence, type LicenceBundle, type Result } from './verify.js';
import type { Anchor, ChainOracle } from './chain.js';
import { bytesToHex, utf8ToBytes, sha256hex, jcs } from './util.js';

export const RIGHTS_KIND = { TRANSFER: 3417, SUCCESSION: 3418, COSIGN: 3419, VOUCH: 1985 } as const;
/** OP_RETURN timestamp of a title record: "MLT1" || title digest (36 bytes, fits every relay policy).
 *  The digest commits to the record AND the co-signatures collected so far, so a co-signature cannot be added after the date. */
export const MLT1 = bytesToHex(utf8ToBytes('MLT1'));
export type TransferReason = 'sale' | 'rotation' | 'succession' | 'court';
export interface Anchored { event: Event; anchor?: Anchor; /** ids of the co-signatures committed by this timestamp */ cosigns?: string[] }
export interface TitleRecords { transfers: Anchored[]; plans?: Anchored[]; cosigns?: Event[]; vouches?: Event[] }
export interface TitleOpts { origin: string; trust?: string[] }
export interface TitleStep { id: string; from: string; to: string; reason: string; height: number | null; ok: boolean; why?: string; signers?: string[]; limit?: boolean }
export interface Title { ok: boolean; code?: string; reason?: string; holder: string; steps: TitleStep[]; via?: TitleStep; limit?: string }

const now = () => Math.floor(Date.now() / 1000);
const sign = (sk: Uint8Array, kind: number, tags: string[][], content = '') => finalizeEvent({ kind, tags, content, created_at: now() }, sk);

export interface TransferInput { x: string; from: string; to: string; reason: TransferReason; plan?: string; coOwners?: { pubkey: string; role: string; bps: number }[]; note?: string; court?: string }
/** Signed by the current holder (sale, rotation), by one plan key (succession), or by an estate key (court). */
export function makeTransfer(sk: Uint8Array, t: TransferInput) {
  return sign(sk, RIGHTS_KIND.TRANSFER, [['x', t.x], ['from', t.from], ['to', t.to], ['reason', t.reason], ...(t.plan ? [['plan', t.plan]] : []), ...(t.court ? [['court', t.court]] : []),
    ...(t.coOwners ?? []).map(c => ['p', c.pubkey, c.role, String(c.bps)])], t.note ?? '');
}
export interface PlanInput { x: string; keys: { pubkey: string; role: string }[]; threshold: number; ownerNeeds?: number; note?: string }
/** Succession / recovery plan, signed by the owner while alive and well. `ownerNeeds` = plan keys that must co-sign any transfer the owner signs alone (a stolen key cannot sell). */
export function makeSuccessionPlan(sk: Uint8Array, p: PlanInput) {
  return sign(sk, RIGHTS_KIND.SUCCESSION, [['x', p.x], ['threshold', String(p.threshold)], ['owner-needs', String(p.ownerNeeds ?? 0)], ...p.keys.map(k => ['p', k.pubkey, k.role])], p.note ?? '');
}
/** Co-signature on a transfer: a co-owner agreeing, or a plan key joining a takeover. */
export function makeCosign(sk: Uint8Array, transfer: Event, role: 'co-owner' | 'plan-key') { return sign(sk, RIGHTS_KIND.COSIGN, [['e', transfer.id], ['role', role]]); }
/** A voucher (e.g. a court registry) states a transfer follows a court order. The protocol cannot judge this; a verifier decides whom to trust. */
export function makeCourtVouch(sk: Uint8Array, transfer: Event, ref: string) { return sign(sk, RIGHTS_KIND.VOUCH, [['L', 'mll.title'], ['l', 'court-order', 'mll.title'], ['e', transfer.id], ['ref', ref]], `Court order ${ref}: the transfer ${transfer.id.slice(0, 12)}… follows it.`); }
export const titleDigest = (recordId: string, cosignIds: string[] = []) => sha256hex(jcs({ record: recordId, cosigns: [...cosignIds].sort() }));
export const titlePayload = (digest: string) => MLT1 + digest;

async function anchorHeight(a: Anchor | undefined, id: string, chain: ChainOracle): Promise<number | null> {
  if (!a) return null;
  if (a.type === 'ots') { if (!chain.merkleRootAtHeight) return null; const o = await verifyOts(a.ots ?? '', id, { merkleRootAtHeight: h => chain.merkleRootAtHeight!(h) }); return o.status === 'confirmed' ? o.height! : null; }
  return a.txid && a.blockhash ? chain.opReturnHeight(a.txid, a.blockhash, titlePayload(id)) : null;
}
const HEX64 = /^[0-9a-f]{64}$/;
function wellTransfer(e: Event): string | null {
  if (e.kind !== RIGHTS_KIND.TRANSFER || !verifyEvent(e)) return 'transfer is not validly signed';
  const d = uniqueTags(e, ['x', 'from', 'to', 'reason']); if (d) return d;
  if (!HEX64.test(tagv(e, 'from')!) || !HEX64.test(tagv(e, 'to')!) || tagv(e, 'from') === tagv(e, 'to')) return 'from/to keys malformed or equal';
  if (!['sale', 'rotation', 'succession', 'court'].includes(tagv(e, 'reason')!)) return 'unknown reason';
  return null;
}
const cosignersOf = (recs: TitleRecords, t: Event, role: string, committed: string[]) => new Set((recs.cosigns ?? []).filter(c => committed.includes(c.id) && c.kind === RIGHTS_KIND.COSIGN && verifyEvent(c) && tagv(c, 'e') === t.id && tagv(c, 'role') === role).map(c => c.pubkey));

/** Walk the chain of title for work `x` from `opts.origin`, then say whether `key` held the rights at block `height`. */
export async function checkTitle(x: string, key: string, height: number, chain: ChainOracle, recs: TitleRecords, opts: TitleOpts & { invoiceTime?: number }): Promise<Title> {
  const plans = new Map<string, { e: Event; h: number }>();
  for (const p of recs.plans ?? []) { const e = p.event; if (e.kind !== RIGHTS_KIND.SUCCESSION || !verifyEvent(e) || uniqueTags(e, ['x', 'threshold', 'owner-needs'])) continue; const h = await anchorHeight(p.anchor, titleDigest(e.id), chain); if (h !== null && (!plans.has(e.id) || plans.get(e.id)!.h > h)) plans.set(e.id, { e, h }); }
  const planFor = (owner: string, before: number) => [...plans.values()].filter(p => p.e.pubkey === owner && (tagv(p.e, 'x') === x || tagv(p.e, 'x') === '*') && p.h < before).sort((a, b) => b.h - a.h)[0];
  const cand: { e: Event; h: number | null; i: number; co: string[] }[] = [];
  let i = 0; for (const t of recs.transfers) { const sx = tagv(t.event, 'x'); if (sx !== x && sx !== '*') continue; const co = t.cosigns ?? []; cand.push({ e: t.event, h: await anchorHeight(t.anchor, titleDigest(t.event.id, co), chain), i: i++, co }); }
  cand.sort((a, b) => (a.h ?? Infinity) - (b.h ?? Infinity) || a.i - b.i);
  let holder = opts.origin; const past = new Set<string>(); const steps: TitleStep[] = [];
  for (const { e, h, co } of cand) {
    const cosigners = (r: TitleRecords, t: Event, role: string) => cosignersOf(r, t, role, co);
    const st: TitleStep = { id: e.id, from: tagv(e, 'from') ?? '', to: tagv(e, 'to') ?? '', reason: tagv(e, 'reason') ?? '', height: h, ok: false }; steps.push(st);
    const bad = wellTransfer(e); if (bad) { st.why = bad; continue; }
    if (h === null) { st.why = 'not timestamped on Bitcoin, so it moves nothing yet'; continue; }
    if (steps.some(x => x.ok && x.id === e.id)) { st.why = 'same record timestamped again (ignored)'; continue; }
    if (st.from !== holder) { st.why = past.has(st.from) ? `this key had already handed the rights on: a double sale, or a stolen old key` : 'the signer does not hold these rights'; continue; }
    const plan = planFor(holder, h); const reason = st.reason as TransferReason;
    if (reason === 'sale' || reason === 'rotation') {
      if (e.pubkey !== st.from) { st.why = 'a sale or key change must be signed by the holder'; continue; }
      const need = plan ? Number(tagv(plan.e, 'owner-needs')) : 0;
      if (need > 0) { const keys = new Set(tagsOf(plan.e, 'p').map(p => p[1])); const got = [...cosigners(recs, e, 'plan-key')].filter(k => keys.has(k));
        if (got.length < need) { st.why = `the owner's recovery plan needs ${need} plan key${need > 1 ? 's' : ''} to co-sign; got ${got.length}`; continue; } st.signers = [e.pubkey, ...got]; }
    } else if (reason === 'succession') {
      const p = plans.get(tagv(e, 'plan') ?? ''); if (!p || p.e.pubkey !== st.from || !(tagv(p.e, 'x') === x || tagv(p.e, 'x') === '*')) { st.why = 'no succession plan by the holder covers this'; continue; }
      if (p.h >= h) { st.why = 'the plan was not on Bitcoin before the takeover'; continue; }
      const keys = new Set(tagsOf(p.e, 'p').map(k => k[1])); const th = Number(tagv(p.e, 'threshold'));
      const signers = [...new Set([e.pubkey, ...cosigners(recs, e, 'plan-key')])].filter(k => keys.has(k));
      if (!/^[1-9]$/.test(tagv(p.e, 'threshold')!) || signers.length < th) { st.why = `the plan needs ${th} of ${keys.size} named keys; ${signers.length} signed`; continue; } st.signers = signers;
    } else if (reason === 'court') {
      const v = (recs.vouches ?? []).find(v => v.kind === RIGHTS_KIND.VOUCH && verifyEvent(v) && tagv(v, 'e') === e.id && (opts.trust ?? []).includes(v.pubkey));
      if (!v) { st.why = 'no plan exists, so the protocol cannot decide; a court must, and this verifier trusts no voucher for it'; st.limit = true; continue; }
      st.limit = true; st.signers = [e.pubkey, v.pubkey];
    }
    if (reason === 'sale' || reason === 'court') { const co = tagsOf(e, 'p'); const got = cosigners(recs, e, 'co-owner'); const miss = co.filter(p => !got.has(p[1]));
      if (miss.length) { st.why = `co-owner ${miss[0][2] ?? ''} ${miss[0][1].slice(0, 8)}… has not co-signed`; continue; } }
    st.ok = true; past.add(holder); holder = st.to;
  }
  // Who held the rights at `height`? Transfers mined at or before the licence's block count (same rule as revocations).
  let at = opts.origin; let via: TitleStep | undefined; const lost: TitleStep[] = [];
  for (const s of steps) if (s.ok && s.height! <= height) { lost.push(s); at = s.to; via = s; }
  if (at === key) return { ok: true, holder: at, steps, via, limit: via?.limit ? 'This ownership rests on a court order voucher the verifier chose to trust.' : undefined };
  const gave = lost.find(s => s.from === key);
  if (gave) { // AUDIT F-04 style grace: an invoice dated well before the transfer block stays valid (not for key rotation: a thief could backdate)
    if (gave.reason !== 'rotation' && opts.invoiceTime !== undefined && chain.blockTime) { const t = await chain.blockTime(gave.height!); if (t !== null && opts.invoiceTime < t - 7200 && heldBefore(steps, opts.origin, key, gave)) return { ok: true, holder: at, steps, via: gave }; }
    return { ok: false, code: gave.reason === 'rotation' ? 'rights_key_retired' : 'rights_transferred', reason: gave.reason === 'rotation' ? `this key was retired at block ${gave.height}; the owner moved to a new key` : `these rights were handed on at block ${gave.height}, before this licence`, holder: at, steps };
  }
  const voidTo = steps.find(s => !s.ok && s.to === key && s.why);
  return { ok: false, code: 'rights_not_holder', reason: steps.some(s => s.ok && s.to === key) ? 'this key did not yet hold the rights when the licence was made' : voidTo ? `the transfer to this key does not count: ${voidTo.why}` : 'this key never held the rights to this track', holder: at, steps };
}
const heldBefore = (steps: TitleStep[], origin: string, key: string, gave: TitleStep) => { let h = origin; for (const s of steps) { if (s === gave) return h === key; if (s.ok) h = s.to; } return false; };

/** verifyLicence plus the chain of title (folded into check 9: "no revocation or transfer cancels it"). */
export async function verifyLicenceWithTitle(b: LicenceBundle, chain?: ChainOracle, opts: { link?: Event; requireAnchor?: boolean; title?: TitleRecords & TitleOpts } = {}): Promise<Result & { title?: Title }> {
  const r = await verifyLicence(b, chain, opts); if (!r.ok || !opts.title || !chain || r.anchoredHeight === undefined) return r;
  let invoiceTime: number | undefined; try { invoiceTime = decodeInvoice(b.invoice).timestamp; } catch {}
  const t = await checkTitle(tagv(b.offer, 'x')!, b.offer.pubkey, r.anchoredHeight, chain, opts.title, { ...opts.title, invoiceTime });
  if (!t.ok) return { ...r, ok: false, code: t.code, reason: t.reason, checks: r.checks.filter(c => !c.startsWith('9')), title: t };
  return { ...r, checks: [...r.checks, '9b chain of title'], title: t };
}
export { tag };
