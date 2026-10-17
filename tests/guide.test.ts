// Under the hood's list: 15 numbered scenarios in 5 groups, the rest under More; every scenario is reachable once, and plain step labels name real steps.
import { describe, it, expect } from 'vitest';
import { GUIDE, GUIDE_GROUPS, MORE, WALK } from '../src/ui/guide';
import { SCENARIOS, byId } from '../src/scenarios';
describe('Under the hood list', () => {
  it('15 numbered items in 5 groups, numbered 1..15 in group order', () => {
    expect(GUIDE.length).toBe(15); expect(GUIDE_GROUPS.length).toBe(5); expect(GUIDE.map(g => g.n)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    const order = GUIDE.map(g => GUIDE_GROUPS.findIndex(x => x.id === g.group)); expect([...order].sort((a, b) => a - b)).toEqual(order); expect(Math.min(...order)).toBe(0);
  });
  it('every scenario appears exactly once (15 + More), and old routes still resolve', () => {
    expect(new Set(WALK).size).toBe(WALK.length); expect([...WALK].sort()).toEqual(SCENARIOS.map(s => s.id).sort()); expect(MORE.length).toBe(SCENARIOS.length - 15);
    for (const id of WALK) expect(byId(id)).toBeTruthy();
  });
  it('plain step labels point at real steps, are short and free of jargon', () => {
    for (const g of GUIDE) { const sc = byId(g.id)!; for (const [k, v] of Object.entries(g.steps ?? {})) { expect(sc.steps.some(s => s.id === k), `${g.id}.${k}`).toBe(true); expect(v.split(' ').length).toBeLessThanOrEqual(8); expect(v).not.toMatch(/\b(sats?|invoice|preimage|nostr|relay|402|hash|bolt|nwc|kind)\b/i); }
      expect(g.line.split(' ').length).toBeLessThanOrEqual(25); expect(g.title.split(' ').length).toBeLessThanOrEqual(6); }
  });
  it('the first item is the simplest: one sale', () => { expect(GUIDE[0].id).toBe('s3'); expect(GUIDE[0].title).toBe('One sale'); });
});
