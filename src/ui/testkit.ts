// Local-only user-test timer. Visible only with ?test=1 (in the address or after the #). No network, no analytics:
// everything stays in this browser's localStorage until you press Export.
import { useSyncExternalStore } from 'react';
export interface TestEvent { what: string; ms: number; at: string }
export interface TestSession { participant: string; persona?: string; startedAt: string; events: TestEvent[]; firstLicenceMs?: number; stops: Record<string, number> }
const K = 'll.test.current', ALL = 'll.test.sessions';
const subs = new Set<() => void>(); let ver = 0; const bump = () => { ver++; subs.forEach(f => f()); };
export const useTestkit = () => { useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => ver); return testkit; };
const flag = () => { try { if (/[?&]test=1\b/.test(location.search + location.hash)) sessionStorage.setItem('ll.test', '1'); return sessionStorage.getItem('ll.test') === '1'; } catch { return false; } };
const load = <T,>(k: string, d: T): T => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const t0 = performance.now(); // time since this page load
const fresh = (participant = 'P1', at = Date.now()): TestSession => ({ participant, startedAt: new Date(at).toISOString(), events: [], stops: {} });
export const testkit = {
  get enabled() { return flag(); },
  current(): TestSession { return load<TestSession | null>(K, null) ?? fresh(); },
  sessions(): TestSession[] { return load<TestSession[]>(ALL, []); },
  elapsed() { const c = testkit.current(); return Date.now() - Date.parse(c.startedAt); },
  mark(what: string, extra: Partial<Pick<TestSession, 'persona'>> = {}) { if (!flag()) return; const c = testkit.current(); const ms = Date.now() - Date.parse(c.startedAt);
    c.events.push({ what, ms, at: new Date().toISOString() }); Object.assign(c, extra);
    if (what === 'first-licence' && c.firstLicenceMs === undefined) c.firstLicenceMs = ms;
    if (what.startsWith('stop-done:')) { const s = what.slice(10); if (c.stops[s] === undefined) c.stops[s] = ms; }
    save(K, c); bump(); },
  licence() { if (flag() && testkit.current().firstLicenceMs === undefined) testkit.mark('first-licence'); },
  stopDone(stop: string) { if (flag() && testkit.current().stops[stop] === undefined) testkit.mark(`stop-done:${stop}`); },
  newParticipant(code: string) { const all = testkit.sessions(); const c = load<TestSession | null>(K, null); if (c?.events.length) all.push(c); save(ALL, all); save(K, fresh(code || `P${all.length + 1}`)); bump(); },
  /** The first session on this page starts when the page started loading (navigation start), so the timer includes load time. */
  start() { if (flag() && !load(K, null)) { save(K, fresh('P1', Math.round(performance.timeOrigin))); bump(); } },
  exportJson() { const c = load<TestSession | null>(K, null); return JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Licence Lab user test, local only', pageLoadMs: Math.round(t0), sessions: [...testkit.sessions(), ...(c ? [c] : [])] }, null, 2); },
  clearAll() { try { localStorage.removeItem(K); localStorage.removeItem(ALL); } catch {} bump(); },
};

if (typeof window !== 'undefined') (window as any).__testkit = testkit;
