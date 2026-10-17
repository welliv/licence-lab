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
/** The game: attacks grouped by what they protect, plain titles, numbered 1 to 24 with no gaps, and the result shown only after you try. */
export const GAME: { id: string; title: string; line: string; attacks: [string, string][] }[] = [
  { id: 'song', title: 'Your song', line: 'Who may sell it, and for how much', attacks: [['A1', 'Change the price after Ava signed'], ['A2', 'Sign Ava\'s offer with your own account'], ['A3', 'Fake a co-owner\'s "yes"'], ['A14', 'Sell "Rain" first, as "Ava Official"']] },
  { id: 'money', title: 'Your money', line: 'Where the payment goes, and what it proves', attacks: [['A4', 'Reuse a paid receipt for a different use'], ['A5', 'Use a receipt for a different offer'], ['A10', 'Send the money to your own wallet'], ['A15', 'Leave a sale out of Jay\'s statement'], ['A18', 'Share a wallet server and take the money']] },
  { id: 'agent', title: 'Your agent', line: 'An agent that cannot be talked or tricked into overspending', attacks: [['A6', 'Charge the agent more than it agreed'], ['A7', 'Hide an order to AI agents in an offer'], ['A8', 'Make the agent buy 40 times at once'], ['A9', 'Lose the reply so the agent pays twice']] },
  { id: 'rights', title: 'Your rights', line: 'Withdrawn offers, stolen phones, sales and heirs', attacks: [['A13', 'Withdraw an offer an hour after a sale'], ['A12', 'Keep selling with a stolen account after a withdrawal'], ['A12b', 'Link a stolen account to a new wallet'], ['A12c', 'Keep selling after Ava moves to a new account'], ['A21', 'Sell the rights with a stolen old account'], ['A22', 'Sell the same rights twice'], ['A23', 'Keep selling from the old account after a sale'], ['A20', 'One heir takes over alone']] },
  { id: 'record', title: 'The record', line: 'Dates, privacy and search sites', attacks: [['A11', 'Backdate a licence'], ['A16', 'Follow one buyer\'s purchases'], ['A17', 'Hide a withdrawn offer at one search site']] },
];
export const GAME_ORDER = GAME.flatMap(g => g.attacks.map(([id]) => id));
export const plainTitle = (id: string) => GAME.flatMap(g => g.attacks).find(([x]) => x === id)?.[1] ?? attackById(id)?.title ?? id;
const OUTCOME: Record<string, string> = { blocked: 'Caught', limit: 'Honest limit', open: 'Got through (open issue)', passed: 'Got through' };
export function RedTeamIndex() {
  useVersion(); const sc = score.get(); const tried = Object.keys(sc).length; const caught = Object.values(sc).filter(x => x === 'blocked').length;
  return <div className="mx-auto max-w-[1100px] px-5 py-6 md:px-8"><h1 className="text-[24px] font-semibold">Try to break it</h1>
    <p className="mt-1 max-w-[700px] text-[15px] text-neutral-600">You are the cheat. Pick a trick and try it: it runs against the real checks. You only see what happens after you try.</p>
    <div className="mt-3 flex flex-wrap gap-2 text-[13px]" data-testid="game-score"><Pill className="bg-neutral-900 text-white">{tried} of {ATTACKS.length} tried</Pill><Pill className="border border-emerald-200 bg-emerald-50 text-emerald-800">{caught} caught</Pill><Pill className="border border-neutral-200">{tried - caught} not caught</Pill></div>
    <div className="mt-6 space-y-8">{GAME.map(g => <section key={g.id} data-game-group={g.id}><h2 className="text-[18px] font-semibold">{g.title}</h2><p className="text-[13px] text-neutral-500">{g.line}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{g.attacks.map(([id, title]) => { const a = attackById(id)!; const k = GAME_ORDER.indexOf(id) + 1; const out = sc[id];
        return <Card key={id} className="cursor-pointer p-4 hover:border-neutral-400" onClick={() => go(`attack/${id}`)} data-attack={id}><div className="flex items-center gap-2"><span className="w-7 text-[13px] font-semibold tabular-nums text-neutral-400">{k}</span><span className="text-lg">{a.emoji}</span><span className="font-medium">{title}</span>
          <span className="ml-auto">{out ? <Pill className={cx('border', OUT_STYLE[out])}>{OUTCOME[out]}</Pill> : <span className="text-[12px] text-neutral-400">Try it →</span>}</span></div></Card>; })}</div></section>)}</div></div>;
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
    <div className="flex flex-wrap items-center gap-2"><span className="text-2xl">{a.emoji}</span><h1 className="text-[20px] font-semibold">{GAME_ORDER.indexOf(a.id) + 1}. {plainTitle(a.id)}</h1></div>
    <p className="mt-1.5 text-[14px] text-neutral-600">{a.summary} {sc && <button className="text-sky-700 underline" onClick={() => go(sc.id)}>From: {sc.title}</button>}</p>
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
        <div className="mt-2 text-[11px]">{met ? `✓ The Lab expected this (${expectText(a)})` : a.tamper ? 'Your edit changed the outcome. Interesting! Read the checks to see why.' : `✗ The Lab expected ${expectText(a)}`}</div><div className="mt-1 text-[10px] opacity-70">Technical name: {a.id}, {a.title}</div></div>}
        <Card className="p-4"><div className="mb-2 text-[13px] font-semibold">verifyLicence</div><NineChecks v={res?.verdict} /></Card>
        {res && <Card className="p-4"><div className="mb-1 text-[13px] font-semibold">The lesson</div><p className="text-[13px] text-neutral-700">{a.lesson}</p>{a.mitigation && <p className="mt-2 text-[12px] text-neutral-500">Mitigation: {a.mitigation}</p>}</Card>}
        <Button variant="outline" className="w-full" data-testid="next-attack" onClick={() => { const i = GAME_ORDER.indexOf(a.id); go(`attack/${GAME_ORDER[(i + 1) % GAME_ORDER.length]}`); }}>Next attack<ArrowRight size={14} /></Button></div></div>
    {res?.verdict && <div className="mt-5"><Pre>{JSON.stringify(res.verdict.result, null, 2)}</Pre></div>}
  </div>;
}
