// The controller: runs a step (real test payment when the spec asks for one), then the real checks, lazily.
import { World, load } from './world';
import { stepByKey } from './data/scenarios';
import { music } from './music';
import { SONGS } from './data/cast';
import type { Move } from './types';

type Engine = typeof import('./prove');
let engine: Promise<Engine> | null = null;
/** The engine (crypto library, checks) loads on first use, never on first paint. */
export const loadEngine = () => engine ??= Promise.all([import('./prove'), music.load()]).then(([m, t]) => { m.useTracks(t); return m; });

const moveListeners = new Set<(m: Move[], key: string) => void>();
export const onMoves = (f: (m: Move[], key: string) => void) => { moveListeners.add(f); return () => { moveListeners.delete(f); }; };
export const world = new World(load(), { onMoves: (m, k) => moveListeners.forEach(f => f(m, k)) });
if (typeof window !== 'undefined' && !world.isDone('s1.list')) world.apply('s1.list'); // scenario 1, step 1 is done on load

export const notices = { blocked: {} as Record<string, string> };
const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, j) => setTimeout(() => j(new Error('timed out')), ms))]);

export async function runStep(key: string) {
  return world.queue(async () => {
    const r = stepByKey(key); if (!r || world.isDone(key)) return; const { step } = r;
    const blocked = world.blockedText(key); if (blocked) { notices.blocked[key] = blocked; world.emit(); return; }
    const args = step.prove(world.ctx()); let real; let realNote;
    const practice = typeof location !== 'undefined' && /[?&]practice=1\b/.test(location.search);
    if (step.real && practice) realNote = 'The test wallets weren\'t used this time, so this sale used test money in your browser.';
    else if (step.real) {
      const x = step.real(world.ctx()); world.setPending({ key, status: 'Paying with a real test payment…' });
      try { const eng = await timeout(loadEngine(), 10_000); const t0 = performance.now(); const r0 = await timeout(eng.realPay(key, x.sats, x.title, x.cast, s => world.setPending({ key, status: plainStatus(s) })), 40_000); real = { ...r0, ms: performance.now() - t0 }; }
      catch { realNote = 'The test wallets didn\'t answer, so this sale used test money in your browser.'; }
    } else world.setPending({ key, status: 'Working…' });
    let early: import('./prove').Proof | undefined;
    if (step.proveFirst) { try { const eng = await loadEngine(); early = await eng.prove(args.key, { ...args, onProgress: k => world.setPending({ key, status: `Licensing video ${k} of 500…` }) }); } catch { /* the ledger still moves; Proof says the check could not run */ } }
    if (key === 's1.buy') world.relog('s1.list');
    const res = world.apply(key, { real, realNote }); world.setPending(null);
    if (!res.ok) { if (res.blocked) notices.blocked[key] = res.blocked; world.emit(); return; }
    if (key === 's1.buy') music.playFull(SONGS[world.s.f.s1Song].cast, { onlyIfPlaying: true });
    try { const eng = await loadEngine();
      for (const k of res.ran) { const st = stepByKey(k)!.step; const a = k === key ? args : st.prove(world.ctx());
        try { world.setProof(k, k === key && early ? early : await eng.prove(a.key, a)); } catch (e) { world.setProofError(k, (e as Error).message); } } }
    catch (e) { for (const k of res.ran) world.setProofError(k, (e as Error).message); }
  });
}
const plainStatus = (s: string) => /wallets/.test(s) ? 'Making two free test wallets…' : /invoice/.test(s) ? 'Asking for the bill…' : /Paying (\d+)/.test(s) ? `Paying ${/Paying (\d+)/.exec(s)![1]} test coins…` : /Checking/.test(s) ? 'Checking the licence…' : 'Working…';
export function startAgain() { world.reset(); notices.blocked = {}; import('./prove').then(m => m.resetEngine()).catch(() => {}); world.apply('s1.list'); }

/** Make the test wallets for a scenario's real payment before the visitor taps (seller-only, at most 5,000 test coins). */
const WARM: Record<string, number> = { 's1.buy': 700, 's4.buy': 440, 's9.subscribe': 2280 };
export function warmFor(sc: string) { if (/[?&]practice=1\b/.test(location.search)) return; const key = Object.keys(WARM).find(k => k.startsWith(sc + '.')); if (!key || world.isDone(key)) return;
  void loadEngine().then(e => e.warm(key, WARM[key])).catch(() => {}); }
