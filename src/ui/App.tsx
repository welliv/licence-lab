import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useRoute } from './store';
import { ScenarioPage } from './ScenarioPage';
import { GettingStarted } from './GettingStarted';
import { RedTeamIndex, AttackPage } from './RedTeam';
import { VerifyPage } from './VerifyPage';
import { AboutPage } from './About';
import { byId } from '../scenarios';
import { exposeRepl } from './repl';
export function App() {
  const { path, params } = useRoute(); const [open, setOpen] = useState(false);
  useEffect(() => { exposeRepl(); }, []);
  useEffect(() => { document.querySelector('main')?.scrollTo(0, 0); }, [path]);
  let page: React.ReactNode;
  if (path === 'start') page = <GettingStarted />;
  else if (path === 'verify') page = <VerifyPage />;
  else if (path === 'redteam') page = <RedTeamIndex />;
  else if (path.startsWith('attack/')) page = <AttackPage id={path.slice(7)} key={path} />;
  else if (path.startsWith('about/')) page = <AboutPage which={path.slice(6)} />;
  else if (byId(path)) page = <ScenarioPage id={path} key={path} autorun={Number(params.get('run') ?? 0)} />;
  else page = <GettingStarted />;
  return <div className="flex h-full">
    <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-neutral-200 bg-white transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}><Sidebar path={path} onNavigate={() => setOpen(false)} /></aside>
    {open && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setOpen(false)} />}
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 md:hidden"><button aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button><span className="font-semibold">Licence Lab</span></div>
      <main className="scroll-thin flex-1 overflow-y-auto">{page}
        <footer className="border-t border-neutral-100 px-6 py-4 text-center text-[11px] text-neutral-400">Licence Lab · runs the open music-licence protocol library in your browser · test keys and test money only · Nostr · Lightning · Bitcoin</footer></main>
    </div></div>;
}
