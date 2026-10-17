import { useEffect, useState } from 'react';
import { Card, TierBadge } from '../bits';
type Proof = { title: string; when?: string; summary?: string; fields: [string, string, string?][] };
const SLOTS: [string, string][] = [['purchase', 'Purchase with a real payment'], ['revocation', 'OP_RETURN revocation in a block'], ['ots', 'OpenTimestamps proof, confirmed']];
const short = (v: string) => v.length > 22 ? `${v.slice(0, 10)}…${v.slice(-8)}` : v;
function Slot({ title, p }: { title: string; p?: Proof }) {
  if (!p) return <div className="rounded-lg border border-dashed border-neutral-300 p-3"><div className="text-[13px] font-medium">{title}</div><div className="mt-1 text-[12px] text-neutral-400">Not recorded yet</div><div className="mt-2"><TierBadge b="recorded" /></div></div>;
  return <div className="rounded-lg border border-emerald-300 p-3"><div className="flex items-center justify-between gap-2"><div className="text-[13px] font-medium">{p.title}</div><TierBadge b="real" /></div>{p.when && <div className="mt-0.5 text-[11px] text-neutral-500">{p.when}</div>}{p.summary && <p className="mt-1.5 text-[12px] text-neutral-600">{p.summary}</p>}
    <dl className="mt-2 space-y-1 text-[11.5px]">{p.fields.map(([k, v, href]) => <div key={k} className="flex gap-2"><dt className="w-24 shrink-0 text-neutral-500">{k}</dt><dd className="min-w-0 truncate font-mono" title={v}>{href ? <a className="underline decoration-dotted hover:text-emerald-600" href={href} target="_blank" rel="noreferrer">{short(v)}</a> : short(v)}</dd></div>)}</dl></div>;
}
const ROWS: [string, 'real' | 'sim', string][] = [
  ['Nostr keys and event signatures (offers, bindings, consents, requests, revocations)', 'real', 'secp256k1 Schnorr via nostr-tools, recomputed by verifyLicence'],
  ['Node binding signature (LND signmessage format)', 'real', 'the library\'s lnmsg.ts, the same bytes LND produces'],
  ['BOLT11 invoices with description_hash = hash of the exact HTTP request', 'real', 'encoded and decoded by bolt11.ts, signed by a simulated node key'],
  ['x402 "402 Payment Required" requirements and clientCheck', 'real', 'x402.ts'],
  ['Preimage and payment hash', 'real', 'sha256(preimage) = payment hash, checked by check 8'],
  ['OpenTimestamps proofs', 'real', 'real .ots files over a merkle batch; the blocks they point at are simulated'],
  ['verifyLicence, the nine checks', 'real', 'the audited library, byte-for-byte (commit b268e79)'],
  ['Money in Instant mode: wallets, balances, routing, NWC budgets', 'sim', 'test sats in memory; no Lightning network'],
  ['Money in Live test wallets: NWC pay_invoice, make_invoice with description_hash, preimages, balances', 'real', 'real NWC wallets on the public faucet (faucet-only sats); budgets there are Lab-enforced'],
  ['Reading Mutinynet (headers, OP_RETURNs)', 'real', 'public Esplora at mutinynet.com; writing needs the faucet login'],
  ['Relays and indexes', 'sim', 'three in-memory relays; nothing is published to public relays'],
  ['Bitcoin blocks and OP_RETURN revocations', 'sim', 'SimChain implements the library\'s ChainOracle'],
  ['Signers (NIP-46 bunker), hosted nodes, the agent\'s model', 'sim', 'the rules and keys are real; the apps around them are not'],
];
export function Production() {
  const [st, setSt] = useState<any>(null);
  useEffect(() => { fetch('./mutinynet-status.json').then(r => r.ok ? r.json() : null).then(setSt).catch(() => {}); }, []);
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4"><div className="mb-1 flex items-center gap-2 font-semibold">🧪 This Lab (Instant mode)</div><p className="text-[13px] text-neutral-600">Runs entirely in your browser. No server, no account, no analytics, no real money. Keys are derived from a public seed, so they are test keys: never reuse them.</p></Card>
      <Card className="p-4"><div className="mb-1 flex items-center gap-2 font-semibold">🚀 Production</div><p className="text-[13px] text-neutral-600">Use your own key in a signer, your own Lightning node (not a shared hosted one, see A18), real public relays and real Bitcoin timestamps. The protocol code is the same library.</p></Card></div>
    <div><h3 className="mb-2 text-[15px] font-semibold">What is real and what is simulated</h3><div className="overflow-hidden rounded-lg border border-neutral-200"><table className="w-full text-[13px]"><tbody>{ROWS.map(([a, b, c]) => <tr key={a} className="border-b border-neutral-100 last:border-0"><td className="p-2.5">{a}</td><td className="p-2.5"><TierBadge b={b} /></td><td className="p-2.5 text-[12px] text-neutral-500">{c}</td></tr>)}</tbody></table></div></div>
    <div><h3 className="mb-2 text-[15px] font-semibold">Recorded runs on Mutinynet</h3><p className="mb-2 text-[12px] text-neutral-500">Slots for real end-to-end runs on Mutinynet (a public test network): real nodes, real test sats, real OP_RETURN. Each slot fills only from a run recorded on Mutinynet; every link opens the transaction or block on mutinynet.com. Nothing here is made up.</p>
      <div className="grid gap-3 md:grid-cols-3">{SLOTS.map(([k, t]) => <Slot key={k} title={t} p={st?.proofs?.[k]} />)}</div>{st?.run && <p className="mt-2 text-[12px] text-neutral-500">{st.run}</p>}</div>
    <div><h3 className="mb-2 text-[15px] font-semibold">Known open issues (found by this Lab)</h3><ul className="space-y-2 text-[13px]">
      <li className="rounded-lg border border-orange-200 bg-orange-50 p-3"><b>A18: shared hosted node.</b> If two artists share one hosted node, the operator or a co-tenant can take the money while verifyLicence still passes 9/9. Check 6 proves the node, not the account on it. Advice for v1: one node per artist, or a node the artist alone controls.</li>
      <li className="rounded-lg border border-orange-200 bg-orange-50 p-3"><b>A12b: stolen key after revocation.</b> Revocations name binding or offer ids, not keys. A new binding signed with the stolen key still verifies 9/9. Needs key rotation (for example a key-revocation record) in a later version.</li>
      <li className="rounded-lg border border-amber-200 bg-amber-50 p-3"><b>Fiat price lock (S21).</b> Today the request amount must equal the signed sats price, so a fiat-priced offer cannot lock its sats price at invoice time. v1 path: short-lived sats offers.</li></ul></div>
    <div><h3 className="mb-2 text-[15px] font-semibold">Wallets to try next</h3><div className="grid gap-3 md:grid-cols-3">{[['Alby Hub', 'Self-custodial node with NWC budgets per app. Good for agents like Echo and Scout.'], ['ZEUS', 'Mobile node and NWC. Run your own node for the binding.'], ['LNbits', 'Accounts and extensions. Fine for testing; a shared instance is a shared node (A18).']].map(([n, d]) => <Card key={n} className="p-3"><div className="font-semibold">{n}</div><div className="text-[12px] text-neutral-500">{d}</div></Card>)}</div></div>
  </div>;
}
