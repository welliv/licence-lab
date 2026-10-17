// S21 in the Lab: a price band signed once by Alice's main key, quotes signed by Echo's pricing key.
import { describe, it, expect } from 'vitest';
import { Lab } from '../src/engine/lab';
import { S21 } from '../src/scenarios/part5';
async function run(q: number) {
  const lab = new Lab('s21-' + q); S21.cast.forEach(id => lab.setUp(id)); await S21.setup?.(lab);
  const out: any[] = [];
  for (const st of S21.steps) { const inputs = Object.fromEntries((st.inputs ?? []).map(i => [i.key, i.key === 'q' ? q : i.default])); out.push(await st.run(lab, inputs as any)); }
  return out;
}
describe('S21 pricing key (Lab)', () => {
  it('a quote inside the band sells and verifies', async () => {
    const r = await run(21000); const last = r[r.length - 1]; expect(last.ok).toBe(true); expect(last.verdict.result.ok).toBe(true);
  });
  it('a quote above the band is refused (quote_band), so the pricing key cannot overcharge', async () => {
    const r = await run(40000); const last = r[r.length - 1]; expect(last.ok).toBe(false); expect(last.summary).toMatch(/quote_band|band/);
  });
});
