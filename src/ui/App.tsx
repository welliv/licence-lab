import { useEffect } from 'react';
import { useRoute } from './store';
import { StoryShell, Home, Stop1, Stop2, Stop3, RightsExtra } from './story/Story';
import { TestPanel } from './TestPanel';
import { testkit } from './testkit';
import { exposeRepl } from './repl';
import { MiniPlayer } from './MiniPlayer';
import { LivePrice } from './story/LivePrice';
export function App() {
  const { path } = useRoute();
  useEffect(() => { exposeRepl(); testkit.start(); }, []);
  useEffect(() => { document.querySelector('main')?.scrollTo(0, 0); }, [path]);
  // Old chapter links (c1–c4) still land on the matching stop.
  const ALIAS: Record<string, string> = { start: '', home: '', c1: 'stop1', c2: 'stop2', c3: 'stop3', c4: 'rights' }; const sp = ALIAS[path] ?? path;
  const STORY: Record<string, () => React.ReactNode> = { '': () => <Home />, stop1: () => <Stop1 />, stop2: () => <Stop2 />, stop3: () => <Stop3 />, rights: () => <RightsExtra />, price: () => <LivePrice /> };
  // "Under the hood" has been removed. Its old links (#/hood, #/verify, #/redteam, #/live, #/s1 and so on) land on the home screen.
  const known = !!STORY[sp];
  useEffect(() => { if (!known) location.replace(location.pathname + location.search + '#/'); }, [known, path]);
  return <div className="flex h-full flex-col"><div className="min-h-0 flex-1"><StoryShell path={known ? sp : ''}>{STORY[known ? sp : '']()}</StoryShell></div><MiniPlayer /><TestPanel /></div>;
}
