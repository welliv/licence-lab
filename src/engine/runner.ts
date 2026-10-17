import { Lab } from './lab';
import type { Out } from './actions';
import type { Scenario, Step } from '../scenarios/types';
export interface StepRun { step: Step; out: Out; ms: number; logFrom: number; flowFrom: number; error?: string; /** run out of order and refused by a guard: does not count as done */ guard?: boolean }
export const defaults = (s: Step) => Object.fromEntries((s.inputs ?? []).map(i => [i.key, i.default]));
/** Did the step behave as the scenario says it should? (honest action ok, refusal refused, open issue shown) */
export const asExpected = (s: Step, o: Out) => s.openIssue ? o.badge === 'open' : s.expectFail ? !o.ok : o.ok;
export async function prepare(sc: Scenario, seed = 'rain') { const lab = new Lab(seed); lab.setUpAll(sc.cast); lab.currentStep = 'setup'; await sc.setup?.(lab); lab.currentStep = undefined; lab.snapshot('setup'); return lab; }
export async function runStep(lab: Lab, s: Step, input: Record<string, any> = defaults(s), opts: { onError?: (e: Error) => string | undefined } = {}): Promise<StepRun> {
  lab.currentStep = s.id; const logFrom = lab.logs.length, flowFrom = lab.flows.length; const t0 = performance.now(); let out: Out, error: string | undefined;
  try { out = await s.run(lab, input); } catch (e: any) { error = e.message; const g = opts.onError?.(e); out = { ok: false, badge: 'fail', summary: g ?? `Error: ${e.message}` }; }
  const guard = !!error && !!opts.onError?.(new Error(error));
  lab.log({ from: s.actor, to: s.to, text: out.summary, badge: guard ? 'limit' : out.badge ?? (out.ok ? 'real' : 'fail'), ok: guard ? false : asExpected(s, out), code: out.code, data: out.json });
  lab.snapshot(s.id); lab.currentStep = undefined; return { step: s, out, ms: performance.now() - t0, logFrom, flowFrom, error, guard };
}
export async function runScenario(sc: Scenario, seed = 'rain') { const lab = await prepare(sc, seed); const runs: StepRun[] = []; for (const s of sc.steps) runs.push(await runStep(lab, s)); return { lab, runs }; }
