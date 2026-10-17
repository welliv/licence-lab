import { SCENARIOS, PARTS, byId } from '../scenarios';
import { ATTACKS } from '../engine/attacks';
import { cx, Cover } from './bits';
import { go, score, useVersion } from './store';
import { ShieldCheck, Swords, BookOpen, HelpCircle, Library, FileText, RotateCcw, Moon, Sun, Globe, ArrowLeft, Wrench, ChevronRight, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { forgetParties } from './store';
export function Sidebar({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  useVersion(); const sc = score.get(); const here = byId(path)?.part ?? (path.startsWith('attack/') ? 4 : 0); const [openPart, setOpenPart] = useState<number>(here); useEffect(() => { if (here) setOpenPart(here); }, [here]);
  const Item = ({ to, icon, label, right }: { to: string; icon: React.ReactNode; label: string; right?: React.ReactNode }) =>
    <button onClick={() => { go(to); onNavigate?.(); }} className={cx('flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px]', path === to ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50')}>
      <span className="w-5 shrink-0 text-center">{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{right}</button>;
  return <nav className="flex h-full flex-col bg-neutral-50/60" aria-label="Scenarios">
    <button onClick={() => { go(''); onNavigate?.(); }} className="flex items-center gap-2.5 border-b border-neutral-200 px-3 py-3 text-left"><Cover size={34} /><div><div className="text-[14px] font-bold leading-4">Licence Lab</div><div className="flex items-center gap-1 text-[11px] text-neutral-500"><ArrowLeft size={10} />Back to the story</div></div></button>
    <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-2 py-2">
      <div><Item to="hood" icon={<Wrench size={14} className="mx-auto" />} label="Under the hood" /><Item to="redteam" icon={<Swords size={14} className="mx-auto" />} label="Try to break it" right={<span className="text-[10px] text-neutral-400">{Object.keys(sc).length}/{ATTACKS.length}</span>} />
        <Item to="verify" icon={<ShieldCheck size={14} className="mx-auto" />} label="Check a licence file" /><Item to="live" icon={<Globe size={14} className="mx-auto" />} label="Live test wallets" /><Item to="hood/runs" icon={<Radio size={14} className="mx-auto" />} label="Real runs on Mutinynet" /></div>
      <div className="px-2 pt-1 text-[11px] font-medium text-neutral-400">All scenarios</div>
      {[1, 2, 3, 4, 5, 6].map(part => <Part key={part} part={part} open={openPart === part} toggle={() => setOpenPart(openPart === part ? 0 : part)}>{SCENARIOS.filter(s => s.part === part).map(s => <Item key={s.id} to={s.id} icon={s.emoji} label={`${s.n}. ${s.title}`} />)}</Part>)}
    </div>
    <div className="border-t border-neutral-200 px-2 py-2">
      <Item to="about/library" icon={<Library size={14} className="mx-auto" />} label="Protocol library (local)" />
      <Item to="about/paper" icon={<FileText size={14} className="mx-auto" />} label="White paper and spec" />
      <Item to="about/help" icon={<HelpCircle size={14} className="mx-auto" />} label="Help" />
      <ThemeToggle />
      <button onClick={() => { if (confirm('Remove all test parties and start again?')) forgetParties(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px] text-neutral-500 hover:bg-neutral-50"><span className="w-5 text-center"><RotateCcw size={13} className="mx-auto" /></span>Reset everything</button>
      <div className="px-2 pt-1 text-[10px] text-neutral-400"><BookOpen size={10} className="mr-1 inline" />Test keys only. Never paste a real key or wallet.</div>
    </div></nav>;
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const flip = () => { const d = !dark; document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('ll.theme', d ? 'dark' : 'light'); } catch {} setDark(d); };
  return <button onClick={flip} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px] text-neutral-500 hover:bg-neutral-50"><span className="w-5 text-center">{dark ? <Sun size={13} className="mx-auto" /> : <Moon size={13} className="mx-auto" />}</span>{dark ? 'Light mode' : 'Dark mode'}</button>;
}

function Part({ part, open, toggle, children }: { part: number; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return <div><button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[12px] font-medium text-neutral-600 hover:bg-neutral-50"><ChevronRight size={12} className={cx('transition-transform', open && 'rotate-90')} />{part}. {PARTS[part]}<span className="ml-auto text-[10px] text-neutral-400">{SCENARIOS.filter(s => s.part === part).length}</span></button>
    {open && <div className="pl-2">{children}</div>}</div>;
}
