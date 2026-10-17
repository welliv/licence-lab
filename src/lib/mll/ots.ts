// OpenTimestamps proof parsing and verification (AUDIT F-18). Written from the python-opentimestamps format.
// A proof is: magic | version | file-hash op | digest | timestamp tree. Each tree node applies ops to the running message
// and ends in attestations. A Bitcoin attestation at height h is valid iff the message equals block h's merkle root
// (internal byte order). Pending (calendar) attestations are promises, not proofs.
import { sha256 } from '@noble/hashes/sha256';
import { sha1 } from '@noble/hashes/sha1';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes, concatBytes, utf8ToBytes } from '@noble/hashes/utils';
export const OTS_MAGIC = hexToBytes('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294');
export const ATT = { bitcoin: '0588960d73d71901', pending: '83dfe30d2ef90c8e', litecoin: '06869a0d73d71b45' } as const;
const MAX_MSG = 4096, MAX_DEPTH = 256, MAX_NODES = 10_000;
export type Op = { tag: number; arg?: Uint8Array };
export interface Attestation { kind: 'bitcoin' | 'pending' | 'unknown'; height?: number; url?: string; tag: string; msg: Uint8Array; payload: Uint8Array }
export interface Node { msg: Uint8Array; attestations: Attestation[]; ops: { op: Op; next: Node }[] }
export interface OtsFile { hashOp: number; digest: Uint8Array; tree: Node }
export class R { i = 0; nodes = 0; constructor(public b: Uint8Array) {}
  byte() { if (this.i >= this.b.length) throw new Error('ots: truncated'); return this.b[this.i++]; }
  bytes(n: number) { if (this.i + n > this.b.length) throw new Error('ots: truncated'); const o = this.b.slice(this.i, this.i + n); this.i += n; return o; }
  varuint() { let v = 0, s = 0; for (;;) { const b = this.byte(); v += (b & 0x7f) * 2 ** s; if (!(b & 0x80)) break; s += 7; if (s > 49) throw new Error('ots: varuint too long'); } return v; }
  varbytes(max: number) { const n = this.varuint(); if (n > max) throw new Error('ots: varbytes too long'); return this.bytes(n); } }
const UNARY: Record<number, (m: Uint8Array) => Uint8Array> = { 0x02: sha1, 0x03: ripemd160, 0x08: sha256, 0x67: keccak_256,
  0xf2: m => m.slice().reverse(), 0xf3: m => utf8ToBytes(bytesToHex(m)) };
export function applyOp(op: Op, m: Uint8Array): Uint8Array {
  let out: Uint8Array;
  if (op.tag === 0xf0) out = concatBytes(m, op.arg!); else if (op.tag === 0xf1) out = concatBytes(op.arg!, m);
  else if (UNARY[op.tag]) out = UNARY[op.tag](m); else throw new Error(`ots: unknown op 0x${op.tag.toString(16)}`);
  if (out.length > MAX_MSG) throw new Error('ots: message too long'); return out;
}
export function readTree(r: R, msg: Uint8Array, depth: number): Node {
  if (depth > MAX_DEPTH || ++r.nodes > MAX_NODES) throw new Error('ots: tree too deep or too large');
  const n: Node = { msg, attestations: [], ops: [] };
  const one = (tag: number) => {
    if (tag === 0x00) { const t = bytesToHex(r.bytes(8)); const raw = r.varbytes(8192); const p = new R(raw); let a: Attestation;
      if (t === ATT.bitcoin) a = { kind: 'bitcoin', height: p.varuint(), tag: t, msg, payload: raw };
      else if (t === ATT.pending) { const u = new TextDecoder('utf-8', { fatal: true }).decode(p.varbytes(1000)); if (!/^[A-Za-z0-9.:/_-]+$/.test(u)) throw new Error('ots: bad calendar url'); a = { kind: 'pending', url: u, tag: t, msg, payload: raw }; }
      else a = { kind: 'unknown', tag: t, msg, payload: raw };
      n.attestations.push(a); return; }
    const op: Op = { tag }; if (tag === 0xf0 || tag === 0xf1) { op.arg = r.varbytes(MAX_MSG); if (!op.arg.length) throw new Error('ots: empty append/prepend'); }
    n.ops.push({ op, next: readTree(r, applyOp(op, msg), depth + 1) });
  };
  let tag = r.byte(); while (tag === 0xff) { one(r.byte()); tag = r.byte(); } one(tag); return n;
}
export function parseOts(bytes: Uint8Array): OtsFile {
  const r = new R(bytes); const m = r.bytes(OTS_MAGIC.length); if (bytesToHex(m) !== bytesToHex(OTS_MAGIC)) throw new Error('ots: bad magic');
  if (r.varuint() !== 1) throw new Error('ots: unsupported version'); const hashOp = r.byte(); const len = ({ 0x08: 32, 0x02: 20, 0x03: 20, 0x67: 32 } as any)[hashOp];
  if (!len) throw new Error('ots: bad file hash op'); const digest = r.bytes(len); const tree = readTree(r, digest, 0);
  if (r.i !== bytes.length) throw new Error('ots: trailing bytes'); return { hashOp, digest, tree };
}
export function attestations(n: Node, out: Attestation[] = []): Attestation[] { out.push(...n.attestations); for (const c of n.ops) attestations(c.next, out); return out; }
// --- writer (for stamping/upgrading and test vectors) ---
const vu = (n: number) => { const o: number[] = []; do { let b = n & 0x7f; n = Math.floor(n / 128); if (n) b |= 0x80; o.push(b); } while (n); return Uint8Array.from(o); };
const vb = (b: Uint8Array) => concatBytes(vu(b.length), b);
function writeAtt(a: { kind: 'bitcoin'; height: number } | { kind: 'pending'; url: string }) {
  return concatBytes(Uint8Array.of(0), hexToBytes(a.kind === 'bitcoin' ? ATT.bitcoin : ATT.pending), vb(a.kind === 'bitcoin' ? vu(a.height) : vb(utf8ToBytes(a.url))));
}
export type Spec = { ops: Op[]; att: { kind: 'bitcoin'; height: number } | { kind: 'pending'; url: string } }[];
/** Serialise a list of independent paths from the digest (each a linear op list ending in one attestation). */
export function writeOts(digest: Uint8Array, paths: Spec): Uint8Array {
  const path = (p: Spec[number]) => concatBytes(...p.ops.map(o => concatBytes(Uint8Array.of(o.tag), o.arg ? vb(o.arg) : new Uint8Array())), writeAtt(p.att));
  const body = paths.map((p, i) => i < paths.length - 1 ? concatBytes(Uint8Array.of(0xff), path(p)) : path(p));
  return concatBytes(OTS_MAGIC, vu(1), Uint8Array.of(0x08), digest, ...body);
}
export interface OtsHeaderOracle { merkleRootAtHeight(h: number): Promise<string | null> /* RPC (display) hex */ }
export interface OtsResult { status: 'confirmed' | 'pending' | 'invalid'; height?: number; reason?: string; pending?: string[]; bad?: string[] }
/** Verify a proof for `digestHex`. Confirmed = at least one Bitcoin attestation matches the block's merkle root; height = earliest such. */
export async function verifyOts(otsHex: string, digestHex: string, chain: OtsHeaderOracle): Promise<OtsResult> {
  let f: OtsFile; try { if (!/^([0-9a-f]{2})+$/.test(otsHex)) throw new Error('ots: not hex'); f = parseOts(hexToBytes(otsHex)); } catch (e: any) { return { status: 'invalid', reason: e.message }; }
  if (f.hashOp !== 0x08 || bytesToHex(f.digest) !== digestHex) return { status: 'invalid', reason: 'proof is for a different digest' };
  const atts = attestations(f.tree); let best: number | undefined; const bad: string[] = [], pending: string[] = [];
  for (const a of atts) {
    if (a.kind === 'pending') { pending.push(a.url!); continue; } if (a.kind !== 'bitcoin') continue;
    if (a.msg.length !== 32) { bad.push(`height ${a.height}: message is not 32 bytes`); continue; }
    const root = await chain.merkleRootAtHeight(a.height!);
    if (root && bytesToHex(hexToBytes(root).reverse()) === bytesToHex(a.msg)) { if (best === undefined || a.height! < best) best = a.height; }
    else bad.push(`height ${a.height}: ${root ? 'merkle root mismatch' : 'block not in best chain'}`);
  }
  if (best !== undefined) return { status: 'confirmed', height: best, pending, bad };
  if (bad.length) return { status: 'invalid', reason: 'no Bitcoin attestation matches the chain: ' + bad.join('; '), bad, pending };
  if (pending.length) return { status: 'pending', pending, reason: 'only calendar (pending) attestations' };
  return { status: 'invalid', reason: 'no attestations' };
}

/** Serialise a timestamp tree (python-opentimestamps order: attestations first, then ops; 0xff before all but the last item). */
export function serializeTree(n: Node): Uint8Array {
  const items: Uint8Array[] = [...n.attestations.map(a => concatBytes(Uint8Array.of(0), hexToBytes(a.tag), vb(a.payload))),
    ...n.ops.map(({ op, next }) => concatBytes(Uint8Array.of(op.tag), op.arg ? vb(op.arg) : new Uint8Array(), serializeTree(next)))];
  if (!items.length) throw new Error('ots: empty node');
  return concatBytes(...items.map((x, i) => i < items.length - 1 ? concatBytes(Uint8Array.of(0xff), x) : x));
}
export const serializeOts = (f: OtsFile) => concatBytes(OTS_MAGIC, vu(1), Uint8Array.of(f.hashOp), f.digest, serializeTree(f.tree));
/** Parse a bare timestamp (as returned by a calendar) that starts from `msg`. */
export function parseTimestamp(bytes: Uint8Array, msg: Uint8Array): Node { const r = new R(bytes); const n = readTree(r, msg, 0); if (r.i !== bytes.length) throw new Error('ots: trailing bytes'); return n; }
/** Build a fresh proof for digest D from a calendar's /digest reply, with a client nonce (like the reference client). */
export function proofFromCalendarReply(D: Uint8Array, nonce: Uint8Array, reply: Uint8Array): OtsFile {
  const op1: Op = { tag: 0xf0, arg: nonce }, op2: Op = { tag: 0x08 }; const m1 = applyOp(op1, D), m2 = applyOp(op2, m1);
  const tree: Node = { msg: D, attestations: [], ops: [{ op: op1, next: { msg: m1, attestations: [], ops: [{ op: op2, next: parseTimestamp(reply, m2) }] } }] };
  return { hashOp: 0x08, digest: D, tree };
}
/** Replace each pending attestation with what `fetchUpgrade(url, msg)` returns (a timestamp starting at msg), if anything. */
export async function upgradeOts(f: OtsFile, fetchUpgrade: (url: string, msg: Uint8Array) => Promise<Uint8Array | null>): Promise<{ file: OtsFile; upgraded: number }> {
  let upgraded = 0;
  const walk = async (n: Node) => {
    for (const a of [...n.attestations]) if (a.kind === 'pending') { const b = await fetchUpgrade(a.url!, n.msg); if (!b) continue;
      const sub = parseTimestamp(b, n.msg); n.attestations = n.attestations.filter(x => x !== a); n.attestations.push(...sub.attestations); n.ops.push(...sub.ops); upgraded++; }
    for (const c of n.ops) await walk(c.next);
  };
  await walk(f.tree); return { file: f, upgraded };
}
