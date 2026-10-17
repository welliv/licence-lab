import { useEffect, useState } from 'react';
import { FileText, GitBranch, LineChart, Code2, MessageSquare, Rocket, ListChecks, Braces, Trash2, Play, ChevronLeft, ChevronRight, Check, X as XIcon, Copy } from 'lucide-react';
import { session, useVersion } from '../store';
import { persona } from '../../engine/cast';
import { NINE, short, type Verdict } from '../../engine/lab';
import { Avatar, Button, Card, TierBadge, cx } from '../bits';
import { SNIPPETS, CATS } from '../snippets';
import { Production } from './Production';
import { highlight } from '../highlight';
import { Repl } from './Repl';
import { Terminal, BookOpen, Upload as UploadIcon, ShoppingCart, Bot, ShieldCheck, Ban, Anchor, Play as PlayIcon } from 'lucide-react';
const CAT_ICON: Record<string, any> = { 'This scenario': PlayIcon, 'Getting started': BookOpen, REPL: Terminal, Publish: UploadIcon, Buy: ShoppingCart, Agent: Bot, Verify: ShieldCheck, Revoke: Ban, Anchor };
const TABS = [['log', 'Log', FileText], ['flow', 'Flow Diagram', GitBranch], ['balance', 'Balance Chart', LineChart], ['checks', 'Nine Checks', ListChecks], ['code', 'Code', Code2], ['inspect', 'Inspect', Braces], ['prompts', 'Example Prompts', MessageSquare], ['production', 'Production', Rocket]] as const;
export function Tabs({ sid, tab, setTab }: { sid: string; tab: string; setTab: (t: string) => void }) {
  useVersion(); const s = session(sid); const n = s.runs.length; const [cursor, setCursor] = useState<number | null>(null); const [playing, setPlaying] = useState(false);
  const at = cursor ?? n; // replay cursor: show the world as it was after step `at`
  useEffect(() => { if (!playing) return; if ((cursor ?? 0) >= n) { setPlaying(false); setCursor(null); return; } const t = setTimeout(() => setCursor((cursor ?? 0) + 1), 900); return () => clearTimeout(t); }, [playing, cursor, n]);
  const stepIds = new Set(['setup', ...s.runs.slice(0, at).map(r => r.step.id)]);
  return <div>
    <div className="flex flex-wrap items-center gap-2"><div role="tablist" className="flex flex-wrap gap-0.5 rounded-lg bg-neutral-100 p-1">{TABS.map(([id, label, Icon]) =>
      <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px]', tab === id ? 'bg-white font-medium shadow-sm' : 'text-neutral-600 hover:text-neutral-900')}><Icon size={13} />{label}</button>)}</div>
      {['log', 'flow', 'balance', 'inspect'].includes(tab) && n > 0 && <div className="ml-auto flex items-center gap-1 text-[12px] text-neutral-600" aria-label="Replay timeline">
        <button aria-label="Previous step" className="rounded p-1 hover:bg-neutral-100" onClick={() => setCursor(Math.max(0, at - 1))}><ChevronLeft size={14} /></button>
        <div className="flex items-center gap-1">{Array.from({ length: n + 1 }, (_, i) => <button key={i} aria-label={i ? `After step ${i}` : 'Setup'} onClick={() => setCursor(i === n ? null : i)} className={cx('h-2.5 w-2.5 rounded-full', i <= at ? 'bg-neutral-900' : 'bg-neutral-300')} />)}</div>
        <button aria-label="Next step" className="rounded p-1 hover:bg-neutral-100" onClick={() => setCursor(at + 1 >= n ? null : at + 1)}><ChevronRight size={14} /></button>
        <span className="w-20 text-center">{at === 0 ? 'setup' : `step ${at}/${n}`}</span><Button variant="outline" className="h-7 px-2" onClick={() => { setCursor(0); setPlaying(true); }}><Play size={12} />Replay</Button></div>}</div>
    <div className="mt-3 border-t border-neutral-200 pt-3">
      {tab === 'log' && <LogTab sid={sid} stepIds={stepIds} />}
      {tab === 'flow' && <FlowTab sid={sid} stepIds={stepIds} />}
      {tab === 'balance' && <BalanceTab sid={sid} at={at} />}
      {tab === 'checks' && <ChecksTab sid={sid} />}
      {tab === 'code' && <CodeTab sid={sid} />}
      {tab === 'inspect' && <InspectTab sid={sid} at={at} />}
      {tab === 'prompts' && <PromptsTab sid={sid} />}
      {tab === 'production' && <Production />}
    </div></div>;
}
function Empty({ children }: { children: React.ReactNode }) { return <div className="py-10 text-center text-[13px] text-neutral-400">{children}</div>; }
function LogTab({ sid, stepIds }: { sid: string; stepIds: Set<string> }) {
  const s = session(sid); const [open, setOpen] = useState<number | null>(null); const [hide, setHide] = useState(0);
  const logs = (s.lab?.logs ?? []).filter(l => stepIds.has(l.step ?? 'setup') && l.id > hide);
  return <div><div className="mb-2 flex items-center justify-between"><h3 className="text-[15px] font-semibold">Transaction Log</h3><Button variant="ghost" className="h-7" onClick={() => setHide(s.lab?.logs.at(-1)?.id ?? 0)}><Trash2 size={13} />Clear</Button></div>
    {!logs.length ? <Empty>No entries yet. Set up the parties and run a step.</Empty> : <ul className="divide-y divide-neutral-100">{logs.slice().reverse().map(l => <li key={l.id} className="py-2 text-[12px]">
      <div className="flex items-start gap-3">{l.ok ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <XIcon size={14} className="mt-0.5 shrink-0 text-red-600" />}
        <span className="w-16 shrink-0 font-mono text-neutral-500">{new Date(l.t * 1000).toISOString().slice(11, 19)}</span>
        <span className="w-36 shrink-0 font-medium">{persona(l.from).name}{l.to ? ` → ${persona(l.to).name}` : ''}</span><span className="min-w-0 flex-1 break-words text-neutral-600">{l.text}</span><TierBadge b={l.badge} /></div>
      {(l.code || l.data) ? <button onClick={() => setOpen(open === l.id ? null : l.id)} className="ml-[124px] mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900">› <Code2 size={11} /> {open === l.id ? 'Hide' : 'Show'} code and data</button> : null}
      {open === l.id && <div className="ml-[124px] mt-1 space-y-2">{l.code && <Pre>{l.code}</Pre>}{l.data ? <Pre>{JSON.stringify(l.data, null, 2)}</Pre> : null}</div>}</li>)}</ul>}</div>;
}
export function Pre({ children, className }: { children: string; className?: string }) { const [ok, setOk] = useState(false); return <div className="relative"><pre className={cx('scroll-thin max-h-[360px] overflow-auto rounded-md bg-neutral-50 p-3 font-mono text-[11.5px] leading-[1.55] text-neutral-800 ring-1 ring-neutral-200', className)}>{highlight(children, /^\s*[[{]/.test(children))}</pre><button aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(children); setOk(true); setTimeout(() => setOk(false), 1000); }} className="absolute right-2 top-2 rounded border border-neutral-200 bg-white px-1.5 py-1 text-[11px] hover:bg-neutral-50">{ok ? <Check size={12} /> : <Copy size={12} />}</button></div>; }
const KIND_STYLE: Record<string, string> = { event: 'text-violet-700', invoice: 'text-amber-700', payment: 'text-amber-600', preimage: 'text-emerald-700', anchor: 'text-orange-600', message: 'text-sky-700', report: 'text-red-600', check: 'text-neutral-700', refuse: 'text-red-600' };
function FlowTab({ sid, stepIds }: { sid: string; stepIds: Set<string> }) {
  const s = session(sid); const flows = (s.lab?.flows ?? []).filter(f => stepIds.has(f.step ?? 'setup') && f.step !== 'setup');
  if (!flows.length) return <><h3 className="mb-2 text-[15px] font-semibold">Flow Diagram</h3><Empty>Each signed event, invoice, payment and anchor appears here as it happens.</Empty></>;
  const order = [...new Set([...s.sc.cast, ...flows.flatMap(f => [f.from, f.to])])].filter(p => flows.some(f => f.from === p || f.to === p)); const col = (p: string) => order.indexOf(p); const W = 100 / order.length;
  return <div><h3 className="mb-3 text-[15px] font-semibold">Flow Diagram</h3><div className="scroll-thin overflow-x-auto"><div style={{ minWidth: order.length * 120 }}>
    <div className="flex">{order.map(p => <div key={p} className="flex flex-col items-center" style={{ width: `${W}%` }}><Avatar id={p} size={40} /><div className="mt-1 text-[12px] font-medium">{persona(p).name}</div><div className="text-[10px] text-neutral-400">{s.lab?.balances[p] !== undefined ? `${s.lab.balances[p].toLocaleString()} sats` : ' '}</div></div>)}</div>
    <div className="relative mt-2">{order.map(p => <div key={p} className="absolute bottom-0 top-0 border-l border-dashed border-neutral-300" style={{ left: `${(col(p) + 0.5) * W}%` }} />)}
      {flows.map((f, i) => { const a = col(f.from), b = col(f.to); const l = Math.min(a, b), r = Math.max(a, b); const self = a === b;
        return <div key={f.id} className="fade-in relative h-12">
          <div className={cx('absolute top-6 border-t', f.ok ? 'border-neutral-400' : 'border-red-400 border-dashed')} style={{ left: `${(l + 0.5) * W}%`, width: `${self ? 4 : (r - l) * W}%` }} />
          {!self && <div className={cx('absolute top-[19px] text-[11px]', f.ok ? 'text-neutral-500' : 'text-red-500')} style={{ left: b > a ? `calc(${(b + 0.5) * W}% - 8px)` : `calc(${(b + 0.5) * W}% - 2px)` }}>{b > a ? '▶' : '◀'}</div>}
          <div className="absolute top-2.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] shadow-sm" style={{ left: `${((l + r) / 2 + 0.5) * W}%` }}>
            <span className="text-neutral-400">{i + 1}</span> <b>{persona(f.from).name}</b> {b >= a ? '→' : '←'} <b>{persona(f.to).name}</b> <span className={KIND_STYLE[f.kind]}>{f.label}</span> {f.ok ? <Check size={11} className="inline text-emerald-600" /> : <XIcon size={11} className="inline text-red-600" />}</div></div>; })}</div></div></div></div>;
}
function BalanceTab({ sid, at }: { sid: string; at: number }) {
  const s = session(sid); const [mode, setMode] = useState<'change' | 'balance'>('change'); const h = (s.lab?.history ?? []).slice(0, at + 1); if (h.length < 1) return <Empty>Balances over time appear after the first step.</Empty>;
  const parties = s.sc.cast.filter(p => h.some(x => x.balances[p] !== undefined) && !['infra', 'checker'].includes(persona(p).role));
  const val = (x: (typeof h)[number], p: string) => (x.balances[p] ?? 0) - (mode === 'change' ? (h[0].balances[p] ?? 0) : 0);
  const vals = h.flatMap(x => parties.map(p => val(x, p))); const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const X = (i: number) => 60 + i * (620 / Math.max(1, h.length - 1)), Y = (v: number) => 210 - (v - min) / (max - min) * 190;
  return <div><div className="mb-2 flex items-center gap-3"><h3 className="text-[15px] font-semibold">Balance Chart <span className="text-[12px] font-normal text-neutral-400">(simulated test sats)</span></h3>
    <div className="ml-auto flex rounded-md bg-neutral-100 p-0.5 text-[12px]">{(['change', 'balance'] as const).map(m => <button key={m} onClick={() => setMode(m)} className={cx('rounded px-2 py-0.5', mode === m && 'bg-white shadow-sm')}>{m === 'change' ? 'Change since setup' : 'Balance'}</button>)}</div></div>
    <svg viewBox="0 0 700 240" className="w-full max-w-[900px]" role="img" aria-label="Balance chart">{[0, .5, 1].map(f => { const v = min + (max - min) * f; return <g key={f}><line x1="60" x2="680" y1={Y(v)} y2={Y(v)} className="stroke-neutral-200" /><text x="0" y={Y(v) + 4} fontSize="10" className="fill-neutral-500">{Math.round(v).toLocaleString()}</text></g>; })}
      {min < 0 && <line x1="60" x2="680" y1={Y(0)} y2={Y(0)} className="stroke-neutral-400" strokeDasharray="3 3" />}
      {h.map((x, i) => <text key={i} x={X(i)} y="232" fontSize="9" className="fill-neutral-500" textAnchor="middle">{i === 0 ? 'setup' : i}</text>)}
      {parties.map(p => <g key={p}><polyline fill="none" stroke={persona(p).colour} strokeWidth="2" points={h.map((x, i) => `${X(i)},${Y(val(x, p))}`).join(' ')} />{h.map((x, i) => <circle key={i} cx={X(i)} cy={Y(val(x, p))} r="2.5" fill={persona(p).colour}><title>{`${persona(p).name}: ${(x.balances[p] ?? 0).toLocaleString()} sats`}</title></circle>)}</g>)}</svg>
    <div className="flex flex-wrap gap-3">{parties.map(p => { const d = val(h.at(-1)!, p); return <span key={p} className="inline-flex items-center gap-1.5 text-[12px]"><span className="h-2 w-2 rounded-full" style={{ background: persona(p).colour }} />{persona(p).name}: {(h.at(-1)!.balances[p] ?? 0).toLocaleString()}{mode === 'change' && <span className={d >= 0 ? 'text-emerald-600' : 'text-red-600'}>({d >= 0 ? '+' : ''}{d.toLocaleString()})</span>}</span>; })}</div></div>;
}
export function NineChecks({ v, compact }: { v?: Verdict; compact?: boolean }) {
  return <ol className="space-y-1.5">{NINE.map((label, i) => { const c = v?.checks[i]; const st = c?.status ?? 'todo';
    return <li key={i} className={cx('flex items-start gap-2 rounded-md px-2 py-1.5 text-[13px]', st === 'pass' && 'bg-emerald-50', st === 'fail' && 'bounce-x bg-red-50', st === 'skip' && 'bg-neutral-50')}>
      <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold', st === 'pass' ? 'bg-emerald-500 text-white' : st === 'fail' ? 'bg-red-500 text-white' : 'bg-neutral-200 text-neutral-500')}>{i + 1}</span>
      <span className="flex-1"><span className={cx(st === 'todo' && 'text-neutral-400')}>{label}</span>{c?.detail && !compact && <span className={cx('block text-[11px]', st === 'fail' ? 'text-red-700' : 'text-neutral-500')}>{c.detail}</span>}</span>
      <span className="text-[11px] text-neutral-500">{st === 'pass' ? 'pass' : st === 'fail' ? 'FAIL' : st === 'skip' ? 'skipped' : 'not reached'}</span></li>; })}</ol>;
}
function ChecksTab({ sid }: { sid: string }) {
  const s = session(sid); const r = [...s.runs].reverse().find(x => x.out.verdict); const proven = [...new Set(s.runs.flatMap(x => x.out.proves ?? []))].sort();
  return <div className="grid gap-5 md:grid-cols-2"><div><h3 className="mb-1 text-[15px] font-semibold">verifyLicence: the nine checks</h3><p className="mb-3 text-[12px] text-neutral-500">{r ? `Latest verification: step "${r.step.title}". ${r.out.verdict!.result.ok ? 'Valid.' : 'Rejected: ' + r.out.verdict!.result.reason}` : 'No verification in this scenario yet.'} Re-checked from scratch every time; nothing is cached.</p><NineChecks v={r?.out.verdict} /></div>
    <div><h3 className="mb-2 text-[15px] font-semibold">What is proven so far</h3>{proven.length ? <ul className="space-y-1.5">{proven.map(n => <li key={n} className="flex items-center gap-2 text-[13px]"><span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-[11px] font-bold text-white">{n}</span>{NINE[n - 1]}</li>)}</ul> : <Empty>Run steps to fill this in.</Empty>}
      <p className="mt-4 text-[12px] text-neutral-500">Numbering follows the white paper. Inside the library the order is offer, consents, binding, request, invoice, preimage, timestamp, revocation.</p></div></div>;
}
function CodeTab({ sid }: { sid: string }) {
  const s = session(sid); const [cat, setCat] = useState('This scenario'); const runs = s.runs.filter(r => r.out.code);
  return <div className="flex flex-col gap-4 md:flex-row"><div className="flex shrink-0 flex-row flex-wrap gap-1 md:w-44 md:flex-col">{['This scenario', ...CATS].map(c => { const I = CAT_ICON[c]; return <button key={c} onClick={() => setCat(c)} className={cx('inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px]', cat === c ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100')}>{I && <I size={13} />}{c}</button>; })}</div>
    <div className="min-w-0 flex-1 space-y-3">{cat === 'This scenario' ? (runs.length ? runs.map(r => <Card key={r.step.id} className="p-3"><div className="mb-1 text-[13px] font-semibold">{persona(r.step.actor).emoji} {r.step.title}</div><div className="mb-2 text-[12px] text-neutral-500">The code that just ran, with the real values from this run.</div><Pre>{r.out.code!}</Pre></Card>) : <Empty>Run a step to see the exact code that ran.</Empty>)
      : cat === 'REPL' ? <Repl sid={sid} /> : SNIPPETS.filter(x => x.cat === cat).map(x => <Card key={x.id} className="p-3"><div className="text-[13px] font-semibold">{x.title}</div><div className="mb-2 text-[12px] text-neutral-500">{x.desc}</div><Pre>{x.code}</Pre></Card>)}</div></div>;
}
function InspectTab({ sid, at }: { sid: string; at: number }) {
  const s = session(sid); const runs = s.runs.slice(0, at).filter(r => r.out.json); const [sel, setSel] = useState<string | null>(null); const r = runs.find(x => x.step.id === sel) ?? runs.at(-1);
  const bundle = s.lab && Object.entries(s.lab.a).filter(([k, v]) => k.startsWith('bundle') && v && typeof v === 'object' && 'offer' in v && !k.endsWith('.link')).at(-1);
  return <div className="grid gap-5 lg:grid-cols-[1fr_340px]"><div><h3 className="mb-2 text-[15px] font-semibold">Inspect artefacts</h3>{!r ? <Empty>Signed events, invoices and bundles appear here.</Empty> : <>
    <div className="mb-2 flex flex-wrap gap-1">{runs.map(x => <button key={x.step.id} onClick={() => setSel(x.step.id)} className={cx('rounded-full border px-2 py-0.5 text-[11px]', x === r ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50')}>{x.step.title}</button>)}</div>
    <Pre className="max-h-[480px]">{JSON.stringify(r.out.json, null, 2)}</Pre></>}</div>
    <div><h3 className="mb-2 text-[15px] font-semibold">Bundle tray</h3>{!bundle ? <Empty>No bundle yet.</Empty> : <BundleTray name={bundle[0]} b={bundle[1]} />}</div></div>;
}
export function BundleTray({ name, b }: { name: string; b: any }) {
  const slots: [string, string, boolean][] = [['Offer', b.offer?.id, !!b.offer], ['Consents', `${b.consents?.length ?? 0} signed`, (b.consents?.length ?? 0) >= 0], ['Binding', b.binding?.id, !!b.binding], ['Request', b.request?.id, !!b.request], ['Invoice', b.invoice, !!b.invoice], ['Preimage', b.preimage, !!b.preimage], ['Timestamp', b.anchor ? `block ${b.anchor.height}` : 'pending', !!b.anchor]];
  return <div><div className="mb-2 font-mono text-[11px] text-neutral-500">{name}</div><div className="grid grid-cols-2 gap-2">{slots.map(([k, v, ok]) => <div key={k} className={cx('rounded-md border p-2', ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-neutral-300')}><div className="text-[11px] font-semibold">{k}</div><div className="truncate font-mono text-[10px] text-neutral-500" title={v}>{short(v, 10) || '—'}</div></div>)}</div>
    <Button variant="outline" className="mt-3 w-full" onClick={() => { const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.json`; a.click(); }}>Download bundle JSON</Button></div>;
}
function PromptsTab({ sid }: { sid: string }) { const sc = session(sid).sc;
  return <div className="space-y-3"><h3 className="text-[15px] font-semibold">Example Prompts</h3><p className="text-[12px] text-neutral-500">Paste into your coding agent. Each assumes the protocol library and ends with real tests.</p>
    {sc.prompts.map(p => <Card key={p.title} className="p-3"><div className="mb-2 text-[13px] font-semibold">{p.title}</div><Pre>{p.prompt + ' Use only test keys and test wallets. Write vitest tests and a Playwright test that takes screenshots, then review them.'}</Pre></Card>)}</div>; }
