// Chain access. A verifier must say how it did the revocation absence check (spec check 9).
export interface Anchor { type: 'opreturn' | 'orb' | 'ots'; txid?: string; blockhash?: string; height?: number; ots?: string; calendars?: string[] }
export interface ChainOracle {
  method: string;
  heightOfBlockHash(hash: string): Promise<number | null>;
  /** returns the height at which `payload` (hex) appears in an OP_RETURN of tx `txid` in block `blockhash`, else null */
  opReturnHeight(txid: string, blockhash: string, payloadHex: string): Promise<number | null>;
  /** all OP_RETURN payloads starting with prefixHex, mined at or below maxHeight */
  scanOpReturns(prefixHex: string, maxHeight: number, minHeight?: number): Promise<{ payload: string; height: number; txid: string }[]>;
  /** block header time at height (optional; enables revocation grandfathering, AUDIT F-04) */
  blockTime?(height: number): Promise<number | null>;
  /** block merkle root (RPC display hex) at height in the best chain; needed for OpenTimestamps proofs (AUDIT F-18) */
  merkleRootAtHeight?(height: number): Promise<string | null>;
}
export class BitcoindChain implements ChainOracle {
  method = 'full-node-scan (bitcoind RPC)';
  constructor(private url = 'http://127.0.0.1:18443', private auth = 'u:p', private wallet?: string) {}
  async rpc(method: string, params: unknown[] = [], wallet?: string): Promise<any> {
    const r = await fetch(this.url + (wallet ? `/wallet/${wallet}` : ''), { method: 'POST', headers: { authorization: 'Basic ' + Buffer.from(this.auth).toString('base64'), 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '1.0', id: 1, method, params }) });
    const j: any = await r.json(); if (j.error) throw new Error(`${method}: ${j.error.message}`); return j.result;
  }
  async heightOfBlockHash(h: string) { try { const b = await this.rpc('getblockheader', [h]); return b.confirmations > 0 ? b.height : null; } catch { return null; } }
  private opReturns(tx: any): string[] { return tx.vout.map((v: any) => v.scriptPubKey).filter((s: any) => s.type === 'nulldata').map((s: any) => normaliseOpReturn(s.hex.replace(/^6a(4c..|[0-4][0-9a-f])/, ''))); }
  async opReturnHeight(txid: string, blockhash: string, payload: string) {
    try { const b = await this.rpc('getblock', [blockhash, 2]); if (b.confirmations < 1) return null;
      const tx = b.tx.find((t: any) => t.txid === txid); if (!tx) return null;
      return this.opReturns(tx).includes(payload) ? b.height : null; } catch { return null; }
  }
  async merkleRootAtHeight(h: number) { try { return (await this.rpc('getblockheader', [await this.rpc('getblockhash', [h])])).merkleroot as string; } catch { return null; } }
  async blockTime(h: number) { try { return (await this.rpc('getblockheader', [await this.rpc('getblockhash', [h])])).time as number; } catch { return null; } }
  /** AUDIT F-19: cache per-block OP_RETURNs (keyed by block hash, so a reorg invalidates naturally); a verify no longer rescans the whole chain. */
  private blockCache = new Map<number, { hash: string; ors: { payload: string; txid: string }[] }>();
  async scanOpReturns(prefix: string, maxHeight: number, minHeight = 0) {
    const out: { payload: string; height: number; txid: string }[] = [];
    const tip = await this.rpc('getblockcount');
    for (let h = Math.max(0, minHeight); h <= Math.min(tip, maxHeight); h++) {
      const hash = await this.rpc('getblockhash', [h]); let c = this.blockCache.get(h);
      if (!c || c.hash !== hash) { const b = await this.rpc('getblock', [hash, 2]); c = { hash, ors: [] }; for (const tx of b.tx) for (const p of this.opReturns(tx)) c.ors.push({ payload: p, txid: tx.txid }); this.blockCache.set(h, c); }
      for (const o of c.ors) if (o.payload.startsWith(prefix)) out.push({ ...o, height: h });
    }
    return out;
  }
  /** Write an OP_RETURN from the node wallet (anchor operator stand-in). Returns txid. */
  async writeOpReturn(payloadHex: string, wallet = this.wallet ?? 'w'): Promise<string> {
    const raw = await this.rpc('createrawtransaction', [[], [{ data: payloadHex }]]);
    const funded = await this.rpc('fundrawtransaction', [raw, { fee_rate: 2 }], wallet);
    const signed = await this.rpc('signrawtransactionwithwallet', [funded.hex], wallet);
    return this.rpc('sendrawtransaction', [signed.hex]);
  }
}
export const MLA1 = Buffer.from('MLA1').toString('hex'); // anchor prefix (licence digest)
export const MLR1 = Buffer.from('MLR1').toString('hex'); // revocation prefix (100 bytes)
export const MLR2 = Buffer.from('MLR2').toString('hex'); // compact revocation (80 bytes; N-2)
export const MLR_ANY = Buffer.from('MLR').toString('hex');
/** OP-RETURN-Bot writes UTF-8 text. A licence anchored through it carries "MLA1" + 64 lowercase hex chars (68 bytes); map that to the
 *  binary form so both encodings verify the same way. Anything else is returned unchanged. */
export function normaliseOpReturn(hex: string): string {
  const t = Buffer.from(hex, 'hex').toString('latin1'); const m = /^(MLA1|MLR2)([0-9a-f]{64,})$/.exec(t);
  return m && m[2].length % 2 === 0 ? Buffer.from(m[1]).toString('hex') + m[2] : hex;
}
