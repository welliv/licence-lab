import { useEffect, useRef, useState } from 'react';
import { Rocket, MoreVertical, Play, RotateCcw, FastForward, Link2, AlertTriangle, ArrowRight, Loader2, CheckCircle2, XCircle, ShieldAlert, KeyRound } from 'lucide-react';
import { session, setUpParty, resetParty, resetScenario, runNext, runAt, setInput, useVersion, ensureLab, go, doneSet, lastRun } from './store';
import { Avatar, Bulb, Button, Card, CopyField, Pill, TierBadge, cx } from './bits';
import { persona } from '../engine/cast';
import { short } from '../engine/lab';
import { asExpected, type StepRun } from '../engine/runner';
import type { Step } from '../scenarios';
import { Tabs } from './tabs/Tabs';
import { attackById } from '../engine/attacks';

export function ScenarioPage({ id, autorun = 0 }: { id: string; autorun?: number }) {
  useVersion(); const s = session(id); const sc = s.sc; const allReady = sc.cast.every(p => s.ready.has(p));
  const done = doneSet(s); const allDone = done.size === sc.steps.length; const nextIdx = sc.steps.findIndex(x => !done.has(x.id)); const [tab, setTab] = useState('what'); const tabsRef = useRef<HTMLDivElement>(null);
  // No set-up gate: the cast is set up silently when the page opens.
  useEffect(() => { (allReady ? ensureLab(s) : setUpParty(id, 'all')).then(() => { if (autorun && done.size < autorun) runNext(id, autorun); }); }, [id]);
  const share = () => { const k = nextIdx < 0 ? sc.steps.length : nextIdx; const u = `${location.origin}${location.pathname}#/${id}?run=${k}`; navigator.clipboard?.writeText(u); alert('Link copied. It replays this scenario up to step ' + k + ' (with fresh test keys).'); };
  return <div className="mx-auto max-w-[1180px] px-5 py-5 md:px-8">
    <div className="flex flex-wrap items-center gap-2"><span className="text-2xl">{sc.emoji}</span><h1 className="text-[20px] font-semibold tracking-tight">{sc.title}</h1>
      <Pill className="bg-rain-50 text-rain-600 ring-1 ring-rain-100">S{sc.n} · {sc.status}</Pill></div>
    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[14px] text-neutral-600">{sc.summary}
      <Bulb><div className="mb-2 font-semibold text-neutral-900">How it works</div><p className="mb-3">{sc.education}</p><ul className="space-y-2">{sc.how.map(h => <li key={h.title}><b>{h.title}.</b> {h.description}</li>)}</ul><p className="mt-3 text-[12px] text-neutral-500">Situation: {sc.situation}</p></Bulb>
</p>
    <CastStrip sid={id} />
    {<>
      <div className="mt-5 flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-semibold">Steps</h2><span className="text-[12px] text-neutral-500">{done.size}/{sc.steps.length} done</span>
        <div className="ml-auto flex flex-wrap gap-2"><Button variant="outline" disabled={!s.lab || s.busy || allDone} onClick={() => runNext(id, sc.steps.length)}><FastForward size={14} />Run all steps</Button>
          <Button variant="outline" disabled={s.busy} onClick={() => resetScenario(id)}><RotateCcw size={14} />Reset scenario</Button><Button variant="ghost" disabled={!done.size} onClick={share}><Link2 size={14} />Share this run</Button></div></div>
      {!s.lab && <div className="mt-3 flex items-center gap-2 text-neutral-500"><Loader2 className="animate-spin" size={14} />Getting everyone ready…</div>}
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">{sc.steps.map((st, i) => { const r = lastRun(s, st.id); return <StepCard key={st.id} sid={id} step={st} index={i} run={r} state={!s.lab ? 'locked' : r && !r.guard ? 'done' : i === nextIdx ? 'next' : 'open'} busy={s.busy} />; })}</div>
      {allDone && <Outcome sid={id} />}
    </>}
    <div ref={tabsRef} className="mt-8"><Tabs sid={id} tab={tab} setTab={setTab} /></div>
  </div>;
}

/** One line for the whole cast: who is in this scenario and their test balance. Details on hover. */
function CastStrip({ sid }: { sid: string }) {
  useVersion(); const s = session(sid); const lab = s.lab;
  return <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="cast-strip" aria-label="Who is in this scenario">{s.sc.cast.map(party => { const p = persona(party); const infra = p.role === 'infra' || p.role === 'checker'; const bal = lab ? lab.balances[party] ?? 0 : null; const nwc = lab?.nwc[party];
    return <span key={party} title={`${p.name}: ${p.blurb}${nwc ? ` Budget used today: ${nwc.spentTodaySat.toLocaleString('en-GB')} of ${nwc.dailyCapSat.toLocaleString('en-GB')} sats.` : ''}`} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px]">
      <span>{p.emoji}</span><span className="font-medium">{p.name}</span>{!infra && <span className="tabular-nums text-neutral-500">{bal === null ? '…' : `${bal.toLocaleString('en-GB')} sats`}</span>}</span>; })}
    <span className="text-[11px] text-neutral-400">test money only</span></div>;
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
    <span className="ml-1 text-[11px] text-neutral-500">{v.passed}/9 checks</span></div>;
}
function Outcome({ sid }: { sid: string }) {
  const sc = session(sid).sc;
  return <Card className="fade-in mt-5 grid gap-5 p-5 md:grid-cols-3">
    <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-emerald-700">What is proven</div><p className="text-[13px] text-neutral-700">{sc.proven}</p></div>
    <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-red-700">What can go wrong</div><ul className="space-y-1.5">{sc.canGoWrong.map((c, i) => <li key={i} className="flex items-center gap-2 text-[13px] text-neutral-700">{c.attack ? <button onClick={() => go(`attack/${c.attack}`)} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100">Try {c.attack}<ArrowRight size={11} /></button> : <span className="text-neutral-300">•</span>}<span>{c.text}{c.attack && attackById(c.attack) ? '' : ''}</span></li>)}</ul></div>
    <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-amber-700">Honest limits</div>{sc.limits?.length ? <ul className="list-disc space-y-1 pl-4 text-[13px] text-neutral-700">{sc.limits.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p className="text-[13px] text-neutral-500">None special to this scenario. See Production for what is simulated.</p>}</div>
  </Card>;
}
