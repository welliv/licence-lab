// The ONE app's world: every number in scenarios.md, the ledger carrying over between scenarios, "done for you" and "can't undo".
import { describe, it, expect } from 'vitest';
import { World } from '../src/one/world';
import { SCENARIOS } from '../src/one/data/scenarios';
import { START, split, SONGS, PLAN } from '../src/one/data/cast';
import { shareCents, CATALOGUE } from '../src/engine/catalogue';

const $ = (x: number) => Math.round(x * 100);
const total = (w: World) => Object.values(w.s.bal).reduce((a, b) => a + b, 0);
const run = (w: World, ...keys: string[]) => { for (const k of keys) { const r = w.apply(k); expect(r.ok, `${k}: ${r.blocked ?? ''}`).toBe(true); } };
const bal = (w: World, who: string) => w.s.bal[who] / 100;

describe('scenarios.md numbers, 1 → 11 in order from a fresh start', () => {
  const w = new World(undefined, { now: () => Date.UTC(2026, 9, 18, 9) });
  it('starting wallets (§0.2)', () => {
    expect(w.s.bal).toEqual({ alice: 0, carol: 0, dave: 0, erin: 0, frank: 0, harbour: 0, bobagent: $(100), grace: $(10), clipagent: $(5000), modelco: $(500), mallory: 0 });
  });
  it('1. Sell a song: Bob\'s agent $95, Alice $3.25, Carol $1.00, Dave $0.75', () => {
    run(w, 's1.list', 's1.buy'); expect([bal(w, 'bobagent'), bal(w, 'alice'), bal(w, 'carol'), bal(w, 'dave')]).toEqual([95, 3.25, 1, 0.75]);
    expect(w.s.log.filter(l => l.sc === 's1').map(l => l.text)).toContain('Proof saved on Bitcoin');
  });
  it('2. Pick the licence: Grace $9, ClipAI\'s agent $4,950, +$0.65/$0.20/$0.15 then +$32.50/$10/$7.50', () => {
    run(w, 's2.personal'); expect([bal(w, 'grace'), bal(w, 'alice'), bal(w, 'carol'), bal(w, 'dave')]).toEqual([9, 3.9, 1.2, 0.9]);
    run(w, 's2.business', 's2.cheat'); expect([bal(w, 'clipagent'), bal(w, 'alice'), bal(w, 'carol'), bal(w, 'dave')]).toEqual([4950, 36.4, 11.2, 8.4]);
  });
  it('3. Check a licence: no money moves', () => { const before = { ...w.s.bal }; run(w, 's3.upload', 's3.check', 's3.edited', 's3.cheat'); expect(w.s.bal).toEqual(before); });
  it('4. Co-writers and remixes: Bob\'s agent $88, Frank $4.20, Alice +$2.80', () => {
    const a = bal(w, 'alice'); run(w, 's4.erin', 's4.alice', 's4.buy', 's4.cheat'); expect([bal(w, 'bobagent'), bal(w, 'frank'), +(bal(w, 'alice') - a).toFixed(2)]).toEqual([88, 4.2, 2.8]);
  });
  it('5. Stop selling and 6. Rights change hands: no money moves', () => { const before = { ...w.s.bal }; run(w, 's5.stop', 's5.try', 's5.earlier', 's5.cheat', 's6.hand', 's6.check', 's6.plan', 's6.cheat'); expect(w.s.bal).toEqual(before);
    expect(w.s.f.remixOwner).toBe('harbour'); expect(w.s.f.businessStopped).toBe(true); });
  it('7. Give an agent a budget: $13 spent overnight, $2 left; Bob\'s agent $75; the 40 orders are all refused', () => {
    const d = bal(w, 'dave'), c = bal(w, 'carol'), e = bal(w, 'erin'); run(w, 's7.budget', 's7.shop');
    expect([bal(w, 'bobagent'), +(bal(w, 'dave') - d).toFixed(2), +(bal(w, 'carol') - c).toFixed(2), +(bal(w, 'erin') - e).toFixed(2)]).toEqual([75, 4, 4.8, 4.2]);
    expect(w.s.log.at(-1)!.text).toBe('Bob woke up to 3 licences. $13.00 spent, $2.00 left today.');
    run(w, 's7.cheat'); expect(bal(w, 'bobagent')).toBe(75); expect(w.s.log.at(-1)!.text).toContain('all 40 refused');
  });
  it('8. License at scale: $2,250 for 500 videos, $750 left; Alice +$406.25, Carol +$725, Dave +$593.75, Erin +$525; ClipAI\'s agent $2,700', () => {
    const b = { ...w.s.bal }; run(w, 's8.budget', 's8.run', 's8.check'); const d = (k: string) => (w.s.bal[k] - b[k]) / 100;
    expect([bal(w, 'clipagent'), d('alice'), d('carol'), d('dave'), d('erin')]).toEqual([2700, 406.25, 725, 593.75, 525]); expect(w.s.f.videos).toBe(500);
    expect(w.s.log.some(l => l.text === '$2,250.00 spent, $750.00 left this month.')).toBe(true);
  });
  it('9. Subscribe to a catalogue: Harbour $41.58 then $83.16; Dave and Erin +$24.75, Alice +$7.92 each month; ClipAI\'s agent $2,601 then $2,502; the cut refuses the renewal', () => {
    const b = { ...w.s.bal }; run(w, 's9.subscribe'); const d = (k: string) => +((w.s.bal[k] - b[k]) / 100).toFixed(2);
    expect([bal(w, 'clipagent'), bal(w, 'harbour'), d('dave'), d('erin'), d('alice')]).toEqual([2601, 41.58, 24.75, 24.75, 7.92]);
    run(w, 's9.renew'); expect([bal(w, 'clipagent'), bal(w, 'harbour')]).toEqual([2502, 83.16]); expect(w.s.log.at(-2)!.text).toContain('$2,901.00 of this month\'s budget left');
    const c = { ...w.s.bal }; run(w, 's9.cut'); expect(w.s.bal).toEqual(c); expect(w.s.log.at(-1)!.text).toContain('$99 is more than the $50 budget');
  });
  it('10. Train an AI: ModelCo $450, Alice +$32.50, Carol +$10, Dave +$7.50', () => {
    const b = { ...w.s.bal }; run(w, 's10.buy', 's10.train', 's10.proof', 's10.cheat'); const d = (k: string) => (w.s.bal[k] - b[k]) / 100;
    expect([bal(w, 'modelco'), d('alice'), d('carol'), d('dave')]).toEqual([450, 32.5, 10, 7.5]);
  });
  it('11. Spot a fake: nothing spent; Bob\'s agent stays at $75', () => { const b = { ...w.s.bal }; run(w, 's11.fake', 's11.compare', 's11.cheat'); expect(w.s.bal).toEqual(b); expect(bal(w, 'bobagent')).toBe(75); });
  it('the final ledger matches the spec, and no money was made or lost', () => {
    expect(w.s.bal).toEqual({ alice: 49379, carol: 75100, dave: 66315, erin: 57870, frank: 420, harbour: 8316, bobagent: 7500, grace: 900, clipagent: 250200, modelco: 45000, mallory: 0 });
    expect(total(w)).toBe(Object.values(START).reduce((a, b) => a + b, 0)); expect(SCENARIOS.every(s => w.complete(s.id))).toBe(true);
    expect(w.s.log.filter(l => l.mark === 'grey')).toEqual([]); // nothing was "done for you" in order
  });
});

describe('one world: carry-over, done for you, can\'t undo', () => {
  it('starting at scenario 9 does what it needs first, in grey, and the money still adds up', () => {
    const w = new World(); run(w, 's9.subscribe');
    const grey = w.s.log.filter(l => l.mark === 'grey').map(l => l.text);
    expect(grey.some(t => t.startsWith('Done for you: Harbour Music now holds the rights to the remix (scenario 6)'))).toBe(true);
    expect(grey.some(t => t.startsWith('Done for you: Bob\'s agent bought the remix for $7.00 (scenario 4)'))).toBe(true);
    expect(grey.some(t => t.includes('(scenario 8)'))).toBe(true);
    expect(w.s.f.remixOwner).toBe('harbour'); expect(bal(w, 'harbour')).toBe(41.58); expect(bal(w, 'bobagent')).toBe(93);
    expect(total(w)).toBe(Object.values(START).reduce((a, b) => a + b, 0));
  });
  it('the same changes happen in any order (balances differ only by what ran)', () => {
    const a = new World(); run(a, 's10.buy'); const b = new World(); run(b, 's1.buy', 's10.buy');
    expect(a.s.bal.alice).toBe($(32.5)); expect(b.s.bal.alice - $(3.25)).toBe($(32.5));
  });
  it('can\'t undo: after scenario 5 the Business sale in scenario 2 explains itself', () => {
    const w = new World(); run(w, 's5.stop'); expect(w.isDone('s2.business')).toBe(true); // done for you first
    const w2 = new World(); w2.s.f.businessStopped = true; const r = w2.apply('s2.business'); expect(r.ok).toBe(false);
    expect(r.blocked).toBe('Alice stopped selling advert licences in scenario 5. Start again to see this step.');
  });
  it('can\'t undo: after the handover, scenario 4 can\'t sell the remix from Frank', () => {
    const w = new World(); w.s.f.remixOwner = 'harbour'; const r = w.apply('s4.buy'); expect(r.ok).toBe(false); expect(r.blocked).toContain('scenario 6');
  });
  it('scenario 1\'s playlist runs the same two steps again with another song and its own shares', () => {
    const w = new World(); run(w, 's1.list', 's1.buy'); w.pickSong('nightshift', 600); run(w, 's1.list', 's1.buy');
    expect(bal(w, 'bobagent')).toBe(89); expect(bal(w, 'carol')).toBe(1 + 4.8); expect(bal(w, 'erin')).toBe(1.2);
  });
  it('the price stepper changes the sale and the shares follow (largest remainder, same rule as the engine)', () => {
    const w = new World(); w.setFacts({ s1Price: 1300 }); run(w, 's1.list', 's1.buy');
    expect([w.s.bal.alice, w.s.bal.carol, w.s.bal.dave]).toEqual(shareCents(CATALOGUE[0], 1300)); expect(w.s.log.find(l => l.step === 'list')!.text).toContain('$13.00');
  });
  it('a buyer who runs short is topped up, and the log says so', () => {
    const w = new World(); w.s.bal.grace = 50; run(w, 's2.personal'); expect(w.s.log.some(l => l.text === 'Grace\'s wallet was topped up with $100.00 of test money.')).toBe(true); expect(bal(w, 'grace')).toBe(99.5);
  });
  it('Start again resets everything', () => { const w = new World(); run(w, 's1.buy', 's7.shop'); w.reset(); expect(w.s.bal).toEqual(START); expect(w.s.log).toEqual([]); expect(w.s.done).toEqual({}); });
  it('the shares rule matches the engine for every song and price', () => {
    for (const s of Object.values(SONGS)) { const t = CATALOGUE.find(c => c.cast === s.cast)!; for (let c = 100; c <= 20000; c += 100) expect(split(c, s.shares)).toEqual(shareCents(t, c)); }
    expect(split(PLAN.priceCents, PLAN.shares)).toEqual([4158, 2475, 2475, 792]);
  });
  it('a smaller budget in scenario 8 buys fewer videos and says why', () => { const w = new World(); w.setFacts({ clipMonth: 100_000 }); run(w, 's8.budget', 's8.run');
    expect(w.s.f.videos).toBe(222); expect(w.s.log.some(l => l.text.includes('were refused: the budget ran out'))).toBe(true); expect(5000 * 100 - w.s.bal.clipagent).toBeLessThanOrEqual(100_000); });
});

describe('the template rules hold for every scenario (scenarios.md §0.6)', () => {
  it('scenario 1 has 2 steps; every other has at most 4; the cheat is always last; 8 cheats in total', () => {
    const visible = SCENARIOS.map(s => s.steps.filter(x => !x.hidden)); expect(visible[0].length).toBe(2); visible.forEach(v => expect(v.length).toBeLessThanOrEqual(4));
    visible.forEach(v => v.forEach((x, i) => { if (x.cheat) expect(i).toBe(v.length - 1); })); expect(visible.flat().filter(x => x.cheat).length).toBe(8);
    expect(SCENARIOS.filter(s => !s.steps.some(x => x.cheat)).map(s => s.n)).toEqual([1, 8, 9]);
  });
  it('real test payments only in 1.2, 4.3 and 9.1 (100, 140 and 1,980 test coins), all under the 5,000 limit', () => {
    const w = new World(); const reals = SCENARIOS.flatMap(s => s.steps.filter(x => x.real && !x.hidden).map(x => [`${s.id}.${x.id}`, x.real!(w.ctx()).sats]));
    expect(reals).toEqual([['s1.buy', 100], ['s4.buy', 140], ['s9.subscribe', 1980]]);
  });
  it('one sentence each, at most 25 words; no two scenarios share a title or a first button', () => {
    const w = new World(); SCENARIOS.forEach(s => expect(s.sentence.split(/\s+/).length, s.title).toBeLessThanOrEqual(25));
    expect(new Set(SCENARIOS.map(s => s.title)).size).toBe(11); const firsts = SCENARIOS.map(s => s.steps.find(x => !x.hidden)!.button(w.ctx())); expect(new Set(firsts).size).toBe(11);
  });
});
