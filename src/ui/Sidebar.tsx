import { SCENARIOS, PARTS } from '../scenarios';
import { ATTACKS } from '../engine/attacks';
import { cx, Cover } from './bits';
import { go, score, useVersion } from './store';
import { ShieldCheck, Swords, BookOpen, HelpCircle, Library, FileText, RotateCcw } from 'lucide-react';
import { forgetParties } from './store';
export function Sidebar({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  useVersion(); const sc = score.get();
  const Item = ({ to, icon, label, right }: { to: string; icon: React.ReactNode; label: string; right?: React.ReactNode }) =>
    <button onClick={() => { go(to); onNavigate?.(); }} className={cx('flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px]', path === to ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50')}>
      <span className="w-5 shrink-0 text-center">{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{right}</button>;
  return <nav className="flex h-full flex-col bg-neutral-50/60" aria-label="Scenarios">
    <div className="flex items-center gap-2.5 border-b border-neutral-200 px-3 py-3"><Cover size={34} /><div><div className="text-[14px] font-bold leading-4">Licence Lab</div><div className="text-[11px] text-neutral-500">Explore music licensing scenarios</div></div></div>
    <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-2 py-2">
      <div><Item to="start" icon="👋" label="Getting Started" /><Item to="verify" icon={<ShieldCheck size={14} className="mx-auto" />} label="Verify a bundle" /></div>
      {[1, 2, 3, 4, 5].map(part => <div key={part}><div className="px-2 pb-1 text-[11px] font-medium text-neutral-400">{part}. {PARTS[part]}</div>
        {SCENARIOS.filter(s => s.part === part).map(s => <Item key={s.id} to={s.id} icon={s.emoji} label={`${s.n}. ${s.title}`} />)}</div>)}
      <div><div className="flex items-center gap-1 px-2 pb-1 text-[11px] font-medium text-neutral-400"><Swords size={11} /> Red team</div>
        <Item to="redteam" icon="🗡️" label="All attacks and score" right={<span className="text-[10px] text-neutral-400">{Object.keys(sc).length}/{ATTACKS.length}</span>} />
        {ATTACKS.map(a => <Item key={a.id} to={`attack/${a.id}`} icon={a.emoji} label={`${a.id} ${a.title}`} right={sc[a.id] ? <span className={cx('h-1.5 w-1.5 rounded-full', sc[a.id] === 'blocked' ? 'bg-emerald-500' : sc[a.id] === 'open' ? 'bg-orange-500' : 'bg-amber-400')} /> : null} />)}</div>
    </div>
    <div className="border-t border-neutral-200 px-2 py-2">
      <Item to="about/library" icon={<Library size={14} className="mx-auto" />} label="Protocol library (local)" />
      <Item to="about/paper" icon={<FileText size={14} className="mx-auto" />} label="White paper and spec" />
      <Item to="about/help" icon={<HelpCircle size={14} className="mx-auto" />} label="Help" />
      <button onClick={() => { if (confirm('Remove all test parties and start again?')) forgetParties(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px] text-neutral-500 hover:bg-neutral-50"><span className="w-5 text-center"><RotateCcw size={13} className="mx-auto" /></span>Reset everything</button>
      <div className="px-2 pt-1 text-[10px] text-neutral-400"><BookOpen size={10} className="mr-1 inline" />Test keys only. Never paste a real key or wallet.</div>
    </div></nav>;
}
