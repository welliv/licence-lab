import { describe, it, expect } from 'vitest';
import { ATTACKS, runAttack, meetsExpectation, prepareAttack, present } from '../src/engine/attacks';
describe('red team: every attack gets its expected result from the real library', () => {
  for (const a of ATTACKS) it(`${a.id} ${a.title} → ${a.expect.kind}${'by' in a.expect ? ' by ' + a.expect.by : ''}`, async () => {
    const o = await runAttack(a); expect(meetsExpectation(a, o), `${a.id}: got ${o.outcome} ${o.by ?? ''} — ${o.summary}`).toBe(true); });
  it('the untampered honest bundle passes all nine checks (control)', async () => { const { lab, honest } = await prepareAttack(ATTACKS[0]); const o = await present(lab, honest); expect(o.outcome).toBe('passed'); expect(o.verdict!.passed).toBe(9); });
});
