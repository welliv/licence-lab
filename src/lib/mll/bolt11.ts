// Strict BOLT 11 decoder written from scratch: recovers the signing key, rejects duplicates.
import { bech32 } from '@scure/base';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256, bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from './util.js';

export interface Invoice { currency: string; amountMsat: bigint | null; timestamp: number; expiry: number;
  paymentHash: string; descriptionHash?: string; description?: string; payee: string; paymentSecret?: string; raw: string; }

const MULT: Record<string, bigint> = { m: 100_000_000n, u: 100_000n, n: 100n, p: 0n };
function wordsToBytesPadded(words: number[]): Uint8Array {
  let acc = 0, bits = 0; const out: number[] = [];
  for (const w of words) { acc = (acc << 5) | w; bits += 5; while (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xff); } acc &= (1 << bits) - 1; }
  if (bits > 0) out.push((acc << (8 - bits)) & 0xff);
  return Uint8Array.from(out);
}
const wordsToInt = (w: number[]) => w.reduce((a, x) => a * 32 + x, 0);
function wordsToBytesExact(words: number[]): Uint8Array { return bech32.fromWords(words); }

export function decodeInvoice(raw: string): Invoice {
  const s = raw.trim();
  if (s !== s.toLowerCase()) throw new Error('bolt11: must be lowercase');
  const { prefix, words } = bech32.decode(s as `${string}1${string}`, 100_000);
  const m = /^ln(bcrt|tbs|tb|bc|sb)(\d+)?([munp])?$/.exec(prefix);
  if (!m) throw new Error('bolt11: bad prefix ' + prefix);
  const currency = m[1];
  let amountMsat: bigint | null = null;
  if (m[2]) {
    if (m[2].length > 1 && m[2][0] === '0') throw new Error('bolt11: leading zero amount');
    const n = BigInt(m[2]);
    if (!m[3]) amountMsat = n * 100_000_000_000n;
    else if (m[3] === 'p') { if (n % 10n !== 0n) throw new Error('bolt11: sub-msat amount'); amountMsat = n / 10n; }
    else amountMsat = n * MULT[m[3]];
  } else if (m[3]) throw new Error('bolt11: multiplier without amount');
  if (words.length < 7 + 104) throw new Error('bolt11: too short');
  const sigWords = words.slice(-104), dataWords = words.slice(0, -104);
  const timestamp = wordsToInt(dataWords.slice(0, 7));
  const inv: Partial<Invoice> = { currency, amountMsat, timestamp, expiry: 3600, raw: s };
  let pCount = 0, hCount = 0, dCount = 0, nKey: string | undefined;
  let i = 7;
  while (i < dataWords.length) {
    if (i + 3 > dataWords.length) throw new Error('bolt11: truncated tag');
    const type = dataWords[i], len = dataWords[i + 1] * 32 + dataWords[i + 2];
    const tw = dataWords.slice(i + 3, i + 3 + len);
    if (tw.length !== len) throw new Error('bolt11: truncated field');
    i += 3 + len;
    switch (type) {
      case 1: if (len !== 52) break; pCount++; inv.paymentHash = bytesToHex(wordsToBytesExact(tw)); break;
      case 23: if (len !== 52) break; hCount++; inv.descriptionHash = bytesToHex(wordsToBytesExact(tw)); break;
      case 13: dCount++; inv.description = new TextDecoder('utf-8', { fatal: true }).decode(wordsToBytesExact(tw)); break;
      case 6: inv.expiry = wordsToInt(tw); break;
      case 19: if (len !== 53) break; nKey = bytesToHex(wordsToBytesExact(tw)); break;
      case 16: if (len === 52) inv.paymentSecret = bytesToHex(wordsToBytesExact(tw)); break;
      default: break; // unknown / routing fields ignored
    }
  }
  if (pCount !== 1) throw new Error('bolt11: need exactly one payment hash');
  if (hCount > 1 || dCount > 1) throw new Error('bolt11: duplicate description fields');
  const sig = wordsToBytesExact(sigWords);
  const msg = sha256(concatBytes(utf8ToBytes(prefix), wordsToBytesPadded(dataWords)));
  const rec = sig[64]; if (rec > 3) throw new Error('bolt11: bad recovery id');
  const sigObj = secp256k1.Signature.fromCompact(sig.slice(0, 64));
  if (sigObj.hasHighS()) throw new Error('bolt11: high-S signature');
  const pub = sigObj.addRecoveryBit(rec).recoverPublicKey(msg).toHex(true);
  if (nKey && nKey !== pub) throw new Error('bolt11: n field does not match signature');
  if (nKey && !secp256k1.verify(sigObj.toCompactRawBytes(), msg, hexToBytes(nKey))) throw new Error('bolt11: bad signature');
  inv.payee = pub;
  return inv as Invoice;
}

/** Minimal encoder, used by tests to forge invoices signed by arbitrary keys. */
export function encodeInvoice(o: { currency: string; amountMsat: bigint; timestamp: number; expiry: number; paymentHash: string;
  descriptionHash?: string; description?: string; paymentSecret?: string }, priv: Uint8Array): string {
  const hex = (h: string) => Uint8Array.from(h.match(/../g)!.map(x => parseInt(x, 16)));
  const intWords = (n: number, len?: number) => { const w: number[] = []; do { w.unshift(n % 32); n = Math.floor(n / 32); } while (n > 0); while (len && w.length < len) w.unshift(0); return w; };
  const tag = (t: number, w: number[]) => [t, ...intWords(w.length, 2), ...w];
  let amt = o.amountMsat * 10n, unit = 'p';
  for (const [u, d] of [['m', 1_000_000_000n], ['u', 1_000_000n], ['n', 1_000n]] as const) if (amt % d === 0n) { amt = amt / d; unit = u; break; }
  const prefix = `ln${o.currency}${amt}${unit}`;
  const words = [...intWords(o.timestamp, 7), ...tag(1, bech32.toWords(hex(o.paymentHash)))];
  if (o.paymentSecret) words.push(...tag(16, bech32.toWords(hex(o.paymentSecret))));
  if (o.descriptionHash) words.push(...tag(23, bech32.toWords(hex(o.descriptionHash))));
  if (o.description !== undefined) words.push(...tag(13, bech32.toWords(utf8ToBytes(o.description))));
  words.push(...tag(6, intWords(o.expiry)));
  const msg = sha256(concatBytes(utf8ToBytes(prefix), wordsToBytesPadded(words)));
  const s = secp256k1.sign(msg, priv);
  const sig = new Uint8Array(65); sig.set(s.toCompactRawBytes()); sig[64] = s.recovery;
  return bech32.encode(prefix, [...words, ...bech32.toWords(sig)], 100_000);
}
