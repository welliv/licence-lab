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
/** Steps that have a real (non-guard) run. Free play: any step can run at any time; out-of-order runs get a guard message. */
export const doneSet = (s: Session) => new Set(s.runs.filter(r => !r.guard).map(r => r.step.id));
export const lastRun = (s: Session, stepId: string) => [...s.runs].reverse().find(r => r.step.id === stepId);
const looksInternal = (m: string) => /undefined|null|not a function|Cannot read|is not iterable|reading '/.test(m);
async function exec(s: Session, i: number) {
  const st = s.sc.steps[i]; const done = doneSet(s); const missing = s.sc.steps.slice(0, i).filter(x => !done.has(x.id));
  const r = await runStep(s.lab!, st, { ...defaults(st), ...(s.inputs[st.id] ?? {}) }, { onError: e => {
    if (!missing.length) return undefined; const need = missing[missing.length - 1]; const k = s.sc.steps.indexOf(need) + 1;
    return looksInternal(e.message) ? `Not yet: this needs step ${k} ("${need.title}") first.` : `Refused: ${e.message}. Step ${k} ("${need.title}") has not happened yet.`; } });
  s.runs.push(r); if (r.out.verdict) s.lastVerdictStep = st.id; return r;
}
/** Run step i now, whatever has happened before (free play). */
export async function runAt(id: string, i: number) { const s = session(id); if (!s.lab || s.busy) return; s.busy = true; bump(); try { await exec(s, i); } finally { s.busy = false; bump(); } }
/** Run every step not yet done, in story order, up to step `upto` (1-based). */
export async function runNext(id: string, upto?: number) { const s = session(id); if (!s.lab || s.busy) return; s.busy = true; bump();
  try { const lim = Math.min(upto ?? (s.sc.steps.findIndex(x => !doneSet(s).has(x.id)) + 1 || s.sc.steps.length), s.sc.steps.length);
    for (let i = 0; i < lim; i++) { if (doneSet(s).has(s.sc.steps[i].id)) continue; await exec(s, i); bump(); await new Promise(r => setTimeout(r, 0)); } }
  finally { s.busy = false; bump(); } }
export function setInput(id: string, step: string, key: string, v: any) { const s = session(id); (s.inputs[step] ??= {})[key] = v; bump(); }
// ---------- routing (hash routes, so it works on any static host) ----------
export function useRoute() { const get = () => location.hash.replace(/^#\/?/, '') || 'start'; useSyncExternalStore(f => { addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, get); const [path, q = ''] = get().split('?'); return { path, params: new URLSearchParams(q) }; }
export const go = (p: string) => { location.hash = '/' + p; };
// ---------- red team score ----------
export const score = { get: (): Record<string, string> => { try { return JSON.parse(localStorage.getItem('ll.score') ?? '{}'); } catch { return {}; } }, set(id: string, outcome: string) { try { localStorage.setItem('ll.score', JSON.stringify({ ...score.get(), [id]: outcome })); } catch {} bump(); } };
