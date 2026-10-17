import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, FastForward, Link2, AlertTriangle, ArrowRight, ArrowLeft, Loader2, CheckCircle2, XCircle, ShieldAlert, ChevronDown, Code2 } from 'lucide-react';
import { GUIDE, WALK, guideOf, moreOf, groupTitle } from './guide';
import { byId } from '../scenarios';
import { Ticker } from './story/Path';
import { session, setUpParty, resetParty, resetScenario, runNext, runAt, setInput, useVersion, ensureLab, go, doneSet, lastRun } from './store';
import { Avatar, Bulb, Button, Card, CopyField, Pill, TierBadge, cx } from './bits';
import { persona } from '../engine/cast';
import { short } from '../engine/lab';
import { asExpected, type StepRun } from '../engine/runner';
import type { Step } from '../scenarios';
import { Tabs } from './tabs/Tabs';
import { attackById } from '../engine/attacks';

const usd$ = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const SATS_TO_CENTS = 5; // the Lab's demo rate: 1 test sat = $0.05 (see src/ui/money.ts)
const noWallet = (id: string) => { const r = persona(id).role; return r === 'infra' || r === 'checker'; };
/** One plain line for a step run: who paid whom, or what happened. */
export function moneyLine(delta: Record<string, number> | undefined): string | null {
  if (!delta) return null; const e = Object.entries(delta).filter(([k]) => !noWallet(k)); const out = e.filter(([, d]) => d < 0); const inn = e.filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
  if (!out.length || !inn.length) return null; const total = -out.reduce((a, [, d]) => a + d, 0);
  return `${out.map(([k]) => persona(k).name).join(' and ')} paid ${usd$(total * SATS_TO_CENTS)}: ${inn.map(([k, d]) => `${persona(k).name} ${usd$(d * SATS_TO_CENTS)}`).join(', ')}`;
}
export function ScenarioPage({ id, autorun = 0 }: { id: string; autorun?: number }) {
  useVersion(); const s = session(id); const sc = s.sc; const allReady = sc.cast.every(p => s.ready.has(p)); const g = guideOf(id); const m = moreOf(id);
  const done = doneSet(s); const allDone = done.size === sc.steps.length; const nextIdx = sc.steps.findIndex(x => !done.has(x.id)); const [tab, setTab] = useState('what'); const [proof, setProof] = useState(false);
  useEffect(() => { (allReady ? ensureLab(s) : setUpParty(id, 'all')).then(() => { if (autorun && done.size < autorun) runNext(id, autorun); }); }, [id]);
  const share = () => { const k = nextIdx < 0 ? sc.steps.length : nextIdx; const u = `${location.origin}${location.pathname}#/${id}?run=${k}`; navigator.clipboard?.writeText(u); alert('Link copied. It replays this scenario up to step ' + k + ' (with fresh test keys).'); };
  const w = WALK.indexOf(id); const prev = w > 0 ? WALK[w - 1] : null; const next = w >= 0 && w < WALK.length - 1 ? WALK[w + 1] : null;
  const label = (x: string) => guideOf(x) ? `${guideOf(x)!.n}. ${guideOf(x)!.title}` : moreOf(x)?.title ?? byId(x)?.title ?? x;
  const title = g?.title ?? m?.title ?? sc.title; const line = g?.line ?? sc.summary;
  const stepLabel = (st: Step) => { const who = persona(st.actor).name; const t = g?.steps?.[st.id] ?? st.title.replace(new RegExp(`^${who}('s)?\\s+`), ''); return `${who}: ${t.charAt(0).toLowerCase()}${t.slice(1)}`; };
  const log = s.runs.map((r, k) => ({ k, r, i: sc.steps.indexOf(r.step) }));
  return <div className="mx-auto max-w-[860px] px-5 py-6 md:px-8 md:py-8" data-testid="guide-page" data-scenario={id}>
    <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400" data-testid="guide-where">{g ? `${groupTitle(g.group)} · ${g.n} of ${GUIDE.length}` : 'More scenarios'}</div>
    <h1 className="mt-1.5 flex items-center gap-2 text-[26px] font-bold tracking-tight md:text-[32px]"><span aria-hidden>{sc.emoji}</span>{title}</h1>
    <p className="mt-1.5 text-[16px] leading-7 text-neutral-600" data-testid="guide-line">{line}</p>
    {/* Who is involved: wallet cards in dollars, visible before acting */}
    <Wallets sid={id} />
    {/* Numbered steps, one button each, named by who acts */}
    <div className="mt-6 flex items-baseline gap-2"><h2 className="text-[17px] font-semibold">Steps</h2><span className="text-[13px] text-neutral-500">{done.size} of {sc.steps.length} done</span>
      <button className="ml-auto text-[13px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900 disabled:opacity-40" disabled={s.busy || !done.size} onClick={() => resetScenario(id)} data-testid="reset">Start again</button></div>
    {!s.lab && <div className="mt-3 flex items-center gap-2 text-neutral-500"><Loader2 className="animate-spin" size={14} />Getting everyone ready…</div>}
    <ol className="mt-3 space-y-2" data-testid="steps">{sc.steps.map((st, i) => { const r = lastRun(s, st.id); const ok = r && !r.guard; const tryIt = st.expectFail || st.openIssue; const isNext = i === nextIdx; const expected = ok ? asExpected(st, r!.out) : false;
      return <li key={st.id} data-testid={`step-row-${st.id}`} data-state={ok ? 'done' : isNext ? 'next' : 'open'} className={cx('rounded-2xl border bg-white p-3 sm:p-4', isNext && !s.busy ? 'border-neutral-900' : 'border-neutral-200')}>
        <div className="flex items-center gap-3"><span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold', ok ? (expected ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-neutral-100 text-neutral-600')}>{ok ? (expected ? <CheckCircle2 size={15} /> : <XCircle size={15} />) : i + 1}</span>
          <button data-testid={`do-${st.id}`} disabled={!s.lab || s.busy} onClick={() => runAt(id, i)} className={cx('min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-[15px] font-medium transition-colors disabled:cursor-not-allowed', ok ? 'text-neutral-700 hover:bg-neutral-50' : isNext ? (tryIt ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-neutral-900 text-white hover:bg-neutral-800') : tryIt ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'border border-neutral-200 hover:bg-neutral-50')}>
            {s.busy && isNext ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : null}{stepLabel(st)}</button>
          {ok && <span className="hidden text-[12px] text-neutral-400 sm:inline">again</span>}</div>
        {r && <p className={cx('fade-in ml-10 mt-1.5 text-[14px]', !r.guard && plainResult(st, r) === 'Done.' && 'sr-only', r.guard ? 'text-amber-700' : expected ? 'text-neutral-600' : 'text-red-700')} data-testid={`said-${st.id}`}>{r.guard ? r.out.summary : plainResult(st, r)}</p>}
      </li>; })}</ol>
    {/* Live log: who paid whom */}
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4" data-testid="log"><h2 className="text-[15px] font-semibold">Log</h2>
      {!log.length ? <p className="mt-1 text-[14px] text-neutral-500">Nothing yet. Press step 1.</p> : <ol className="mt-2 space-y-1.5">{log.map(({ k, r, i }) => { const money = moneyLine(r.delta); return <li key={k} className="flex items-start gap-2 text-[14px]"><span className="w-5 shrink-0 text-right tabular-nums text-neutral-400">{i + 1}</span>
        <span className={cx(r.guard ? 'text-amber-700' : 'text-neutral-700')}>{money ? <><b>{money}</b></> : <>{stepLabel(r.step)} {r.guard ? '(not yet)' : r.step.openIssue ? '(open issue)' : r.step.expectFail ? (asExpected(r.step, r.out) ? '— stopped ✓' : '— got through ✗') : asExpected(r.step, r.out) ? '✓' : '✗'}</>}</span></li>; })}</ol>}</section>
    {/* Result */}
    {allDone && <section className="fade-in mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid="result"><div className="flex items-center gap-2 text-[18px] font-bold text-emerald-700"><CheckCircle2 size={20} />Done</div><p className="mt-1 text-[15px] text-neutral-700">{g?.result ?? sc.proven}</p></section>}
    {/* Everything technical, behind one tap */}
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white"><button onClick={() => setProof(!proof)} aria-expanded={proof} data-testid="see-proof" className="flex w-full items-center gap-2 px-4 py-3.5 text-[15px] font-medium text-neutral-700 hover:text-neutral-900"><Code2 size={15} className="text-neutral-400" />See the proof / code<ChevronDown size={16} className={cx('ml-auto transition-transform', proof && 'rotate-180')} /></button>
      {proof && <div className="fade-in border-t border-neutral-200 p-4" data-testid="proof-panel">
        <div className="flex flex-wrap items-center gap-2 text-[13px]"><Pill className="bg-rain-50 text-rain-600 ring-1 ring-rain-100">S{sc.n} · {sc.status}</Pill><span className="font-semibold">{sc.title}</span><span className="text-neutral-500">{sc.complexity}</span></div>
        <p className="mt-2 text-[13px] text-neutral-600">{sc.summary} {sc.education}</p><ul className="mt-2 space-y-1 text-[13px] text-neutral-600">{sc.how.map(h => <li key={h.title}><b>{h.title}.</b> {h.description}</li>)}</ul>
        <p className="mt-2 text-[12px] text-neutral-500">Dollars use the Lab's demo rate, 1 test sat = $0.05. Balances below are in test sats.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={!s.lab || s.busy || allDone} onClick={() => runNext(id, sc.steps.length)}><FastForward size={14} />Run all steps</Button><Button variant="ghost" disabled={!done.size} onClick={share}><Link2 size={14} />Share this run</Button></div>
        <CastStrip sid={id} />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">{sc.steps.map((st, i) => { const r = lastRun(s, st.id); return <StepCard key={st.id} sid={id} step={st} index={i} run={r} state={!s.lab ? 'locked' : r && !r.guard ? 'done' : i === nextIdx ? 'next' : 'open'} busy={s.busy} />; })}</div>
        {allDone && <Outcome sid={id} />}
        <div className="mt-6"><Tabs sid={id} tab={tab} setTab={setTab} /></div>
      </div>}</div>
    {/* Walk the list in order */}
    <nav className="mt-6 flex items-stretch gap-3" aria-label="Previous and next scenario">
      {prev ? <button onClick={() => go(prev)} data-testid="prev" className="flex flex-1 flex-col items-start rounded-2xl border border-neutral-200 px-4 py-3 text-left hover:border-neutral-900"><span className="flex items-center gap-1 text-[12px] text-neutral-500"><ArrowLeft size={12} />Previous</span><span className="text-[14px] font-semibold">{label(prev)}</span></button> : <button onClick={() => go('hood')} data-testid="prev" className="flex flex-1 flex-col items-start rounded-2xl border border-neutral-200 px-4 py-3 text-left hover:border-neutral-900"><span className="flex items-center gap-1 text-[12px] text-neutral-500"><ArrowLeft size={12} />Back</span><span className="text-[14px] font-semibold">Under the hood</span></button>}
      {next && <button onClick={() => go(next)} data-testid="next-item" className={cx('flex flex-1 flex-col items-end rounded-2xl border px-4 py-3 text-right hover:border-neutral-900', allDone ? 'border-neutral-900' : 'border-neutral-200')}><span className="flex items-center gap-1 text-[12px] text-neutral-500">Next<ArrowRight size={12} /></span><span className="text-[14px] font-semibold">{label(next)}</span></button>}
    </nav>
  </div>;
}
/** A plain result for one step: money moved, stopped as it should be, or done. The library's own words stay in the proof panel. */
function plainResult(st: Step, r: StepRun): string {
  const money = moneyLine(r.delta); const ok = asExpected(st, r.out);
  if (st.openIssue) return 'Known open issue: the protocol does not stop this yet. See the proof for why.';
  if (st.expectFail) return ok ? 'Stopped, as it should be.' : 'It got through. See the proof.';
  if (!ok) return 'That did not work. See the proof for the reason.';
  return money ?? 'Done.';
}
/** Who is involved: one card per person or company, with their test money in dollars. People who were paid during the run join the row. */
function Wallets({ sid }: { sid: string }) {
  useVersion(); const s = session(sid); const lab = s.lab; const joined = new Set<string>(); s.runs.forEach(r => Object.keys(r.delta ?? {}).forEach(k => joined.add(k)));
  const ids = [...new Set([...s.sc.cast, ...joined])].filter(k => persona(k).name !== k || s.sc.cast.includes(k));
  return <section className="mt-5" data-testid="wallet-cards" aria-label="Who is involved"><h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Who is involved</h2>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{ids.map(k => { const p = persona(k); const cents = lab ? (lab.balances[k] ?? 0) * SATS_TO_CENTS : null;
      return <div key={k} data-testid={`wallet-card-${k}`} data-cents={cents ?? ''} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5"><span className="text-[22px] leading-none" aria-hidden>{p.emoji}</span><span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{p.name}</span>
        <span className="block text-[13px] text-neutral-500">{noWallet(k) ? 'checks, no wallet' : cents === null ? '…' : <Ticker cents={cents} />}</span></span></div>; })}</div></section>;
}
function StepCard({ sid, step, index, run, state, busy }: { sid: string; step: Step; index: number; run?: StepRun; state: 'done' | 'next' | 'open' | 'locked'; busy: boolean }) {
  const s = session(sid); const actor = persona(step.actor); const to = step.to ? persona(step.to) : null;
  const tryIt = step.expectFail || step.openIssue; const expected = run && !run.guard ? asExpected(step, run.out) : false; const editable = state !== 'locked';
  return <Card className={cx('flex flex-col p-4', state === 'locked' && 'opacity-60', state === 'next' && 'ring-2 ring-neutral-900/80')} data-testid={`step-${step.id}`}>
    <div className="flex items-center gap-2"><span className="text-[11px] font-mono text-neutral-400">{index + 1}</span><span className="text-lg">{actor.emoji}</span><span className="font-semibold">{actor.name}: {step.title}</span>
      {tryIt && <Pill className={step.openIssue ? 'bg-orange-100 text-orange-800' : 'bg-red-50 text-red-700'}>{step.openIssue ? 'open issue' : 'try it'}</Pill>}</div>
    <p className="mt-2 text-[13px] leading-5 text-neutral-600">{step.narration}</p>
    {step.inputs?.map(inp => <label key={inp.key} className="mt-3 block"><span className="text-[11px] text-neutral-500">{inp.label}</span>
      {inp.type === 'select' ? <select disabled={!editable} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13px]" value={s.inputs[step.id]?.[inp.key] ?? inp.default} onChange={e => setInput(sid, step.id, inp.key, e.target.value)}>{inp.options!.map(o => <option key={o}>{o}</option>)}</select>
        : <input disabled={!editable} type={inp.type} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13px] disabled:bg-neutral-50" value={s.inputs[step.id]?.[inp.key] ?? inp.default} onChange={e => setInput(sid, step.id, inp.key, e.target.value)} />}
      {inp.hint && <span className="text-[11px] text-neutral-400">{inp.hint}</span>}</label>)}
    <div className="mt-auto pt-3">{(!run || run.guard) && <Button variant={state === 'next' ? (tryIt ? 'danger' : 'primary') : 'outline'} className="w-full" disabled={state === 'locked' || busy} onClick={() => runAt(sid, index)}>{busy && state === 'next' ? <Loader2 size={14} className="animate-spin" /> : tryIt ? <ShieldAlert size={14} /> : <Play size={14} />}{step.button}</Button>}
      {run?.guard && <div className="fade-in mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[12px] text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{run.out.summary}</div>}
      {run && !run.guard && <div className="fade-in space-y-2 border-t border-neutral-100 pt-3">
        <div className={cx('flex items-start gap-2 text-[13px]', run.out.badge === 'open' ? 'text-orange-700' : run.out.badge === 'limit' ? 'text-amber-700' : expected ? 'text-emerald-700' : 'text-red-700')}>
          {expected ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}<span className={cx(!run.out.ok && step.expectFail && 'bounce-x')}>{step.openIssue ? 'Known open issue: ' : step.expectFail ? 'Stopped, as it should be: ' : ''}{run.out.summary}</span><span className="ml-auto"><TierBadge b={run.out.badge} /></span></div>
        {run.out.trace && <ul className="space-y-0.5 rounded-md bg-neutral-50 p-2 font-mono text-[11px] text-neutral-700">{run.out.trace.map((t, i) => <li key={i} className={cx(t.startsWith('✗') && 'text-red-700', t.includes('IGNORED') && 'line-through decoration-red-400')}>{t}</li>)}</ul>}
        {run.out.verdict && <MiniChecks v={run.out.verdict} />}
        {run.out.fields?.slice(0, 5).map((f, i) => <CopyField key={i} label={f.label} value={f.value} mono={f.mono} />)}
        <div className="flex items-center text-[11px] text-neutral-400">{to && <span>→ {to.emoji} sent to {to.name} · {run.ms.toFixed(0)} ms</span>}<button disabled={busy} onClick={() => runAt(sid, index)} className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-neutral-100 hover:text-neutral-700"><RotateCcw size={11} />Do it again</button></div>
      </div>}</div>
  </Card>;
}
export function MiniChecks({ v }: { v: NonNullable<StepRun['out']['verdict']> }) {
  return <div className="flex items-center gap-1" title={v.checks.map(c => `${c.n}. ${c.label}: ${c.status}${c.detail ? ' (' + c.detail + ')' : ''}`).join('\n')}>
    {v.checks.map(c => <span key={c.n} className={cx('flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold', c.status === 'pass' ? 'bg-emerald-500 text-white' : c.status === 'fail' ? 'bg-red-500 text-white' : c.status === 'skip' ? 'bg-neutral-200 text-neutral-500' : 'bg-neutral-100 text-neutral-400')}>{c.n}</span>)}
    <span className="ml-1 text-[11px] text-neutral-500">{v.passed}/{v.checks.length} checks</span></div>;
}
function Outcome({ sid }: { sid: string }) {
  const sc = session(sid).sc;
  return <Card className="fade-in mt-5 grid gap-5 p-5 md:grid-cols-3">
    <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-emerald-700">What is proven</div><p className="text-[13px] text-neutral-700">{sc.proven}</p></div>
    <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-red-700">What can go wrong</div><ul className="space-y-1.5">{sc.canGoWrong.map((c, i) => <li key={i} className="flex items-center gap-2 text-[13px] text-neutral-700">{c.attack ? <button onClick={() => go(`attack/${c.attack}`)} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100">Try {c.attack}<ArrowRight size={11} /></button> : <span className="text-neutral-300">•</span>}<span>{c.text}{c.attack && attackById(c.attack) ? '' : ''}</span></li>)}</ul></div>
    <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-amber-700">Honest limits</div>{sc.limits?.length ? <ul className="list-disc space-y-1 pl-4 text-[13px] text-neutral-700">{sc.limits.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p className="text-[13px] text-neutral-500">None special to this scenario. See Production for what is simulated.</p>}</div>
  </Card>;
}
/** Proof panel: the cast with balances in test sats and today's budget use. */
function CastStrip({ sid }: { sid: string }) {
  useVersion(); const s = session(sid); const lab = s.lab;
  return <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="cast-strip">{s.sc.cast.map(party => { const p = persona(party); const bal = lab ? lab.balances[party] ?? 0 : null; const nwc = lab?.nwc[party];
    return <span key={party} title={`${p.name}: ${p.blurb}${nwc ? ` Budget used today: ${nwc.spentTodaySat.toLocaleString('en-GB')} of ${nwc.dailyCapSat.toLocaleString('en-GB')} sats.` : ''}`} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px]">
      <span>{p.emoji}</span><span className="font-medium">{p.name}</span>{!noWallet(party) && <span className="tabular-nums text-neutral-500">{bal === null ? '…' : `${bal.toLocaleString('en-GB')} sats`}</span>}</span>; })}</div>;
}
