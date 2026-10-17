// The main path, on the real library: three stops and the rights extra, with every "try to cheat".
import { describe, it, expect } from 'vitest';
import { Lab } from '../src/engine/lab';
import * as S from '../src/engine/story';

describe('main path', () => {
  const lab = new Lab('story-test');
  it('stop 1: you license "Rain" for 100 sats; it fans out 65/20/15', async () => {
    const r = await S.hearAndLicense(lab); expect(r.verdict.result.ok).toBe(true); expect(r.verdict.passed).toBe(9);
    expect(Number(r.bundle.offer.tags.find(t => t[0] === 'price')![1])).toBe(S.PRICE);
    expect(Object.fromEntries(r.split.map(s => [s.id, s.sats]))).toEqual({ alice: 65, carol: 20, dave: 15 }); expect(r.statements).toBe(2);
  });
  it('stop 1 cheat: a changed price fails check 1; one changed byte no longer matches the offer', async () => {
    const v = await S.cheatPrice(lab); expect(v.result.ok).toBe(false); expect(v.result.code).toMatch(/^offer_/);
    const a = S.cheatAudio(lab); expect(a.originalMatches).toBe(true); expect(a.changedMatches).toBe(false);
  });
  it('stop 2: Bob\'s agent buys inside the budget; the poisoned prompt is refused with 0 sats paid', async () => {
    const r = await S.agentBuys(lab); expect(r.verdict.result.ok).toBe(true); expect(r.spent).toBe(S.PRICE);
    const p = await S.poisonedPrompt(lab); expect(p.refused).toBe(true); expect(p.paid).toBe(0);
  });
  it('stop 2: 1,000 licences, one timestamp, inside the budget; a random sample re-checks', async () => {
    let last = 0; const r = await S.atScale(lab, S.SCALE, k => { last = k; });
    expect(r.n).toBe(1000); expect(r.refused).toBe(0); expect(last).toBe(1000); expect(r.oneProof).toBe(true);
    expect(r.spent).toBe(100_000); expect(r.spentToday).toBeLessThanOrEqual(r.cap); expect(r.sampleOk).toBe(r.sample); expect(r.sample).toBe(20);
  }, 120_000);
  it('stop 3: the button verifies; the regulator check passes; "Alice Official" is caught', async () => {
    expect((await S.licenseButton(lab)).result.ok).toBe(true);
    const g = await S.regulatorCheck(lab); expect(g.ok).toBe(true); expect(g.checks).toHaveLength(4);
    const f = await S.fakeCaught(lab); expect(f.result.ok).toBe(false); expect(f.result.code).toBe('rights_not_holder');
  });
});
describe('extra: rights change hands', () => {
  it('sale: earlier licence stays valid, Harbour sells, the old account fails (A23)', async () => {
    const lab = new Lab('x-sale'); const r = await S.rightsSale(lab); expect(r.earlier.result.ok).toBe(true); expect(r.newOwner.result.ok).toBe(true);
    const o = await S.cheatOldAccount(lab); expect(o.result.ok).toBe(false); expect(o.result.code).toBe('rights_transferred');
  });
  it('succession: one heir alone fails, two of three succeed, the lifetime licence stays valid', async () => {
    const r = await S.succession(new Lab('x-succ')); expect(r.oneHeir.result.ok).toBe(false); expect(r.heirs.result.ok).toBe(true); expect(r.earlier.result.ok).toBe(true);
  });
  it('stolen key: after the move to a new account, the thief fails; earlier licences stay valid', async () => {
    const r = await S.stolenKey(new Lab('x-stolen')); expect(r.thief.result.ok).toBe(false); expect(r.thief.result.code).toBe('rights_key_retired'); expect(r.earlier.result.ok).toBe(true);
  });
});
