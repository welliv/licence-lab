// The one app: one sidebar, 11 scenarios, one ledger. Mobile: a ☰ sheet and a scrolling row of wallets.
import { useEffect, useRef, useState } from 'react';
import { Menu, X, RotateCcw, Moon, Sun, Code2, Check, Play, Pause } from 'lucide-react';
import { SCENARIOS, bySlug } from './data/scenarios';
import { CAST, WALLETS, usd, SONGS } from './data/cast';
import { world, startAgain } from './actions';
import { useWorld } from './world';
import { useRoute, go, redirect } from './route';
import { ScenarioPage } from './ScenarioPage';
import { EndCard } from './EndCard';
import { CoinLayer } from './parts';
import { music, useMusic } from './music';
import { REPO } from './tabs';

export function App() {
  const { path, params } = useRoute(); const [open, setOpen] = useState(false); const main = useRef<HTMLElement>(null);
  const r = redirect(path); useEffect(() => { if (r) location.replace('#/' + r); }, [r]);
  const sc = bySlug(path) ?? (path === 'done' ? undefined : SCENARIOS[0]); const isDone = path === 'done';
  useEffect(() => { main.current?.scrollTo(0, 0); window.scrollTo(0, 0); setOpen(false); document.title = isDone ? 'You\'ve seen it all · Licence Lab' : `${sc!.title} · Licence Lab`; }, [path]);
  return <div className="min-h-full md:pl-[272px]">
    <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-panel focus:p-2">Skip to the scenario</a>
    <aside className={`fixed inset-y-0 left-0 z-40 w-[288px] max-w-[88vw] overflow-y-auto border-r border-line bg-panel transition-transform md:z-10 md:w-[272px] md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Scenarios">
      <Sidebar current={isDone ? 'done' : sc!.slug} onClose={() => setOpen(false)} /></aside>
    {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} aria-hidden />}
    <div className="flex min-h-screen min-w-0 flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-panel/95 px-3 py-1.5 backdrop-blur md:hidden">
        <button type="button" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-[14px] font-medium"><Menu size={16} aria-hidden />{isDone ? 'The end' : `${sc!.n} of 11 · ${sc!.title}`}<span className="sr-only">: open the list of scenarios</span></button>
        <span className="ml-auto text-[13px] font-semibold">♪ Licence Lab</span></header>
      <main id="main" ref={main} className="flex-1">{isDone ? <EndCard moved={params.get('moved')} /> : <ScenarioPage key={sc!.id} sc={sc!} tab={params.get('tab') ?? undefined} />}</main>
      <MiniPlayer />
    </div>
    <CoinLayer />
  </div>;
}

function Sidebar({ current, onClose }: { current: string; onClose: () => void }) {
  useWorld(world); const groups = ['START HERE', 'ARTISTS', 'AGENTS AND COMPANIES'] as const;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('one.theme', d ? 'dark' : 'light'); } catch { /* ignore */ } };
  return <div className="flex min-h-full flex-col">
    <div className="flex items-start justify-between px-4 pb-2 pt-4"><a href="#/sell" className="block rounded-lg"><div className="text-[17px] font-bold">♪ Licence Lab</div><div className="text-[13px] text-mute">Sell music to people and agents</div></a>
      <button type="button" aria-label="Close the list" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl md:hidden"><X size={18} /></button></div>
    <nav aria-label="Scenarios" className="px-2">{groups.map(g => <div key={g} className="mt-2"><h2 className="px-2 pb-1 text-[11.5px] font-semibold tracking-wide text-mute">{g}</h2>
      <ul>{SCENARIOS.filter(s => s.group === g).map(s => { const on = s.slug === current; const ok = world.complete(s.id);
        return <li key={s.id}><a href={`#/${s.slug}`} aria-current={on ? 'page' : undefined} className={`flex min-h-11 items-center gap-2 rounded-xl px-2 text-[14.5px] ${on ? 'bg-panel2 font-semibold text-ink' : 'text-soft hover:bg-panel2'}`}>
          <span aria-hidden className="w-5 text-center text-[13px] text-mute">{s.n}</span><span className="flex-1">{s.title}</span>{ok && <Check size={15} className="text-good" aria-label="done" />}</a></li>; })}</ul></div>)}</nav>
    <section aria-label="Wallets" className="mx-3 mt-4 rounded-2xl border border-line p-3"><h2 className="text-[12px] font-semibold tracking-wide text-mute">WALLETS · TEST MONEY ONLY</h2>
      <ul className="mt-1.5 space-y-0.5 text-[13px]">{WALLETS.map(id => <li key={id} data-ledger={id} className="flex justify-between gap-1"><span className="truncate"><span aria-hidden>{CAST[id].emoji}</span> {CAST[id].name}</span><span className="tabular-nums text-soft">{usd(world.s.bal[id] ?? 0)}</span></li>)}</ul></section>
    <div className="mt-auto flex flex-wrap items-center gap-1 px-3 py-3">
      <button type="button" onClick={() => { if (confirm('Start again? Every wallet, licence and step goes back to the start.')) { startAgain(); go('sell'); } }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[14px] text-soft hover:bg-panel2"><RotateCcw size={15} />Start again</button>
      <button type="button" onClick={toggle} aria-label={dark ? 'Use light mode' : 'Use dark mode'} className="grid h-11 w-11 place-items-center rounded-xl text-soft hover:bg-panel2">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
      <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[14px] text-soft hover:bg-panel2"><Code2 size={15} aria-hidden />Code ↗</a></div>
  </div>;
}

function MiniPlayer() { useMusic(); const c = music.current; const [, tick] = useState(0);
  useEffect(() => { if (!music.playing) return; const t = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(t); }, [music.playing]);
  if (!c) return null; const s = Object.values(SONGS).find(x => x.cast === c)!; const p = music.duration ? music.time / music.duration : 0; const mm = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  return <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-line bg-panel px-3 py-1.5" role="region" aria-label="Music player">
    <button type="button" onClick={() => music.playing ? music.pause() : music.full ? music.playFull(c) : music.toggle(c)} aria-label={music.playing ? 'Pause' : 'Play'} className="grid h-11 w-11 place-items-center rounded-full bg-panel2">{music.playing ? <Pause size={16} /> : <Play size={16} />}</button>
    <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">"{s.title}" · {CAST[s.seller].name} <span className="font-normal text-mute">· {music.full ? 'full song (licensed)' : '30 s preview'}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-panel2"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${p * 100}%` }} /></div></div>
    <span className="font-mono text-[12px] tabular-nums text-mute">{mm(music.time)}</span></div>; }
