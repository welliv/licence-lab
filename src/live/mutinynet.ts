// Read-only Mutinynet chain view over the public Esplora API (mutinynet.com/api). Implements the library's ChainOracle.
// Reading is real and needs no login. Writing (OP_RETURN, OpenTimestamps) needs test coins, and the Mutinynet faucet needs a GitHub login.
import type { ChainOracle } from '../lib/mll/chain';
export const MUTINYNET_API = 'https://mutinynet.com/api';
const get = async (p: string, json = true) => { const r = await fetch(MUTINYNET_API + p, { signal: AbortSignal.timeout(12000) }); if (!r.ok) throw new Error(`mutinynet.com ${p}: HTTP ${r.status}`); return json ? r.json() : (await r.text()).trim(); };
export class MutinynetChain implements ChainOracle {
  method = 'Mutinynet (public Esplora at mutinynet.com, read-only)';
  constructor(public maxScan = 300) {}
  async tip() { const height = Number(await get('/blocks/tip/height', false)); const hash = String(await get('/blocks/tip/hash', false)); return { height, hash }; }
  async heightOfBlockHash(hash: string) { try { const s = await get(`/block/${hash}/status`); if (!s.in_best_chain) return null; return s.height ?? (await get(`/block/${hash}`)).height; } catch { return null; } }
  async opReturnHeight(txid: string, blockhash: string, payloadHex: string) {
    const tx = await get(`/tx/${txid}`); if (!tx.status?.confirmed || tx.status.block_hash !== blockhash) return null;
    return tx.vout.some((o: any) => o.scriptpubkey_type === 'op_return' && o.scriptpubkey.includes(payloadHex)) ? tx.status.block_height : null; }
  /** Bounded scan (a browser cannot scan the whole chain): refuses ranges over maxScan blocks instead of pretending. */
  async scanOpReturns(prefixHex: string, maxHeight: number, minHeight = maxHeight) {
    if (maxHeight - minHeight > this.maxScan) throw Object.assign(new Error(`revocation scan over ${maxHeight - minHeight} blocks is too large for a browser; use an index or your own node`), { code: 'SCAN_TOO_LARGE' });
    const out: { payload: string; height: number; txid: string }[] = [];
    for (let h = minHeight; h <= maxHeight; h++) { const hash = await get(`/block-height/${h}`, false); let i = 0;
      for (;;) { const txs = await get(`/block/${hash}/txs/${i}`); for (const t of txs) for (const o of t.vout) if (o.scriptpubkey_type === 'op_return') { const data = String(o.scriptpubkey).replace(/^6a(4c..|4d....|..)/, ''); if (data.startsWith(prefixHex)) out.push({ payload: data, height: h, txid: t.txid }); } if (txs.length < 25) break; i += 25; } }
    return out; }
  async blockTime(h: number) { try { const hash = await get(`/block-height/${h}`, false); return (await get(`/block/${hash}`)).timestamp; } catch { return null; } }
  async merkleRootAtHeight(h: number) { try { const hash = await get(`/block-height/${h}`, false); return (await get(`/block/${hash}`)).merkle_root; } catch { return null; } }
}
export interface MutinynetStatus { checkedAt: string; faucetLogin: 'needs login' | 'ok'; token: boolean; localNode: string; otsd: string; opReturnBot: string; recorded: { kind: string; txid?: string; height?: number; ots?: string; digest?: string; note?: string }[]; howTo: string[] }
