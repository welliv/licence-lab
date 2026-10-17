import { Lab } from './lab';
import type { Out } from './actions';
import type { Scenario, Step } from '../scenarios/types';
export interface StepRun { step: Step; out: Out; ms: number; logFrom: number; flowFrom: number; error?: string }
export const defaults = (s: Step) => Object.fromEntries((s.inputs ?? []).map(i => [i.key, i.default]));
/** Did the step behave as the scenario says it should? (honest action ok, refusal refused, open issue shown) */
export const asExpected = (s: Step, o: Out) => s.openIssue ? o.badge === 'open' : s.expectFail ? !o.ok : o.ok;
export async function prepare(sc: Scenario, seed = 'rain') { const lab = new Lab(seed); lab.setUpAll(sc.cast); lab.currentStep = 'setup'; await sc.setup?.(lab); lab.currentStep = undefined; lab.snapshot('setup'); return lab; }
export async function runStep(lab: Lab, s: Step, input: Record<string, any> = defaults(s)): Promise<StepRun> {
  lab.currentStep = s.id; const logFrom = lab.logs.length, flowFrom = lab.flows.length; const t0 = performance.now(); let out: Out, error: string | undefined;
  try { out = await s.run(lab, input); } catch (e: any) { error = e.message; out = { ok: false, badge: 'fail', summary: `Error: ${e.message}` }; }
  lab.log({ from: s.actor, to: s.to, text: out.summary, badge: out.badge ?? (out.ok ? 'real' : 'fail'), ok: asExpected(s, out), code: out.code, data: out.json });
  lab.snapshot(s.id); lab.currentStep = undefined; return { step: s, out, ms: performance.now() - t0, logFrom, flowFrom, error };
}
export async function runScenario(sc: Scenario, seed = 'rain') { const lab = await prepare(sc, seed); const runs: StepRun[] = []; for (const s of sc.steps) runs.push(await runStep(lab, s)); return { lab, runs }; }
