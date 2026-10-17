// ONE template for all 11 scenarios: header, who is involved, the song card, steps, result, tabs.
import { useEffect, useMemo, useRef } from 'react';
import { Check, Minus, Plus, Play, Pause, Music2, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { CAST, SONGS, SONG_LIST, PLAN, usd, usd0, type Id, type SongId } from './data/cast';
import { SCENARIOS, s1Result } from './data/scenarios';
import type { Scenario, Step } from './types';
import { world, runStep, notices, loadEngine, warmFor } from './actions';
import { useWorld } from './world';
import { Rich, TermScope, newScope, WalletCard, Primary, Secondary } from './parts';
import { music, useMusic } from './music';
import { Tabs } from './tabs';
import { go } from './route';

export function ScenarioPage({ sc, tab }: { sc: Scenario; tab?: string }) {
  useWorld(world); const scope = useMemo(newScope, [sc.id]); const f = world.s.f;
  const steps = sc.steps.filter(s => !s.hidden); const complete = world.complete(sc.id);
  const firstRun = sc.id === 's1' && !f.firstRunSeen;
  const result = sc.id === 's1' ? s1Result(world.ctx()) : sc.result;
  const cast = sc.id === 's1' ? s1Cast(f.s1Song) : sc.cast;
  // Make the free test wallets for this page's real payment in the background, so the tap only pays.
  useEffect(() => { const go = () => warmFor(sc.id); const t = setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 3000 }) : go()), 1200);
    addEventListener('pointerdown', go, { once: true }); return () => { clearTimeout(t); removeEventListener('pointerdown', go); }; }, [sc.id, f.s1Round]);
  return <TermScope.Provider value={scope}>
    <article className="mx-auto w-full max-w-[860px] px-4 pb-10 pt-3 md:px-8 md:pt-8" aria-labelledby="sc-title">
      {firstRun && <p className="fade-in mb-2 rounded-xl bg-panel2 px-3 py-2 text-[14px] text-soft">Meet Alice, an artist, and Bob's agent, who buys music for Bob.</p>}
      <div className="text-[12px] font-semibold tracking-wide text-mute">{sc.group} · {sc.n} of 11</div>
      <h1 id="sc-title" className="mt-0.5 text-[24px] font-bold leading-tight md:text-[28px]"><span aria-hidden className="mr-1.5">{sc.emoji}</span>{sc.title}</h1>
      <p className="mt-1 text-[15px] text-soft md:text-[16px]"><Rich text={sc.sentence} /></p>
      <section aria-label="Who is involved" className="mt-3">
        <h2 className="sr-only">Who is involved</h2>
        <div className="noscroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">{cast.map(id => <WalletCard key={id} id={id} compact />)}</div>
      </section>
      {sc.card === 'song1' && <SongCard />}{sc.card === 'three' && <ThreeCard />}{sc.card === 'catalogue' && <CatalogueCard />}
      <ol className="mt-3 space-y-2" aria-label="Steps">{steps.map((s, i) => <StepRow key={s.id} sc={sc} step={s} i={i} />)}</ol>
      {complete && <ResultCard sc={sc} title={result.title} body={result.body} />}
      {sc.id === 's1' && world.isDone('s1.buy') && <Playlist />}
      <Tabs sc={sc} initial={tab} />
    </article>
  </TermScope.Provider>;
}
const s1Cast = (song: SongId): Id[] => { const s = SONGS[song]; return [s.seller, 'bobagent', ...s.shares.map(x => x.who).filter(w => w !== s.seller)]; };

function stateOf(sc: Scenario, step: Step) {
  const steps = sc.steps.filter(s => !s.hidden); const key = `${sc.id}.${step.id}`; if (world.isDone(key)) return 'done';
  const firstOpen = steps.find(s => !s.cheat && !world.isDone(`${sc.id}.${s.id}`));
  if (step.cheat) return firstOpen ? 'later' : 'open'; return firstOpen?.id === step.id ? 'current' : 'later';
}
function StepRow({ sc, step, i }: { sc: Scenario; step: Step; i: number }) {
  const key = `${sc.id}.${step.id}`; const st = stateOf(sc, step); const d = world.s.done[key]; const c = world.ctx(); const pend = world.pending?.key === key ? world.pending : null;
  const who = CAST[step.who].name; const blocked = notices.blocked[key]; const caught = step.cheat && st === 'done';
  const onRun = () => { if (!world.s.f.firstRunSeen) world.setFacts({ firstRunSeen: true }); void runStep(key); };
  const refused = d?.refused || caught;
  return <li className={`rounded-2xl border px-3 py-2.5 ${step.cheat ? 'border-dashed border-warn/60' : 'border-line'} ${st === 'later' ? 'opacity-55' : ''} ${st === 'current' ? 'bg-panel shadow-sm' : 'bg-panel/60'}`} data-step={key} data-state={st}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${st === 'done' ? refused ? 'bg-warnbg text-warn' : 'bg-goodbg text-good' : 'bg-panel2 text-mute'}`}>{st === 'done' ? refused ? <X size={15} /> : <Check size={15} /> : step.cheat ? <ShieldAlert size={14} /> : i + 1}</span>
      <div className="min-w-0 flex-1">
        {step.cheat && <div className="text-[12px] font-semibold text-warn">Try to cheat (optional)</div>}
        {(st === 'done' || st === 'later' || blocked) ? <div className="text-[15px]"><span className="font-semibold">{who}:</span> {step.button(c)}</div>
          : <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5"><span className="text-[15px] font-semibold">{who}:</span>
            {st === 'current' ? <Primary testid={`run-${key}`} onClick={onRun} busy={!!pend}>{pend ? 'Working…' : step.button(c)}</Primary> : <Secondary dashed onClick={onRun}>{step.button(c)}</Secondary>}</div>}
        {st === 'done' && <div className="text-[13px] text-mute">{d?.auto ? 'Done for you · ' : ''}{caught ? 'Caught.' : step.doneText(c)}</div>}
        {blocked && st !== 'done' && <div role="status" className="mt-1 text-[13px] text-warn">{blocked}</div>}
        {pend && <div role="status" className="mt-1 text-[13px] text-mute">{pend.status}</div>}
      </div>
    </div>
    {step.input === 'budget7' && <Budget7 locked={st === 'done'} />}{step.input === 'budget8' && <Budget8 locked={st === 'done'} />}
  </li>;
}
function ResultCard({ sc, title, body }: { sc: Scenario; title: string; body: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return <section ref={ref} aria-live="polite" className="fade-in mt-3 rounded-2xl border border-good/40 bg-goodbg/60 p-4" data-testid="result">
    <h2 className="text-[17px] font-bold text-ink"><span className="text-good">✓</span> {title}</h2>
    {body && <p className="mt-1 text-[15px] text-soft"><Rich text={body} /></p>}
    {sc.id === 's1' && <FullSongButton />}
    <div className="mt-3"><Primary testid="next" onClick={() => go(sc.next.to)}>Next: {sc.next.label} <ArrowRight size={16} /></Primary></div>
  </section>;
}
function FullSongButton() { useMusic(); const cast = SONGS[world.s.f.s1Song].cast; const on = music.current === cast && music.full && music.playing;
  return <button type="button" onClick={() => on ? music.pause() : music.playFull(cast)} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-[14px]">{on ? <Pause size={15} /> : <Play size={15} />} {on ? 'Pause' : 'Play the full song'}</button>; }

// ---------- cards ----------
function Cover({ song, size = 56 }: { song: SongId; size?: number }) { return <div aria-hidden className="grid shrink-0 place-items-center rounded-xl text-white" style={{ width: size, height: size, background: SONGS[song].cover }}><Music2 size={size / 2.4} /></div>; }
export function PreviewButton({ cast, title }: { cast: string; title: string }) { useMusic(); const on = music.current === cast && music.playing && !music.full;
  return <button type="button" aria-label={`${on ? 'Pause' : 'Play'}: 30 s preview of "${title}"`} onClick={() => { void music.load().then(() => music.toggle(cast)); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-[14px]">{on ? <Pause size={15} /> : <Play size={15} />} 30 s preview</button>; }
function SongCard() {
  useWorld(world); const f = world.s.f; const s = SONGS[f.s1Song]; const locked = world.isDone('s1.buy');
  const set = (d: number) => { const p = Math.min(2000, Math.max(100, f.s1Price + d)); world.setFacts({ s1Price: p }); world.relog('s1.list'); };
  return <section aria-label="The song" className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-3">
    <Cover song={s.id} />
    <div className="min-w-[150px] flex-1"><div className="text-[16px] font-semibold">"{s.title}" · {CAST[s.seller].name}</div><div className="text-[13px] text-mute"><Rich text="Creator licence: use it in your videos, forever" /></div></div>
    <PreviewButton cast={s.cast} title={s.title} />
    <div className="flex items-center gap-1" role="group" aria-label="Price">
      <button type="button" aria-label="Lower the price by $1" disabled={locked || f.s1Price <= 100} onClick={() => set(-100)} className="grid h-11 w-11 place-items-center rounded-xl border border-line disabled:opacity-40"><Minus size={16} /></button>
      <output aria-live="polite" className="w-[70px] text-center text-[18px] font-bold tabular-nums">{usd(f.s1Price)}</output>
      <button type="button" aria-label="Raise the price by $1" disabled={locked || f.s1Price >= 2000} onClick={() => set(100)} className="grid h-11 w-11 place-items-center rounded-xl border border-line disabled:opacity-40"><Plus size={16} /></button>
    </div>
  </section>;
}
function ThreeCard() { useWorld(world); const L = world.s.f.licences; const has = (t: string, h: Id) => L.some(l => l.song === 'rain' && l.type === t && l.holder === h);
  const rows: [string, string, string, string?][] = [['Personal', '$1', 'Just for you, no money made', has('personal', 'grace') ? '✓ Grace has this' : undefined], ['Creator', '$5', 'Use in your videos, forever', has('creator', 'bobagent') ? '✓ Bob\'s agent has this (scenario 1)' : undefined], ['Business', '$50', 'Use in adverts, for one year', world.s.f.businessStopped ? 'No longer for sale (scenario 5)' : has('business', 'clipagent') ? '✓ ClipAI\'s agent has this' : undefined]];
  return <section aria-label="The song" className="mt-3 rounded-2xl border border-line bg-panel p-3"><div className="flex items-center gap-3"><Cover song="rain" size={44} /><div className="flex-1 text-[16px] font-semibold">"Rain" · Alice</div><PreviewButton cast="alice" title="Rain" /></div>
    <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">{rows.map(([n, p, t, x]) => <li key={n} className="rounded-xl bg-panel2 px-3 py-2"><div className="flex justify-between text-[15px] font-semibold"><span><Rich text={n} /></span><span className="tabular-nums">{p}</span></div><div className="text-[13px] text-mute">{t}</div>{x && <div className="mt-0.5 text-[12px] text-good">{x}</div>}</li>)}</ul></section>; }
function CatalogueCard() { return <section aria-label="The catalogue" className="mt-3 rounded-2xl border border-line bg-panel p-3"><div className="text-[16px] font-semibold"><Rich text="Harbour Music catalogue" /> · {usd0(PLAN.priceCents)} a month</div>
  <ul className="mt-1.5 flex flex-wrap gap-2">{PLAN.songs.map(id => <li key={id} className="flex items-center gap-2 rounded-xl bg-panel2 py-1 pl-1 pr-3 text-[14px]"><Cover song={id} size={32} />"{SONGS[id].title}"</li>)}</ul>
  <div className="mt-1.5 text-[13px] text-mute">Use in ClipAI's videos.</div></section>; }
function Playlist() { useWorld(world); const cur = world.s.f.s1Song;
  return <section aria-label="Try another song" className="mt-3"><h2 className="text-[14px] font-semibold text-soft">Try another song</h2>
    <ul className="noscroll -mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">{SONG_LIST.filter(s => s.id !== cur).map(s => <li key={s.id}><button type="button" onClick={() => { world.pickSong(s.id, s.priceCents); world.apply('s1.list'); window.scrollTo({ top: 0 }); document.querySelector('main')?.scrollTo({ top: 0 }); }} className="flex min-h-11 w-[200px] items-center gap-2 rounded-xl border border-line bg-panel p-2 text-left"><Cover song={s.id} size={40} /><span className="min-w-0"><span className="block truncate text-[14px] font-semibold">"{s.title}"</span><span className="block text-[12px] text-mute">{CAST[s.seller].name} · {usd0(s.priceCents)}</span></span></button></li>)}</ul></section>; }

// ---------- inputs ----------
function Stepper({ label, value, min, max, step, onChange, locked, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; locked: boolean; fmt: (v: number) => string }) {
  return <div className="flex items-center gap-1" role="group" aria-label={label}>
    <button type="button" aria-label={`Less: ${label}`} disabled={locked || value <= min} onClick={() => onChange(Math.max(min, value - step))} className="grid h-11 w-11 place-items-center rounded-xl border border-line disabled:opacity-40"><Minus size={15} /></button>
    <output aria-live="polite" className="min-w-[112px] text-center text-[15px] font-semibold tabular-nums">{fmt(value)}</output>
    <button type="button" aria-label={`More: ${label}`} disabled={locked || value >= max} onClick={() => onChange(Math.min(max, value + step))} className="grid h-11 w-11 place-items-center rounded-xl border border-line disabled:opacity-40"><Plus size={15} /></button></div>;
}
function Budget7({ locked }: { locked: boolean }) { const f = world.s.f;
  return <div className="mt-2 flex flex-wrap gap-2 pl-10"><Stepper label="a day" value={f.bobDay} min={500} max={5000} step={100} locked={locked} onChange={v => world.setFacts({ bobDay: v })} fmt={v => `${usd0(v)} a day`} />
    <Stepper label="at most a song" value={f.bobSong} min={100} max={2000} step={100} locked={locked} onChange={v => world.setFacts({ bobSong: v })} fmt={v => `at most ${usd0(v)} a song`} /></div>; }
function Budget8({ locked }: { locked: boolean }) { const f = world.s.f;
  return <div className="mt-2 pl-10"><label className="block text-[14px]"><span className="font-semibold tabular-nums">{usd0(f.clipMonth)} this month</span><span className="text-mute"> · at most $100 a payment</span>
    <input type="range" min={50_000} max={500_000} step={10_000} value={f.clipMonth} disabled={locked} onChange={e => world.setFacts({ clipMonth: Number(e.target.value) })} className="mt-1 block h-11 w-full max-w-[420px] accent-[var(--accent)]" aria-label="Monthly budget" /></label></div>; }

export const prefetchEngine = () => { void loadEngine(); };
export { SCENARIOS };
