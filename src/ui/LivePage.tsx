import { useEffect, useState } from 'react';
import { Rocket, MoreVertical, RefreshCw, Loader2, AlertTriangle, Plus, ShieldCheck, Send, FileSignature, Receipt, Split, Bot, Globe, Lock } from 'lucide-react';
import { LiveWorld, LIVE_PARTIES, MAX_LIVE_PAY_SAT, type LiveParty } from '../live/live';
import { MutinynetChain, type MutinynetStatus } from '../live/mutinynet';
import { FAUCET } from '../live/nwc';
import { persona } from '../engine/cast';
import { Bulb, Button, Card, CopyField, Pill, TierBadge, cx } from './bits';
import { bump, go, useVersion } from './store';
import { NineChecks } from './tabs/Tabs';
import { music } from './music';
import { tagv } from '../engine/lab';
import type { Verdict } from '../engine/lab';
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} }, del: (k: string) => { try { localStorage.removeItem(k); } catch {} } };
let W: LiveWorld | null = null; const world = () => { if (!W) { W = new LiveWorld(ls); W.onChange = bump; } return W; };
type Res = { ok: boolean; text: string } | undefined;
function useAct() { const [busy, setBusy] = useState<string | null>(null); const [res, setRes] = useState<Record<string, Res>>({});
  const act = async (key: string, f: () => any, okText?: (r: any) => string) => { setBusy(key); try { const r = await f(); setRes(x => ({ ...x, [key]: { ok: true, text: okText ? okText(r) : 'Done.' } })); } catch (e: any) { setRes(x => ({ ...x, [key]: { ok: false, text: e.message } })); } finally { setBusy(null); bump(); } };
  return { busy, res, act }; }
export function LivePage() {
  useVersion(); const w = world(); const { busy, res, act } = useAct(); const [faucetUp, setFaucetUp] = useState<boolean | null>(null); const [verdict, setVerdict] = useState<{ strict: Verdict; facts: { label: string; ok: boolean; how: string }[] } | null>(null);
  const [price, setPrice] = useState(100); const [secs, setSecs] = useState(60);
  useEffect(() => { fetch(FAUCET, { mode: 'no-cors', signal: AbortSignal.timeout(8000) }).then(() => setFaucetUp(true)).catch(() => setFaucetUp(false));
    LIVE_PARTIES.forEach(p => { if (w.savedUri(p) && !w.wallets[p]) w.connect(p).catch(() => {}); }); }, []);
  const missing = LIVE_PARTIES.filter(p => !w.wallets[p]);
  const R = ({ k }: { k: string }) => res[k] ? <div className={cx('fade-in mt-2 flex items-start gap-2 rounded-md p-2 text-[12px]', res[k]!.ok ? 'bg-emerald-50 text-emerald-800' : 'border border-amber-200 bg-amber-50 text-amber-800')}>{!res[k]!.ok && <AlertTriangle size={13} className="mt-0.5 shrink-0" />}{res[k]!.text}</div> : null;
  const B = ({ k, icon, children, f, okText, variant = 'primary' }: { k: string; icon: React.ReactNode; children: React.ReactNode; f: () => any; okText?: (r: any) => string; variant?: 'primary' | 'outline' }) =>
    <Button variant={variant} className="w-full" disabled={!!busy} onClick={() => act(k, f, okText)}>{busy === k ? <Loader2 size={14} className="animate-spin" /> : icon}{children}</Button>;
  return <div className="mx-auto max-w-[1180px] px-5 py-5 md:px-8">
    <div className="flex flex-wrap items-center gap-2"><span className="text-2xl">🌐</span><h1 className="text-[20px] font-semibold tracking-tight">Live test wallets</h1><Pill className="bg-neutral-900 text-white">real payments</Pill><Pill className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">NWC faucet</Pill></div>
    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[14px] text-neutral-600">Bob licenses "Rain" with real Lightning payments between real NWC test wallets. Alice's wallet makes an invoice that commits to Bob's signed request; verifyLicence runs on the real preimage.
      <Bulb><b>Where the sats come from.</b> Each party gets a test wallet from the public NWC faucet ({FAUCET.replace('https://', '')}), as in Alby's sandbox. The faucet says: "Balances are not real and exist only inside the NWC Faucet." Payments, invoices and preimages are real Lightning messages. Nothing leaves the faucet.</Bulb></p>
    <div className="mt-3 grid gap-3 md:grid-cols-3">{[
      ['🏠 One shared node', 'Every faucet wallet sits on the same node (03b6b0…). So check 2 cannot tell artists apart: any faucet user could be "Alice\'s node". This is A18 in real life.'],
      ['✍️ No node signature', 'The faucet refuses sign_message (RESTRICTED), so the node cannot co-sign Alice\'s binding. verifyLicence therefore stops at check 2. The payment facts are proven separately below.'],
      ['🧾 Mainnet-format invoices, no budgets', 'Invoices start "lnbc" (mainnet format) though the sats are faucet-only; the request uses the mainnet network id to match. Faucet wallets have no NWC budget (get_budget returns {}), so agent budgets are enforced by the Lab.']].map(([t, d]) =>
      <div key={t} className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-[12px] text-orange-800"><div className="mb-1 font-semibold">{t}</div>{d}</div>)}</div>
    {faucetUp === false && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700"><AlertTriangle size={15} />The NWC faucet is not answering. Instant mode still works.<Button variant="outline" className="ml-auto h-8" onClick={() => go('s3')}>Open scenario 3 (Instant)</Button></div>}
    {missing.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800"><AlertTriangle size={15} />Create test wallets for all parties to try every action ({missing.length} missing). Any party can act at any time.
      <Button variant="outline" className="ml-auto h-8" disabled={!!busy} onClick={() => act('all', async () => { for (const p of missing) await w.connect(p); })}>{busy === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}Create all ({missing.length})</Button></div>}
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{LIVE_PARTIES.map(p => <LiveCard key={p} w={w} p={p} busy={!!busy} act={act} res={res[`c.${p}`]} />)}</div>
    <h2 className="mt-6 text-[15px] font-semibold">Actions <span className="text-[12px] font-normal text-neutral-500">· real, in any order; the guards explain what is missing</span></h2>
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <Card className="p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><span className="text-lg">{persona('alice').emoji}</span>Alice: sell "Rain"</div>
        <label className="block text-[11px] text-neutral-500">Price (sats, faucet sats)<input type="number" min={1} max={MAX_LIVE_PAY_SAT} value={price} onChange={e => setPrice(Number(e.target.value))} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13px]" /></label>
        <div className="mt-3 space-y-2"><B k="publish" icon={<FileSignature size={14} />} f={() => w.publish(price)} okText={() => `Signed offer ${w.offer!.id.slice(0, 10)}… with binding and 3 consents.`}>Publish offer (binding, offer, consents)</B><R k="publish" />
          <B k="invoice" variant="outline" icon={<Receipt size={14} />} f={() => w.issueInvoice()} okText={r => `Invoice ${r.slice(0, 16)}… sent to ${persona(w.buyer!).name}.`}>Make invoice for the request</B><R k="invoice" />
          <B k="payout" variant="outline" icon={<Split size={14} />} f={() => w.payout()} okText={r => `Paid: ${r.join(', ')}.`}>Pay the co-owners (20 / 15 / 15%)</B><R k="payout" /></div>
        {w.invoice && <div className="mt-3"><CopyField label="BOLT11 invoice (real, from Alice's faucet wallet)" value={w.invoice} /></div>}
        {w.reqs && <div className="mt-2"><CopyField label="description_hash = hash of Bob's exact request" value={w.reqs.extra.requestHash} /></div>}</Card>
      <Card className="p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><span className="text-lg">{persona('bob').emoji}</span>Bob: buy a licence</div>
        <label className="block text-[11px] text-neutral-500">Seconds of "Rain" in his video<input type="number" value={secs} onChange={e => setSecs(Number(e.target.value))} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13px]" /></label>
        <div className="mt-3 space-y-2"><B k="request" icon={<Send size={14} />} f={() => w.requestLicence('bob', secs)} okText={() => `Request signed by fresh key ${w.request!.pubkey.slice(0, 10)}….`}>Sign a licence request</B><R k="request" />
          <B k="pay" variant="outline" icon={<Rocket size={14} />} f={async () => { const r = await w.pay('bob'); const t = music.bySha(tagv(w.offer!, 'x')); if (t) music.unlock(t.id, { how: 'Paid for real on the NWC faucet (Live test wallets). Check 2 cannot pass on the faucet', holder: 'bob' }); return r; }} okText={r => `Paid. Preimage ${r.slice(0, 16)}…. The full track is unlocked in the player.`}>Check and pay the invoice</B><R k="pay" />
          <B k="verify" variant="outline" icon={<ShieldCheck size={14} />} f={async () => { const v = await w.verify(); setVerdict(v); return v; }} okText={v => v.strict.result.ok ? 'Valid licence.' : `verifyLicence stopped at check 2 (${v.strict.result.code}), as expected on the faucet. ${v.facts.filter((f: any) => f.ok).length}/6 payment facts proven.`}>Verify the licence</B><R k="verify" /></div>
        {w.preimage && <div className="mt-3"><CopyField label="Payment preimage (real)" value={w.preimage} /></div>}</Card>
      <Card className="p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><span className="text-lg">{persona('bobagent').emoji}</span>Bob's agent: buy as an agent <TierBadge b="sim" /></div>
        <p className="text-[12px] text-neutral-500">Faucet wallets have no budget, so the Lab enforces this one before paying. The payment itself is real.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">{(['maxPerPaymentSat', 'dailyCapSat'] as const).map(k => <label key={k} className="text-[11px] text-neutral-500">{k === 'maxPerPaymentSat' ? 'Max per payment' : 'Daily cap'} (sats)<input type="number" value={w.budget[k]} onChange={e => { w.budget[k] = Number(e.target.value); bump(); }} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13px]" /></label>)}</div>
        <div className="mt-1 text-[11px] text-neutral-500">Spent today: {w.budget.spentSat} / {w.budget.dailyCapSat} sats</div>
        <div className="mt-3"><B k="bobagent" icon={<Bot size={14} />} f={async () => { w.requestLicence('bobagent', 30); await w.issueInvoice(); return w.pay('bobagent'); }} okText={r => `Bob's agent paid inside its budget. Preimage ${r.slice(0, 12)}….`}>Request, get invoice, pay (within budget)</B><R k="bobagent" /></div></Card>
      <Card className="p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck size={16} />verifyLicence on the real preimage</div>
        <NineChecks v={verdict?.strict} />
        {verdict && <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-[12px]">{verdict.facts.map(f => <li key={f.label} className="flex items-start gap-2"><span className={f.ok ? 'text-emerald-600' : 'text-orange-600'}>{f.ok ? '✓' : '✗'}</span><span><b className="font-medium">{f.label}</b><span className="block text-[11px] text-neutral-500">{f.how}</span></span></li>)}</ul>}</Card>
    </div>
    <MutinynetPanel />
    <Card className="mt-5 p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-[15px] font-semibold">Transaction Log</h3><Button variant="ghost" className="h-7" onClick={() => w.refreshAll()}><RefreshCw size={13} />Refresh balances</Button></div>
      {!w.logs.length ? <div className="py-6 text-center text-[13px] text-neutral-400">Nothing yet. Create the wallets, then act.</div> : <ul className="divide-y divide-neutral-100">{w.logs.slice().reverse().map((l, i) => <li key={i} className="flex items-start gap-3 py-2 text-[12px]"><span className="w-16 shrink-0 font-mono text-neutral-500">{new Date(l.t).toTimeString().slice(0, 8)}</span><span className="w-32 shrink-0 font-medium">{persona(l.from).name}{l.to ? ` → ${persona(l.to).name}` : ''}</span><span className="min-w-0 flex-1 break-words text-neutral-600">{l.text}</span><TierBadge b={l.badge} /></li>)}</ul>}</Card>
  </div>;
}
function LiveCard({ w, p, busy, act, res }: { w: LiveWorld; p: LiveParty; busy: boolean; act: (k: string, f: () => any, ok?: (r: any) => string) => void; res: Res }) {
  const per = persona(p); const on = !!w.wallets[p]; const bal = w.balances[p]; const [menu, setMenu] = useState(false);
  return <Card className="relative p-4"><div className="flex items-center gap-2"><span className="text-xl">{per.emoji}</span><span className="font-semibold">{per.name}</span>
    <span className={cx('ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium', on ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-500')}>{on ? 'Connected' : 'Disconnected'}</span>
    {on && <button aria-label={`Options for ${per.name}`} onClick={() => setMenu(!menu)} className="rounded p-0.5 hover:bg-neutral-100"><MoreVertical size={15} /></button>}</div>
    {menu && <div className="absolute right-3 top-11 z-20 w-48 rounded-md border border-neutral-200 bg-white p-1 text-[13px] shadow-md"><button className="w-full rounded px-2 py-1.5 text-left hover:bg-neutral-50" onClick={() => { setMenu(false); w.forget(p); }}>Forget this wallet</button></div>}
    {on ? <div className="mt-3"><div className="flex items-center gap-1 text-[11px] text-neutral-500"><Globe size={11} />NWC · faucet wallet <span className="rounded bg-emerald-50 px-1.5 py-[1px] text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">REAL NWC</span></div>
      <div className="mt-1 text-[22px] font-bold tracking-tight">{bal === undefined ? '…' : bal.toLocaleString()} sats</div><div className="text-[11px] text-neutral-400">faucet sats: not real money</div>
      <div className="mt-1 truncate font-mono text-[11px] text-neutral-500" title={w.lud16[p]}>⚡ {w.lud16[p]}</div>
      <div className="mt-2 flex gap-2"><Button variant="outline" className="h-7 flex-1 px-2 text-[12px]" disabled={busy} onClick={() => act(`c.${p}`, () => w.topUp(p, 500), () => 'Topped up 500 sats.')}><Plus size={12} />Top up 500</Button><Button variant="ghost" className="h-7 px-2" aria-label="Refresh balance" onClick={() => w.refresh(p)}><RefreshCw size={12} /></Button></div></div>
      : <div className="mt-3"><div className="text-[22px] font-bold text-neutral-400">— sats</div><div className="mb-3 text-[12px] text-neutral-500">Create {per.name}'s faucet wallet to act</div>
        <Button className="w-full" disabled={busy} onClick={() => act(`c.${p}`, () => w.connect(p), () => 'Wallet created.')}><Rocket size={14} />Create Test Wallet</Button></div>}
    {res && !res.ok && <div className="mt-2 text-[12px] text-red-700">{res.text}</div>}</Card>;
}
function MutinynetPanel() {
  const [tip, setTip] = useState<{ height: number; hash: string } | null>(null); const [err, setErr] = useState(''); const [st, setSt] = useState<MutinynetStatus | null>(null);
  useEffect(() => { new MutinynetChain().tip().then(setTip).catch(e => setErr(e.message)); fetch('./mutinynet-status.json').then(r => r.ok ? r.json() : null).then(setSt).catch(() => {}); }, []);
  const needs = !st || st.faucetLogin === 'needs login';
  return <Card className="mt-5 p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-lg">⛓️</span><h3 className="text-[15px] font-semibold">Timestamps and revocations on Mutinynet</h3>{needs ? <Pill className="bg-amber-50 text-amber-800 ring-1 ring-amber-200"><Lock size={11} className="mr-1" />needs login</Pill> : <Pill className="bg-emerald-50 text-emerald-700">ready</Pill>}</div>
    <div className="grid gap-3 text-[13px] md:grid-cols-3">
      <div className="rounded-md border border-neutral-200 p-3"><div className="text-[11px] text-neutral-500">Reading the chain <TierBadge b="real" /></div>{tip ? <><div className="mt-1 font-semibold">Block {tip.height.toLocaleString()}</div><div className="truncate font-mono text-[11px] text-neutral-500" title={tip.hash}>{tip.hash}</div><div className="mt-1 text-[11px] text-neutral-500">Live from mutinynet.com, no login. The verifier can read headers and OP_RETURNs here.</div></> : <div className="mt-1 text-[12px] text-neutral-500">{err || 'Loading…'}</div>}</div>
      <div className="rounded-md border border-neutral-200 p-3"><div className="text-[11px] text-neutral-500">Writing (OP_RETURN, OpenTimestamps)</div><div className="mt-1 text-[12px] text-neutral-700">Needs Mutinynet test coins. The Mutinynet faucet only gives coins after a GitHub login (its other route asks for a real mainnet payment, which this Lab never makes). Public OpenTimestamps calendars only stamp Bitcoin mainnet, so the Mutinynet path uses our own calendar (otsd) and OP-RETURN-Bot from mll-audit.</div></div>
      <div className="rounded-md border border-dashed border-neutral-300 p-3"><div className="text-[11px] text-neutral-500">Recorded on Mutinynet</div>{st?.recorded?.length ? <ul className="mt-1 space-y-1 text-[12px]">{st.recorded.map((r, i) => <li key={i}>{r.kind}: <span className="font-mono">{r.txid?.slice(0, 16)}…</span> block {r.height}</li>)}</ul> : <div className="mt-1 text-[12px] text-neutral-500">Nothing yet. No data is invented.</div>}
        {st && <div className="mt-2 text-[11px] text-neutral-500">Status checked {new Date(st.checkedAt).toLocaleString('en-GB')}: login {st.faucetLogin}, node {st.localNode}, otsd {st.otsd}, OP-RETURN-Bot {st.opReturnBot}.</div>}</div></div>
    {needs && <div className="mt-3 rounded-md bg-neutral-50 p-3 text-[12px] text-neutral-600"><b>To finish (needs you):</b> {(st?.howTo ?? ['Run `mutinynet-cli login` and approve the GitHub device code.', 'Then run `npx tsx scripts/mutinynet-anchor.mts` in licence-lab.']).map((h, i) => <div key={i}>{i + 1}. {h}</div>)}</div>}
    <Button variant="outline" className="mt-3" disabled title="Needs Mutinynet test coins (GitHub login)"><Lock size={14} />Anchor this licence on Mutinynet (needs login)</Button></Card>;
}
