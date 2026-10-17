// A small NIP-47 (Nostr Wallet Connect) client for browsers and Node. Our own code, written for Licence Lab.
// It accepts a response only if it is signed by the wallet key, refers to our request and has our method (the same rule as mll-audit F-05).
import { finalizeEvent, getPublicKey, verifyEvent } from 'nostr-tools/pure';
import * as nip44 from 'nostr-tools/nip44';
import * as nip04 from 'nostr-tools/nip04';
import { hexToBytes } from '@noble/hashes/utils';
export interface NwcUri { wallet: string; relays: string[]; secret: string; lud16?: string }
export function parseNwc(uri: string): NwcUri {
  const u = new URL(uri.trim().replace(/^nostr\+walletconnect:\/\//, 'http://'));
  const relays = u.searchParams.getAll('relay'); const secret = u.searchParams.get('secret');
  if (!/^[0-9a-f]{64}$/.test(u.hostname) || !relays.length || !secret || !/^[0-9a-f]{64}$/.test(secret)) throw new Error('not a valid NWC connection string');
  return { wallet: u.hostname, relays, secret, lud16: u.searchParams.get('lud16') ?? undefined };
}
export class NwcError extends Error { constructor(public code: string, msg: string) { super(msg); } }
export class Nwc {
  p: NwcUri; sk: Uint8Array; ws: WebSocket | null = null; pending = new Map<string, { method: string; res: (v: any) => void; rej: (e: any) => void; t: any }>(); enc: 'nip44_v2' | 'nip04' = 'nip44_v2'; ck: Uint8Array;
  constructor(public uri: string) { this.p = parseNwc(uri); this.sk = hexToBytes(this.p.secret); this.ck = nip44.v2.utils.getConversationKey(this.sk, this.p.wallet); }
  get clientPub() { return getPublicKey(this.sk); }
  async connect(timeoutMs = 10000) {
    if (this.ws && this.ws.readyState === 1) return;
    const ws = new WebSocket(this.p.relays[0]); this.ws = ws;
    await new Promise<void>((res, rej) => { const t = setTimeout(() => rej(new NwcError('RELAY', 'relay did not answer')), timeoutMs); ws.onopen = () => { clearTimeout(t); res(); }; ws.onerror = () => { clearTimeout(t); rej(new NwcError('RELAY', 'relay connection failed')); }; });
    ws.onmessage = m => this.onMessage(String(m.data));
    ws.send(JSON.stringify(['REQ', 'nwc', { kinds: [23195], authors: [this.p.wallet], '#p': [this.clientPub], since: Math.floor(Date.now() / 1000) - 10 }]));
  }
  private async onMessage(raw: string) {
    let m: any; try { m = JSON.parse(raw); } catch { return; } if (m[0] !== 'EVENT') return; const e = m[2];
    if (!e || e.kind !== 23195 || e.pubkey !== this.p.wallet || !verifyEvent(e)) return;
    const id = e.tags.find((t: string[]) => t[0] === 'e')?.[1]; const p = id && this.pending.get(id); if (!p) return;
    let body: any; try { body = JSON.parse(e.content.includes('?iv=') ? nip04.decrypt(this.sk, this.p.wallet, e.content) : nip44.v2.decrypt(e.content, this.ck)); } catch { return; }
    if (body.result_type && body.result_type !== p.method) return;
    this.pending.delete(id); clearTimeout(p.t);
    body.error ? p.rej(new NwcError(body.error.code ?? 'ERROR', body.error.message ?? 'wallet error')) : p.res(body.result);
  }
  async call<T = any>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30000): Promise<T> {
    await this.connect(); const content = JSON.stringify({ method, params });
    const ev = finalizeEvent({ kind: 23194, created_at: Math.floor(Date.now() / 1000), tags: [['p', this.p.wallet], ...(this.enc === 'nip44_v2' ? [['encryption', 'nip44_v2']] : [])], content: this.enc === 'nip44_v2' ? nip44.v2.encrypt(content, this.ck) : nip04.encrypt(this.sk, this.p.wallet, content) }, this.sk);
    return new Promise<T>((res, rej) => { const t = setTimeout(() => { this.pending.delete(ev.id); rej(new NwcError('TIMEOUT', `${method}: no answer from the wallet in ${timeoutMs / 1000} s`)); }, timeoutMs);
      this.pending.set(ev.id, { method, res, rej, t }); this.ws!.send(JSON.stringify(['EVENT', ev])); });
  }
  getInfo() { return this.call<{ alias?: string; pubkey?: string; network?: string; methods: string[]; block_height?: number }>('get_info'); }
  async balanceSat() { const r = await this.call<{ balance: number }>('get_balance'); return Math.floor(r.balance / 1000); }
  makeInvoice(amountSat: number, o: { description?: string; descriptionHash?: string; expiry?: number } = {}) { return this.call<{ invoice: string; payment_hash: string }>('make_invoice', { amount: amountSat * 1000, ...(o.description ? { description: o.description } : {}), ...(o.descriptionHash ? { description_hash: o.descriptionHash } : {}), expiry: o.expiry ?? 600 }); }
  payInvoice(invoice: string, timeoutMs = 45000) { return this.call<{ preimage: string; fees_paid?: number }>('pay_invoice', { invoice }, timeoutMs); }
  lookupInvoice(paymentHash: string) { return this.call<{ preimage?: string; settled_at?: number; state?: string; invoice?: string }>('lookup_invoice', { payment_hash: paymentHash }); }
  signMessage(message: string) { return this.call<{ message: string; signature: string }>('sign_message', { message }); }
  close() { this.ws?.close(); this.pending.forEach(p => clearTimeout(p.t)); this.pending.clear(); }
}
export const FAUCET = 'https://faucet.nwc.dev';
/** Create a dummy sub-wallet on the public NWC faucet (balances are not real and exist only inside the faucet). */
export async function faucetWallet(balanceSat: number): Promise<string> {
  const r = await fetch(`${FAUCET}?balance=${balanceSat}`, { method: 'POST', signal: AbortSignal.timeout(15000) }); const t = (await r.text()).trim();
  if (!r.ok || !t.startsWith('nostr+walletconnect://')) throw new Error(`faucet refused (HTTP ${r.status}): ${t.slice(0, 120)}`); return t;
}
export async function faucetTopUp(lud16: string, amountSat: number) { const user = lud16.split('@')[0];
  const r = await fetch(`${FAUCET}/wallets/${encodeURIComponent(user)}/topup?amount=${amountSat}`, { method: 'POST', signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(`top-up refused (HTTP ${r.status}): ${(await r.text()).slice(0, 120)}`); }
