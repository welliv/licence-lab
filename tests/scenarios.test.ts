import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../src/scenarios';
import { runScenario, asExpected } from '../src/engine/runner';
describe('all 27 scenarios run headless, every step behaves as described', () => {
  it('there are 27 scenarios', () => expect(SCENARIOS.length).toBe(27));
  for (const sc of SCENARIOS) it(`S${sc.n} ${sc.title}`, async () => {
    const { runs } = await runScenario(sc);
    for (const r of runs) { expect(r.error, `${sc.id}/${r.step.id}: ${r.error}`).toBeUndefined(); expect(asExpected(r.step, r.out), `${sc.id}/${r.step.id}: ${r.out.summary}`).toBe(true); }
  });
});
