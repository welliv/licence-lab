import { useEffect, useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { ShieldAlert, RotateCcw, PenLine, Play, ArrowRight, Loader2 } from 'lucide-react';
import { ATTACKS, attackById, prepareAttack, present, meetsExpectation, type AttackOut } from '../engine/attacks';
import type { Lab, LicenceBundle } from '../engine/lab';
import { Button, Card, Pill, cx } from './bits';
import { go, score, useVersion } from './store';
import { NineChecks, Pre } from './tabs/Tabs';
import { byId } from '../scenarios';
const OUT_STYLE: Record<string, string> = { blocked: 'bg-emerald-50 text-emerald-800 border-emerald-200', limit: 'bg-amber-50 text-amber-800 border-amber-200', open: 'bg-orange-50 text-orange-800 border-orange-200', passed: 'bg-red-50 text-red-800 border-red-200' };
const expectText = (a: (typeof ATTACKS)[number]) => a.expect.kind === 'blocked' ? `blocked by ${a.expect.by}` : a.expect.kind === 'limit' ? 'an honest limit' : 'a known open issue';
export function RedTeamIndex() {
  useVersion(); const sc = score.get();
  return <div className="mx-auto max-w-[1100px] px-5 py-6 md:px-8"><h1 className="text-[20px] font-semibold">🗡️ Red team</h1>
    <p className="mt-1 text-[14px] text-neutral-600">Play Mallory. Every attack runs against the real verifier. You score a point for each one you try. {Object.keys(sc).length}/{ATTACKS.length} tried.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2">{ATTACKS.map(a => <Card key={a.id} className="cursor-pointer p-4 hover:border-neutral-400" onClick={() => go(`attack/${a.id}`)}><div className="flex items-center gap-2"><span className="text-lg">{a.emoji}</span><b>{a.id}</b><span className="font-medium">{a.title}</span><span className="ml-auto text-[11px] text-neutral-400">level {a.level}</span></div>
      <p className="mt-1 text-[13px] text-neutral-600">{a.summary}</p><div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500"><span>Expected: {expectText(a)}</span>{sc[a.id] && <Pill className={cx('ml-auto border', OUT_STYLE[sc[a.id]])}>{sc[a.id]}</Pill>}</div></Card>)}</div></div>;
}
export function AttackPage({ id }: { id: string }) {
  const a = attackById(id); const [lab, setLab] = useState<Lab | null>(null); const [honest, setHonest] = useState<LicenceBundle | null>(null); const [text, setText] = useState(''); const [res, setRes] = useState<AttackOut | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const load = async () => { if (!a) return; setRes(null); setErr(''); const p = await prepareAttack(a); setLab(p.lab); setHonest(p.honest); setText(p.tampered ? JSON.stringify(p.tampered, null, 2) : ''); };
  useEffect(() => { load(); }, [id]);
  if (!a) return <div className="p-8">No such attack.</div>;
  const parse = () => { try { return JSON.parse(text) as LicenceBundle; } catch (e: any) { setErr('Not valid JSON: ' + e.message); return null; } };
  const go1 = async () => { if (!lab) return; setBusy(true); setErr(''); try { let o: AttackOut; if (a.tamper) { const b = parse(); if (!b) return; o = await present(lab, b); } else { const p = await prepareAttack(a); setLab(p.lab); o = await a.run!(p.lab); }
    setRes(o); score.set(a.id, o.outcome); } finally { setBusy(false); } };
  const resignOffer = () => { const b = parse(); if (!b || !lab) return; const { kind, tags, content, created_at } = b.offer as any; b.offer = finalizeEvent({ kind, tags, content, created_at }, lab.key('mallory')) as any; setText(JSON.stringify(b, null, 2)); };
  const sc = byId(a.scenario); const met = res ? meetsExpectation(a, res) : null;
  return <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8">
    <div className="flex flex-wrap items-center gap-2"><span className="text-2xl">{a.emoji}</span><h1 className="text-[20px] font-semibold">{a.id}: {a.title}</h1><Pill className="bg-neutral-900 text-white">level {a.level}</Pill><Pill className="border border-neutral-300">expected: {expectText(a)}</Pill></div>
    <p className="mt-1.5 text-[14px] text-neutral-600">{a.summary} {sc && <button className="text-sky-700 underline" onClick={() => go(sc.id)}>From scenario {sc.n}: {sc.title}</button>}</p>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
      <Card className="p-4"><div className="mb-2 flex items-center gap-2"><span className="text-lg">🦹</span><b>Mallory</b><span className="text-[12px] text-neutral-500">{a.how}</span></div>
        {a.tamper ? <><div className="mb-1 text-[11px] text-neutral-500">Tamper editor: a bundle from an honest purchase by Mia, already changed by the attack. Edit anything.</div>
          <textarea aria-label="Tamper editor" spellCheck={false} value={text} onChange={e => setText(e.target.value)} className="scroll-thin h-[420px] w-full rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11.5px] leading-[1.5]" />
          <div className="mt-2 flex flex-wrap gap-2"><Button variant="danger" disabled={busy} onClick={go1}>{busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}Present to the verifier</Button>
            <Button variant="outline" onClick={resignOffer}><PenLine size={14} />Re-sign the offer as Mallory</Button><Button variant="ghost" onClick={() => honest && setText(JSON.stringify(honest, null, 2))}><RotateCcw size={14} />Reset to honest bundle</Button><Button variant="ghost" onClick={load}>Reload attack</Button></div>
          {err && <div className="mt-2 text-[12px] text-red-700">{err}</div>}</>
          : <><p className="text-[13px] text-neutral-600">This attack is about behaviour (agents, wallets, nodes or indexes), so it runs as a script against the Lab world rather than an editable bundle.</p><Button variant="danger" className="mt-3 w-full" disabled={busy || !lab} onClick={go1}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}Run the attack</Button></>}
        {res?.trace && <ul className="mt-3 space-y-0.5 rounded-md bg-neutral-50 p-2 font-mono text-[11px]">{res.trace.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      </Card>
      <div className="space-y-4">{res && <div className={cx('fade-in rounded-xl border p-4', OUT_STYLE[res.outcome])}><div className="text-[12px] font-semibold uppercase tracking-wide">{res.outcome === 'blocked' ? `Blocked${res.by ? ' by ' + res.by : ''}` : res.outcome === 'passed' ? 'It got through' : res.outcome === 'open' ? 'Open issue: it got through' : 'Honest limit'}</div><div className="mt-1 text-[13px]">{res.summary}</div>
        <div className="mt-2 text-[11px]">{met ? '✓ matches what the Lab expects' : a.tamper ? 'Your edit changed the outcome. Interesting! Read the checks to see why.' : '✗ does not match the expected outcome'}</div></div>}
        <Card className="p-4"><div className="mb-2 text-[13px] font-semibold">verifyLicence</div><NineChecks v={res?.verdict} /></Card>
        {res && <Card className="p-4"><div className="mb-1 text-[13px] font-semibold">The lesson</div><p className="text-[13px] text-neutral-700">{a.lesson}</p>{a.mitigation && <p className="mt-2 text-[12px] text-neutral-500">Mitigation: {a.mitigation}</p>}</Card>}
        <Button variant="outline" className="w-full" onClick={() => { const i = ATTACKS.indexOf(a); go(`attack/${ATTACKS[(i + 1) % ATTACKS.length].id}`); }}>Next attack<ArrowRight size={14} /></Button></div></div>
    {res?.verdict && <div className="mt-5"><Pre>{JSON.stringify(res.verdict.result, null, 2)}</Pre></div>}
  </div>;
}
