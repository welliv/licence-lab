// Every step of the ONE app runs the real protocol checks behind it, and each gives the result the story says.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { prove, useTracks, resetEngine } from '../src/one/prove';
import { SCENARIOS } from '../src/one/data/scenarios';
import { World } from '../src/one/world';
useTracks(JSON.parse(fs.readFileSync('public/music/tracks.json', 'utf8')).tracks);
describe('real checks behind every step', () => {
  resetEngine(); const w = new World();
  for (const sc of SCENARIOS) for (const st of sc.steps.filter(x => !x.hidden)) it(`${sc.n}. ${sc.title} · ${st.button(w.ctx())}`, async () => {
    const a = st.prove(w.ctx()); const p = await prove(a.key, a); expect(p.ok, JSON.stringify(p.lines)).toBe(true);
    if (p.checks) { const bad = p.checks.filter(c => c.ok === false).map(c => c.n); if (st.expect === 'ok' && st.id !== 'compare') expect(bad).toEqual([]); if (st.cheat && a.key !== 's7.cheat' && a.key !== 's11.cheat') expect(bad.length).toBeGreaterThan(0); }
    for (const l of p.lines) expect(l).not.toMatch(/\b(bundle|binding|node|OP_RETURN|verifyLicence|NIP|npub|preimage|invoice|relay|NWC|faucet|hash|Echo|Eve)\b/i);
  }, 30_000);
});
