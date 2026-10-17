// State for the main path: one Lab world for the three stops, small separate worlds for each "rights" beat,
// the visitor's choice (artist / buyer / builder), and results kept in memory while you move around.
import { useSyncExternalStore } from 'react';
import { Lab } from '../../engine/lab';
const subs = new Set<() => void>(); let v = 0; export const bump = () => { v++; subs.forEach(f => f()); };
export const useStory = () => { useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => v); return story; };
export type Persona = 'artist' | 'buyer' | 'builder';
export const STOPS = { stop1: 'Hear it, license it', stop2: 'Companies buy at scale', stop3: 'Anyone can check' } as const;
export type StopId = keyof typeof STOPS;
export const ORDER: Record<Persona, StopId[]> = { artist: ['stop1', 'stop2', 'stop3'], buyer: ['stop2', 'stop1', 'stop3'], builder: ['stop3', 'stop1', 'stop2'] };
export const PERSONAS: { id: Persona; label: string; line: string; emoji: string }[] = [
  { id: 'artist', label: 'I make music', line: 'See a licence sold in seconds, and who gets paid', emoji: '🎵' },
  { id: 'buyer', label: 'I buy music', line: 'See a company agent license songs inside a budget', emoji: '🛒' },
  { id: 'builder', label: 'I build', line: 'See anyone check a licence alone, with the code open', emoji: '🛠️' },
];
/** Demo starting money: Bob's agent has $100 to spend; ClipAI's wallet holds $10,000 (its agent may spend only its monthly budget). */
export const START_CASH: Record<string, number> = { bobagent: 10_000, clipai: 1_000_000 };
const read = (): Persona | null => { try { const p = localStorage.getItem('ll.persona'); return p === 'artist' || p === 'buyer' || p === 'builder' ? p : null; } catch { return null; } };
export const story = {
  persona: read() as Persona | null,
  r: {} as Record<string, any>, busy: '' as string, progress: 0, done: new Set<string>(),
  labs: {} as Record<string, Lab>,
  /** The wallet strip: everyone's balance in US cents (demo starting money), carried across the stops. */
  cash: { ...START_CASH } as Record<string, number>,
  /** Move money on the strip: `from` pays, each entry in `to` receives. Amounts in cents; they must add up. */
  move(from: string, to: Record<string, number>) { const total = Object.values(to).reduce((a, b) => a + b, 0); story.cash[from] = (story.cash[from] ?? 0) - total; for (const [k, c] of Object.entries(to)) story.cash[k] = (story.cash[k] ?? 0) + c; bump(); },
  setPersona(p: Persona) { story.persona = p; try { localStorage.setItem('ll.persona', p); } catch {} bump(); },
  order(): StopId[] { return ORDER[story.persona ?? 'artist']; },
  world(name = 'main') { return (story.labs[name] ??= new Lab(name === 'main' ? 'story' : `story-${name}`)); },
  set(k: string, val: any) { story.r[k] = val; bump(); },
  finish(stop: string) { if (!story.done.has(stop)) { story.done.add(stop); bump(); } },
  async run<T>(k: string, f: (lab: Lab) => Promise<T> | T, world = 'main'): Promise<T | undefined> { if (story.busy) return; story.busy = k; story.progress = 0; bump();
    try { await new Promise(r => setTimeout(r, 30)); const out = await f(story.world(world)); story.r[k] = out; return out; } finally { story.busy = ''; bump(); } },
  reset() { story.labs = {}; story.r = {}; story.done.clear(); story.cash = { ...START_CASH }; bump(); },
};
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
