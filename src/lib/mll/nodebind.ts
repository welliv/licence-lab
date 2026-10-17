// V2 A18: bind an artist key to a Lightning node the artist alone controls, over NWC (NIP-47 `sign_message`).
// Check 3 needs the node to sign "MLL-BIND:<artist pubkey>". On a shared or custodial node anyone else on that node could also make
// invoices "from" it, so a binding to a shared node proves nothing about who was paid. A per-user node (one node per artist) is required.
// Wallets that run a per-user node and answer `sign_message` with the node key can bind with no extra tooling. See docs/05-v2.md.
import { getPublicKey } from 'nostr-tools/pure';
import { makeBinding, bindMessage, nextKeyHash, type Event } from './events.js';
import { recoverLnMessage } from './lnmsg.js';
export interface NwcLike { call(method: string, params: Record<string, unknown>, timeoutMs?: number): Promise<any> }
const unwrap = (r: any) => { if (r?.error) throw Object.assign(new Error(r.error.message ?? 'wallet error'), { code: r.error.code ?? 'WALLET' }); return r?.result ?? r; };
/** Ask the wallet for its node key and a node signature over the binding message, check the signature, and sign the binding. */
export async function bindingViaNwc(nwc: NwcLike, artistSk: Uint8Array, o: { scope?: string[]; notBefore?: string; nextPub?: string } = {}): Promise<{ binding: Event; node: string }> {
  const info = unwrap(await nwc.call('get_info', {}));
  if (Array.isArray(info.methods) && !info.methods.includes('sign_message')) throw Object.assign(new Error('this wallet does not offer sign_message over NWC, so it cannot co-sign a binding'), { code: 'NO_SIGN_MESSAGE' });
  const node = String(info.pubkey ?? ''); if (!/^0[23][0-9a-f]{64}$/.test(node)) throw Object.assign(new Error('the wallet did not report a node public key'), { code: 'NO_NODE_KEY' });
  const msg = bindMessage(getPublicKey(artistSk)); const sig = unwrap(await nwc.call('sign_message', { message: msg })).signature as string;
  let rec = ''; try { rec = recoverLnMessage(msg, sig); } catch { /* falls through */ }
  if (rec !== node) throw Object.assign(new Error('the signature was not made by the node the wallet reported (a shared or proxied node?)'), { code: 'NODE_SIG_MISMATCH' });
  return { node, binding: makeBinding(artistSk, node, sig, o.scope ?? ['*'], o.notBefore, { method: 'nwc-sign_message', next: o.nextPub ? nextKeyHash(o.nextPub) : undefined }) };
}
