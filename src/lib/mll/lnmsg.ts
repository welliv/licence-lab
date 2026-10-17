// Verify LND/CLN "signmessage" signatures (zbase32, recoverable, double SHA-256 over prefixed message).
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256, utf8ToBytes } from './util.js';
const Z = 'ybndrfg8ejkmcpqxot1uwisza345h769';
export function zbase32Decode(s: string): Uint8Array {
  let acc = 0, bits = 0; const out: number[] = [];
  for (const c of s) { const v = Z.indexOf(c); if (v < 0) throw new Error('zbase32: bad char'); acc = (acc << 5) | v; bits += 5; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xff); acc &= (1 << bits) - 1; } }
  return Uint8Array.from(out);
}
export function zbase32Encode(b: Uint8Array): string {
  let acc = 0, bits = 0, out = '';
  for (const x of b) { acc = (acc << 8) | x; bits += 8; while (bits >= 5) { bits -= 5; out += Z[(acc >> bits) & 31]; } acc &= (1 << bits) - 1; }
  if (bits > 0) out += Z[(acc << (5 - bits)) & 31];
  return out;
}
const digest = (msg: string) => sha256(sha256(utf8ToBytes('Lightning Signed Message:' + msg)));
/** Returns the compressed pubkey hex that signed msg. */
export function recoverLnMessage(msg: string, zsig: string): string {
  const raw = zbase32Decode(zsig);
  if (raw.length < 65) throw new Error('lnmsg: short signature');
  const rec = raw[0] - 31; if (rec < 0 || rec > 3) throw new Error('lnmsg: bad header byte');
  return secp256k1.Signature.fromCompact(raw.slice(1, 65)).addRecoveryBit(rec).recoverPublicKey(digest(msg)).toHex(true);
}
/** Test helper: sign like LND does. */
export function signLnMessage(msg: string, priv: Uint8Array): string {
  const s = secp256k1.sign(digest(msg), priv);
  const out = new Uint8Array(65); out[0] = 31 + s.recovery; out.set(s.toCompactRawBytes(), 1);
  return zbase32Encode(out);
}
