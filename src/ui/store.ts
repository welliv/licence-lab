// UI store: one Lab world per scenario page (kept while you move around), hash routing, and red-team score.
import { useSyncExternalStore } from 'react';
import { Lab } from '../engine/lab';
import { prepare, runStep, defaults, type StepRun } from '../engine/runner';
import { byId, type Scenario } from '../scenarios';
export interface Session { sc: Scenario; lab: Lab | null; ready: Set<string>; runs: StepRun[]; busy: boolean; inputs: Record<string, Record<string, any>>; lastVerdictStep?: string }
const sessions = new Map<string, Session>(); let version = 0; const subs = new Set<() => void>();
export const bump = () => { version++; subs.forEach(f => f()); };
export function useVersion() { return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => version); }
export const allLabs = () => [...sessions.values()].map(s => s.lab).filter(Boolean) as Lab[];
export const extraLabs: Lab[] = [];
const persisted = (): string[] => { try { return JSON.parse(localStorage.getItem('ll.parties') ?? '[]'); } catch { return []; } };
const persist = (ids: string[]) => { try { localStorage.setItem('ll.parties', JSON.stringify([...new Set([...persisted(), ...ids])])); } catch {} };
export const forgetParties = () => { try { localStorage.removeItem('ll.parties'); } catch {} sessions.clear(); bump(); };
export function session(id: string): Session { let s = sessions.get(id); if (!s) { const sc = byId(id)!; s = { sc, lab: null, ready: new Set(sc.cast.filter(p => persisted().includes(p))), runs: [], busy: false, inputs: {} }; sessions.set(id, s); } return s; }
/** Parties persist across scenarios (like test wallets in Alby's sandbox). When all are set up, the scenario world is prepared. */
export async function setUpParty(id: string, party: string | 'all') { const s = session(id); (party === 'all' ? s.sc.cast : [party]).forEach(p => s.ready.add(p)); persist([...s.ready]); bump(); await ensureLab(s); }
export async function ensureLab(s: Session) { if (s.lab || !s.sc.cast.every(p => s.ready.has(p))) return; s.busy = true; bump(); s.lab = await prepare(s.sc); s.busy = false; bump(); }
export function resetParty(id: string, party: string) { const s = session(id); s.ready.delete(party); s.lab = null; s.runs = []; try { localStorage.setItem('ll.parties', JSON.stringify(persisted().filter(p => p !== party))); } catch {} bump(); }
export async function resetScenario(id: string) { const s = session(id); s.lab = null; s.runs = []; s.lastVerdictStep = undefined; bump(); await ensureLab(s); }
export async function runNext(id: string, upto?: number) { const s = session(id); if (!s.lab || s.busy) return; s.busy = true; bump();
  try { const target = upto ?? s.runs.length + 1; while (s.runs.length < Math.min(target, s.sc.steps.length)) { const st = s.sc.steps[s.runs.length]; const r = await runStep(s.lab, st, { ...defaults(st), ...(s.inputs[st.id] ?? {}) }); s.runs.push(r); if (r.out.verdict) s.lastVerdictStep = st.id; bump(); await new Promise(r => setTimeout(r, 0)); } }
  finally { s.busy = false; bump(); } }
export function setInput(id: string, step: string, key: string, v: any) { const s = session(id); (s.inputs[step] ??= {})[key] = v; bump(); }
// ---------- routing (hash routes, so it works on any static host) ----------
export function useRoute() { const get = () => location.hash.replace(/^#\/?/, '') || 'start'; useSyncExternalStore(f => { addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, get); const [path, q = ''] = get().split('?'); return { path, params: new URLSearchParams(q) }; }
export const go = (p: string) => { location.hash = '/' + p; };
// ---------- red team score ----------
export const score = { get: (): Record<string, string> => { try { return JSON.parse(localStorage.getItem('ll.score') ?? '{}'); } catch { return {}; } }, set(id: string, outcome: string) { try { localStorage.setItem('ll.score', JSON.stringify({ ...score.get(), [id]: outcome })); } catch {} bump(); } };
