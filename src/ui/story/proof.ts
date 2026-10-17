// The real Mutinynet proof recorded by the live run (public/mutinynet-status.json). Nothing here is made up: if the file has no proof, we say so.
import { useEffect, useState } from 'react';
export interface ChainProof { txid: string; txUrl: string; block?: string; blockUrl?: string; when?: string; summary?: string }
let cache: Promise<ChainProof | null> | null = null;
export function loadProof() { return (cache ??= fetch('./mutinynet-status.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then((j: any) => {
  const f: [string, string, string?][] = j?.proofs?.purchase?.fields ?? []; const tx = f.find(x => x[0] === 'Anchor tx'); const b = f.find(x => x[0] === 'Block');
  if (tx?.[2]) return { txid: tx[1], txUrl: tx[2], block: b?.[1], blockUrl: b?.[2], when: j.proofs.purchase.when, summary: j.proofs.purchase.summary };
  const r = j?.recorded?.[0]; return r?.txUrl ? { txid: r.txid, txUrl: r.txUrl, block: String(r.height), blockUrl: r.blockUrl } : null; }).catch(() => null)); }
export function useProof() { const [p, setP] = useState<ChainProof | null | undefined>(undefined); useEffect(() => { loadProof().then(setP); }, []); return p; }
