// The one world: one ledger, one cast, one log. Persisted in localStorage; "Start again" resets it.
import { useSyncExternalStore } from 'react';
import { START, nameOf, usd, type Id } from './data/cast';
import { SCENARIOS, stepByKey, byId } from './data/scenarios';
import type { Arrow, Ctx, Done, Facts, Licence, Line, Move, ScId } from './types';
import type { Proof, RealInfo } from './prove';

export interface LogLine extends Line { sc: ScId; step: string; id: number; at: number; round?: number }
export interface FlowRow extends Arrow { sc: ScId; step: string; n: number; round?: number }
export interface Pending { key: string; status: string }
export interface State { v: 1; bal: Record<string, number>; done: Record<string, Done>; log: LogLine[]; flows: FlowRow[]; before: Partial<Record<ScId, Record<string, number>>>; f: Facts; seq: number; startedAt: number }
const KEY = 'one.v1';
export const freshFacts = (): Facts => ({ s1Song: 'rain', s1Price: 500, s1Round: 1, bobDay: 1500, bobSong: 1000, bobBudgetSet: false, bobSpentToday: 0, clipMonth: 300_000, clipBudgetSet: false, clipSpentMonth: 0, clipMonthNo: 1,
  remixOwner: 'frank', businessStopped: false, phoneCut: false, plan: false, days: 0, licences: [], firstRunSeen: false, videos: 0 });
export const freshState = (now = Date.now()): State => ({ v: 1, bal: { ...START }, done: {}, log: [], flows: [], before: {}, f: freshFacts(), seq: 0, startedAt: now });

// ---------- engine-free core (unit-tested) ----------
export interface Hooks { now?: () => number; onMoves?: (m: Move[], key: string) => void }
export class World {
  s: State; pending: Pending | null = null; private subs = new Set<() => void>(); private hooks: Hooks; private ver = 0; private q: Promise<unknown> = Promise.resolve();
  constructor(s?: State, hooks: Hooks = {}) { this.s = s ?? freshState(); this.hooks = hooks; }
  now() { return this.hooks.now?.() ?? Date.now(); }
  ctx(): Ctx { return { f: this.s.f, bal: this.s.bal, now: this.s.startedAt }; }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f); }; };
  version = () => this.ver;
  emit() { this.ver++; this.save(); this.subs.forEach(f => f()); }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* private mode: keep in memory */ } }
  setFacts(p: Partial<Facts>) { this.s.f = { ...this.s.f, ...p }; this.emit(); }
  isDone(key: string) { return !!this.s.done[key]; }
  /** A step can run when the steps before it (cheats aside) are done and nothing blocks it. */
  nextStep(sc: ScId) { const s = byId(sc)!; return s.steps.find(x => !x.hidden && !this.isDone(`${sc}.${x.id}`)); }
  blockedText(key: string) { const r = stepByKey(key); return r?.step.blocked?.(this.ctx()); }
  complete(sc: ScId) { const s = byId(sc)!; return s.steps.filter(x => !x.hidden && !x.cheat).every(x => this.isDone(`${sc}.${x.id}`)); }
  /** Run a step: first anything it needs ("done for you"), then its own effects. Real payments are handled by the caller via `real`. */
  apply(key: string, o: { auto?: boolean; real?: RealInfo; realNote?: string } = {}): { ok: boolean; blocked?: string; ran: string[] } {
    const r = stepByKey(key); if (!r) return { ok: false, ran: [] }; const { sc, step } = r; const ran: string[] = [];
    if (this.isDone(key)) return { ok: true, ran };
    // earlier steps of the same scenario come first (cheats are optional)
    for (const prev of sc.steps) { if (prev.id === step.id) break; if (prev.hidden || prev.cheat) continue; const k = `${sc.id}.${prev.id}`; if (!this.isDone(k)) { const x = this.apply(k, { auto: true }); ran.push(...x.ran); if (!x.ok) return { ...x, ran }; } }
    for (const n of step.needs ?? []) if (!n.test(this.ctx())) { const x = this.apply(n.run, { auto: true }); ran.push(...x.ran); if (!x.ok) return { ...x, ran }; }
    const blocked = step.blocked?.(this.ctx()); if (blocked) { this.emit(); return { ok: false, blocked, ran }; }
    const c = this.ctx(); const out = step.run(c); const at = this.now();
    if (!this.s.before[sc.id]) this.s.before[sc.id] = { ...this.s.bal };
    const lines: Line[] = [];
    for (const m of out.moves ?? []) if (m.from in this.s.bal && (this.s.bal[m.from] ?? 0) < m.cents && !(out.moves ?? []).some(x => x.to === m.from)) { // top up (only buyers ever run short)
      const need = Math.ceil((m.cents - this.s.bal[m.from]) / 10_000) * 10_000; this.s.bal[m.from] += need; lines.push({ mark: 'grey', text: `${nameOf(m.from)}'s wallet was topped up with ${usd(need)} of test money.` }); }
    for (const m of out.moves ?? []) { this.s.bal[m.from] = (this.s.bal[m.from] ?? 0) - m.cents; this.s.bal[m.to] = (this.s.bal[m.to] ?? 0) + m.cents; }
    if (out.facts) this.s.f = { ...this.s.f, ...out.facts }; if (out.licences) this.s.f = { ...this.s.f, licences: [...this.s.f.licences, ...out.licences.map((l: Licence) => ({ ...l, sc: sc.id, at: l.at === c.now ? at : l.at + (at - c.now) }))] };
    if (o.auto) lines.push({ mark: 'grey', text: `Done for you: ${step.doneText(c)} (scenario ${sc.n}).` }); else lines.push(...out.lines);
    const stamp = new Date(at).toLocaleTimeString('en-GB', { hour12: false });
    const round = sc.id === 's1' ? this.s.f.s1Round : undefined; for (const l of lines) this.s.log.push({ ...l, time: l.time ?? stamp, sc: sc.id, step: step.id, id: ++this.s.seq, at, round });
    const nFlow = this.s.flows.filter(x => x.sc === sc.id).length; (out.arrows ?? []).forEach((a, i) => this.s.flows.push({ ...a, sc: sc.id, step: step.id, n: nFlow + i + 1, round }));
    this.s.done[key] = { at, auto: o.auto, real: o.real, realNote: o.realNote, refused: out.refused, round: sc.id === 's1' ? this.s.f.s1Round : undefined };
    ran.push(key); if (out.moves?.length) this.hooks.onMoves?.(out.moves, key);
    this.emit(); return { ok: true, ran };
  }
  /** Refresh the log line of an earlier step (scenario 1's price can change until the sale). */
  relog(key: string) { const r = stepByKey(key); if (!r) return; const lines = r.step.run(this.ctx()).lines; const i = this.s.log.findIndex(l => l.sc === r.sc.id && l.step === r.step.id && l.round === this.s.f.s1Round);
    if (i >= 0 && lines[0]) this.s.log[i] = { ...this.s.log[i], ...lines[0] }; const fl = this.s.flows.find(x => x.sc === r.sc.id && x.step === r.step.id && x.round === this.s.f.s1Round); const a = r.step.run(this.ctx()).arrows?.[0]; if (fl && a) Object.assign(fl, a); this.emit(); }
  setProof(key: string, p: Proof) { const d = this.s.done[key]; if (d) { d.proof = p; this.emit(); } }
  setProofError(key: string, e: string) { const d = this.s.done[key]; if (d) { d.proofError = e; this.emit(); } }
  /** Scenario 1's playlist: pick another song and the same two steps run again. */
  pickSong(song: Facts['s1Song'], price: number) { const d = this.s.done; const r = this.s.f.s1Round; for (const k of ['s1.list', 's1.buy']) if (d[k]) { d[`${k}#${r}`] = d[k]; delete d[k]; } this.s.f = { ...this.s.f, s1Song: song, s1Price: price, s1Round: r + 1 }; this.emit(); }
  reset() { this.s = freshState(this.now()); this.pending = null; this.emit(); }
  setPending(p: Pending | null) { this.pending = p; this.ver++; this.subs.forEach(f => f()); }
  /** Serialise async work so steps never interleave. */
  queue<T>(f: () => Promise<T>): Promise<T> { const p = this.q.then(f, f); this.q = p.catch(() => {}); return p; }
}
export function load(): State | undefined { try { const j = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return j?.v === 1 ? j : undefined; } catch { return undefined; } }
export const SC_IDS = SCENARIOS.map(s => s.id);
export const useWorld = (w: World) => { useSyncExternalStore(w.subscribe, w.version); return w; };
