import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes } from '@noble/hashes/utils';
import canonicalizeMod from 'canonicalize';
const canonicalize: (o: unknown) => string | undefined = (canonicalizeMod as any).default ?? canonicalizeMod;
export { sha256, bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes };
/** RFC 8785 JSON Canonicalization. */
export function jcs(o: unknown): string { const s = canonicalize(o); if (s === undefined) throw new Error('jcs: unsupported value'); return s; }
export const sha256hex = (b: Uint8Array | string) => bytesToHex(sha256(typeof b === 'string' ? utf8ToBytes(b) : b));
export const isHex = (s: unknown, len?: number) => typeof s === 'string' && /^[0-9a-f]*$/.test(s) && s.length % 2 === 0 && (len === undefined || s.length === len);
export class VerifyError extends Error { constructor(public code: string, msg: string) { super(`${code}: ${msg}`); } }
