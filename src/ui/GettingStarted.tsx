import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button, Card, Cover, Player, cx } from './bits';
import { CAST } from '../engine/cast';
import { SCENARIOS, PARTS } from '../scenarios';
import { go } from './store';
const MAIN = ['ava', 'echo', 'jay', 'nova', 'lena', 'mia', 'sam', 'streamco', 'clipai', 'scout', 'kai', 'modelco', 'mallory'];
const SLIDES = [
  { t: 'Meet Ava and "Rain"', body: <><p>Ava is an independent artist. She made a song called "Rain" with Jay (producer), Nova (featured singer) and Lena (songwriter).</p><p className="mt-2">She wants anyone, or any AI agent, to be able to license it in seconds, pay with Bitcoin over Lightning, and get proof that cannot be faked.</p></>, art: true },
  { t: 'Six signed parts make a licence', body: <><p>An <b>offer</b> signed by Ava, <b>consents</b> from each co-owner, a <b>binding</b> that ties Ava's key to her Lightning node, the buyer's <b>request</b>, a Lightning <b>invoice</b> that commits to that request, and the <b>preimage</b> you get when you pay.</p><p className="mt-2">Anyone can check the bundle with nine checks. No company has to be trusted, and no one has to be online.</p></> },
  { t: 'How to use this Lab', body: <><p>Pick a scenario on the left. Set up the parties, then press each step's button. Every step shows its log, the flow between people, the code that ran and the checks.</p><p className="mt-2">Signatures, invoices and checks are <b>real</b>. Money, relays and Bitcoin blocks are <b>simulated</b>. Try to break it in the <b>Red team</b> section.</p></> },
];
export function GettingStarted() {
  const [i, setI] = useState(0); const s = SLIDES[i];
  return <div className="mx-auto max-w-[920px] px-5 py-8 md:px-8">
    <h1 className="text-[22px] font-semibold tracking-tight">👋 Getting Started</h1><p className="mt-1 text-[14px] text-neutral-600">An interactive sandbox for the open music-licence protocol on Nostr, Lightning and Bitcoin.</p>
    <Card className="mt-5 p-6"><div className="flex flex-col gap-6 md:flex-row md:items-center">{s.art && <div className="flex shrink-0 flex-col items-center gap-3"><Cover size={150} /><Player /></div>}
      <div className="flex-1"><div className="text-[18px] font-semibold">{s.t}</div><div className="mt-2 text-[14px] leading-6 text-neutral-700">{s.body}</div></div></div>
      <div className="mt-6 flex items-center justify-between"><Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft size={14} />Back</Button>
        <div className="flex gap-1.5">{SLIDES.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={cx('h-2 w-2 rounded-full', k === i ? 'bg-neutral-900' : 'bg-neutral-300')} />)}</div>
        {i < SLIDES.length - 1 ? <Button onClick={() => setI(i + 1)}>Next<ArrowRight size={14} /></Button> : <Button onClick={() => go('s1')}>Start with scenario 1<ArrowRight size={14} /></Button>}</div></Card>
    <h2 className="mb-3 mt-8 text-[15px] font-semibold">The cast</h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{MAIN.map(id => { const p = CAST[id]; return <Card key={id} className="p-3"><div className="flex items-center gap-2"><span className="text-xl">{p.emoji}</span><b>{p.name}</b></div><div className="mt-1 text-[12px] text-neutral-500">{p.blurb}</div></Card>; })}</div>
    <h2 className="mb-3 mt-8 text-[15px] font-semibold">All 24 scenarios</h2>
    <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4, 5].map(part => <div key={part}><div className="mb-1 text-[12px] font-medium text-neutral-400">{part}. {PARTS[part]}</div>{SCENARIOS.filter(x => x.part === part).map(x => <button key={x.id} onClick={() => go(x.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-neutral-100"><span>{x.emoji}</span><span className="flex-1">{x.n}. {x.title}</span><span className="text-[11px] text-neutral-400">{x.complexity}</span></button>)}</div>)}</div>
  </div>;
}
