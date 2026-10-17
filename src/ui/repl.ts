// window.lab: a small console API, like the sandbox REPL, but on the real library.
import { SCENARIOS, byId } from '../scenarios';
import { runScenario } from '../engine/runner';
import { ATTACKS, attackById, runAttack } from '../engine/attacks';
import { Lab } from '../engine/lab';
import * as mll from '../lib/mll/verify';
export function exposeRepl() {
  (window as any).lab = { scenarios: SCENARIOS, attacks: ATTACKS, library: mll, Lab,
    async run(id: string) { const r = await runScenario(byId(id)!); console.table(r.runs.map(x => ({ step: x.step.title, ok: x.out.ok, summary: x.out.summary }))); return r.lab; },
    async verify(b: any, chainLab?: Lab) { return (chainLab ?? new Lab()).verify(b); },
    async attack(id: string) { const o = await runAttack(attackById(id)!); console.log(o.outcome, o.by ?? '', o.summary); return o; },
    help: 'lab.run("s3"), lab.attack("A1"), lab.verify(bundle, lab), lab.scenarios, lab.attacks' };
}
