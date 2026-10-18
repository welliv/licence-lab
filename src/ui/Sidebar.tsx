import { byId } from '../scenarios';
import { GUIDE, GUIDE_GROUPS, MORE } from './guide';
import { ATTACKS } from '../engine/attacks';
import { cx, Cover } from './bits';
import { go, score, useVersion } from './store';
import { ShieldCheck, Swords, BookOpen, HelpCircle, Library, FileText, RotateCcw, Moon, Sun, Globe, ArrowLeft, Wrench, ChevronRight, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { forgetParties } from './store';
export function Sidebar({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  useVersion(); const sc = score.get(); const inMore = MORE.some(m => m.id === path); const inTools = TOOLS.some(t => t.to === path); const [more, setMore] = useState(inMore); const [tools, setTools] = useState(inTools);
  useEffect(() => { if (inMore) setMore(true); if (inTools) setTools(true); }, [path]);
  const nav = (to: string) => { go(to); onNavigate?.(); };
  const Row = ({ to, n, icon, label, right, testid }: { to: string; n?: number; icon?: React.ReactNode; label: string; right?: React.ReactNode; testid?: string }) =>
    <button onClick={() => nav(to)} data-guide-n={n} data-testid={testid} aria-current={path === to ? 'page' : undefined} className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-[6px] text-left text-[14px]', path === to ? 'bg-neutral-100 font-semibold text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50')}>
      <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center text-[11px] tabular-nums', n ? 'rounded-full bg-neutral-100 font-semibold text-neutral-500' : 'text-neutral-400')}>{n ?? icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{right}</button>;
  return <nav className="flex h-full flex-col bg-neutral-50/60" aria-label="Scenarios">
    <button onClick={() => nav('')} className="flex items-center gap-2.5 border-b border-neutral-200 px-3 py-3 text-left"><Cover size={34} /><div><div className="text-[14px] font-bold leading-4">Licence Lab</div><div className="flex items-center gap-1 text-[11px] text-neutral-500"><ArrowLeft size={10} />Back to the story</div></div></button>
    <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-2 py-3">
      <Row to="hood" icon={<Wrench size={13} />} label="Under the hood" />
      {GUIDE_GROUPS.map(g => <div key={g.id}><div className="px-2 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400" data-group-title={g.id}>{g.title}</div>
        {GUIDE.filter(x => x.group === g.id).map(x => <Row key={x.id} to={x.id} n={x.n} label={x.title} testid={x.n === 1 ? 'first-item' : undefined} right={x.n === 1 ? <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Start here</span> : undefined} />)}
        {g.id === 'safety' && <Row to="redteam" icon={<Swords size={13} />} label="Try to break it (game)" right={<span className="text-[10px] text-neutral-400">{Object.keys(sc).length} of {ATTACKS.length}</span>} />}</div>)}
      <Fold title={`More scenarios (${MORE.length})`} open={more} toggle={() => setMore(!more)}>{MORE.map(m => <Row key={m.id} to={m.id} icon={byId(m.id)?.emoji} label={m.title} />)}</Fold>
      <Fold title="Tools" open={tools} toggle={() => setTools(!tools)}>{TOOLS.map(t => <Row key={t.to} to={t.to} icon={t.icon} label={t.label} />)}</Fold>
    </div>
    <div className="border-t border-neutral-200 px-2 py-2">
      <Row to="about/help" icon={<HelpCircle size={13} />} label="Help" />
      <ThemeToggle />
      <button onClick={() => { if (confirm('Remove all test parties and start again?')) forgetParties(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px] text-neutral-500 hover:bg-neutral-50"><span className="w-5 text-center"><RotateCcw size={13} className="mx-auto" /></span>Reset everything</button>
      <div className="px-2 pt-1 text-[10px] text-neutral-400"><BookOpen size={10} className="mr-1 inline" />Test money only. Never paste a real key or wallet.</div>
    </div></nav>;
}
export const TOOLS = [
  { to: 'verify', icon: <ShieldCheck size={13} />, label: 'Check a licence file' }, { to: 'live', icon: <Globe size={13} />, label: 'Live test wallets' },
  { to: 'hood/runs', icon: <Radio size={13} />, label: 'Real runs on a test network' }, { to: 'about/library', icon: <Library size={13} />, label: 'Protocol library' },
  { to: 'about/spec', icon: <FileText size={13} />, label: 'Protocol spec' },
];
function Fold({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return <div><button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400 hover:text-neutral-700"><ChevronRight size={12} className={cx('transition-transform', open && 'rotate-90')} />{title}</button>{open && <div>{children}</div>}</div>;
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const flip = () => { const d = !dark; document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('ll.theme', d ? 'dark' : 'light'); } catch {} setDark(d); };
  return <button onClick={flip} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px] text-neutral-500 hover:bg-neutral-50"><span className="w-5 text-center">{dark ? <Sun size={13} className="mx-auto" /> : <Moon size={13} className="mx-auto" />}</span>{dark ? 'Light mode' : 'Dark mode'}</button>;
}

