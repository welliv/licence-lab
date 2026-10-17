// State for the main-path story: one Lab for the home page, one for the chapters. Kept in memory while you move around.
import { useSyncExternalStore } from 'react';
import { Lab } from '../../engine/lab';
import * as S from '../../engine/story';
const subs = new Set<() => void>(); let v = 0; const bump = () => { v++; subs.forEach(f => f()); };
export const useStory = () => { useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => v); return story; };
type Phase = 'idle' | 'listening' | 'buying' | 'done';
interface HomeState { phase: Phase; label: string; lab: Lab | null; out: null | Awaited<ReturnType<typeof S.youBuy>> }
export const story = {
  home: { phase: 'idle', label: '', lab: null, out: null } as HomeState,
  lab: null as Lab | null, busy: '' as string,
  c1: null as null | ReturnType<typeof S.artistSells>, c2: null as null | Awaited<ReturnType<typeof S.agentBuys>>,
  c3: null as null | S.Verdict, c3fake: null as null | S.Verdict, c4: null as null | Awaited<ReturnType<typeof S.rightsChange>>,
  set(p: Partial<HomeState>) { Object.assign(story.home, p); bump(); },
  world() { return (story.lab ??= new Lab('story')); },
  async run(k: 'c1' | 'c2' | 'c3' | 'c3fake' | 'c4', f: (lab: Lab) => any): Promise<void> { if (story.busy) return; story.busy = k; bump();
    try { await new Promise(r => setTimeout(r, 30)); const lab = story.world();
      if (k !== 'c1' && !story.c1) story.c1 = S.artistSells(lab); if ((k === 'c3' || k === 'c3fake' || k === 'c4') && !story.c2) story.c2 = await S.agentBuys(lab);
      (story as any)[k] = await f(lab); } finally { story.busy = ''; bump(); } },
  reset() { story.lab = null; story.c1 = story.c2 = story.c3 = story.c3fake = story.c4 = null; bump(); },
};
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
