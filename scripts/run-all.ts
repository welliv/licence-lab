// Runs every scenario headless and prints what each step did. `npm run scenarios`
import { SCENARIOS } from '../src/scenarios';
import { runScenario, asExpected } from '../src/engine/runner';
let bad = 0;
for (const sc of SCENARIOS) { const { runs } = await runScenario(sc); console.log(`\nS${sc.n} ${sc.title}`);
  for (const r of runs) { const ok = asExpected(r.step, r.out); if (!ok) bad++; console.log(`  ${ok ? '✓' : '✗'} [${r.out.badge ?? '-'}] ${r.step.title}: ${r.out.summary}`); } }
console.log(bad ? `\n${bad} step(s) not as expected` : '\nAll steps behaved as described.'); process.exit(bad ? 1 : 0);
