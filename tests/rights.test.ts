import { describe, it, expect } from 'vitest';
import { Lab } from '../src/engine/lab';
import { ATTACKS, runAttack } from '../src/engine/attacks';
import { rightsWorld, newSeller, sell, saleToHarbour } from '../src/scenarios/part6';
import { runScenario } from '../src/engine/runner';
import { byId } from '../src/scenarios';
import { checkTitle, titleDigest, titlePayload, makeTransfer, MLT1 } from '../src/lib/mll/rights';
import { onboardAva, signOffer } from '../src/engine/actions';

const cosignAll = (lab: Lab, e: any) => ['jay', 'nova', 'lena'].forEach(w => lab.cosign(w, e, 'co-owner'));
async function sold() { const lab = new Lab('rights'); await rightsWorld(lab); const t = saleToHarbour(lab, { anchor: false }); cosignAll(lab, t.event); lab.anchorTitle(t, 'sale'); newSeller(lab, 'harbour'); return { lab, t }; }

describe('rights transfer: sale', () => {
  it('payload is 36 bytes and commits to the co-signatures', () => { const p = titlePayload(titleDigest('a'.repeat(64), ['b'.repeat(64)])); expect(p.length / 2).toBe(36); expect(p.startsWith(MLT1)).toBe(true); expect(titleDigest('a'.repeat(64), ['b'.repeat(64)])).not.toBe(titleDigest('a'.repeat(64))); });
  it('new owner sells 9/9; older licence stays valid; old key refused', async () => {
    const { lab, t } = await sold(); const v = await sell(lab, 'harbour', 'offer.harbour', 'sam', 'h'); expect(v.result.ok).toBe(true); expect(v.passed).toBe(9); expect(v.result.title?.holder).toBe(lab.pub('harbour'));
    expect((await lab.verify(lab.a['bundle.mia.before'])).result.ok).toBe(true);
    const old = await sell(lab, 'ava', 'offer.creator', 'mia', 'o'); expect(old.result.code).toBe('rights_transferred'); expect(old.checks.find(c => c.status === 'fail')?.n).toBe(9); expect(old.result.reason).toContain(`block ${t.anchor!.height}`);
  });
  it('a transfer timestamped before the co-owners signed never counts, even after they sign', async () => {
    const lab = new Lab('rights2'); await rightsWorld(lab); const t = saleToHarbour(lab); cosignAll(lab, t.event); newSeller(lab, 'harbour');
    const v = await sell(lab, 'harbour', 'offer.harbour', 'sam', 'h'); expect(v.result.ok).toBe(false); expect(v.result.title?.steps[0].why).toMatch(/has not co-signed/);
    lab.anchorTitle(t, 'again with co-signatures'); expect((await sell(lab, 'harbour', 'offer.harbour', 'sam', 'h2')).result.ok).toBe(true);
  });
  it('without title records the verifier behaves exactly as before (no false refusals)', async () => { const lab = new Lab('rights3'); await rightsWorld(lab); lab.titleOrigin = undefined; const v = await lab.verify(lab.a['bundle.mia.before']); expect(v.result.ok).toBe(true); expect(v.result.title).toBeUndefined(); });
  it('a stranger key that never held the rights is refused once title records exist', async () => { const { lab } = await sold(); onboardAva(lab, 'mallory', { quiet: true }); signOffer(lab, 'mallory', 'creator', { name: 'offer.mallory', coOwners: [] }); const v = await sell(lab, 'mallory', 'offer.mallory', 'sam', 'm'); expect(v.result.code).toBe('rights_not_holder'); });
  it('grace: an invoice dated more than 2 h before the transfer block still counts (sale), not for rotation', async () => {
    const lab = new Lab('grace'); await rightsWorld(lab); const ch = lab.chain; const early = lab.now - 4 * 3600;
    const { purchase } = await import('../src/engine/actions'); const r = purchase(lab, 'sam', 'offer.creator', { name: 'g', seconds: 30, invoiceTimestamp: early });
    const t = saleToHarbour(lab, { anchor: false }); cosignAll(lab, t.event); lab.anchorTitle(t, 'sale'); lab.advance(1800); lab.stamp(lab.lib.grantDigest(r.bundle), 'g'); lab.anchorBatch(); lab.attachProof(r.bundle);
    expect((await lab.verify(r.bundle)).result.ok).toBe(true); void ch;
  });
});
describe('succession and estates', () => {
  it('S26 and S27 run as described', async () => { for (const id of ['s25', 's26', 's27']) { const { runs } = await runScenario(byId(id)!); for (const r of runs) expect(r.error, `${id}/${r.step.id}`).toBeUndefined(); } });
  it('2 of 3 plan keys take over; 1 does not; a plan timestamped after the takeover does not count', async () => {
    const lab = new Lab('succ'); await rightsWorld(lab); const plan = lab.addPlan('ava', { x: '*', threshold: 2, keys: ['iris', 'leo', 'rosa'].map(k => ({ pubkey: lab.pub(k), role: 'heir' })) });
    const one = lab.addTransfer('leo', { x: '*', from: lab.pub('ava'), to: lab.pub('leo'), reason: 'succession', plan: plan.event.id });
    const two = lab.addTransfer('rosa', { x: '*', from: lab.pub('ava'), to: lab.pub('estate'), reason: 'succession', plan: plan.event.id }, { anchor: false }); lab.cosign('iris', two.event, 'plan-key'); lab.anchorTitle(two, 'takeover');
    const t = await lab.titleAt(lab.pub('estate')); expect(t.ok).toBe(true); expect(t.steps.find(s => s.id === one.event.id)?.why).toMatch(/needs 2 of 3/); expect(t.via?.signers?.length).toBe(2);
    expect((await lab.titleAt(lab.pub('ava'))).code).toBe('rights_transferred');
  });
  it('owner-needs: with a recovery plan, the owner key alone (or a thief holding it) cannot sell or rotate', async () => {
    const lab = new Lab('guard'); await rightsWorld(lab); lab.addPlan('ava', { x: '*', threshold: 2, ownerNeeds: 1, keys: ['iris', 'leo', 'rosa'].map(k => ({ pubkey: lab.pub(k), role: 'guardian' })) });
    const thief = lab.addTransfer('ava', { x: '*', from: lab.pub('ava'), to: lab.pub('mallory'), reason: 'rotation' }); let t = await lab.titleAt(lab.pub('mallory')); expect(t.ok).toBe(false); expect(t.steps.find(s => s.id === thief.event.id)?.why).toMatch(/needs 1 plan key/);
    const real = lab.addTransfer('ava', { x: '*', from: lab.pub('ava'), to: lab.pub('ava', 'rotated'), reason: 'rotation' }, { anchor: false }); lab.cosign('rosa', real.event, 'plan-key'); lab.anchorTitle(real, 'rotation'); t = await lab.titleAt(lab.pub('ava', 'rotated')); expect(t.ok).toBe(true);
  });
  it('court: undecided unless the verifier trusts the voucher', async () => {
    const lab = new Lab('court'); await rightsWorld(lab); const c = lab.addTransfer('estate', { x: '*', from: lab.pub('ava'), to: lab.pub('estate'), reason: 'court' });
    expect((await lab.titleAt(lab.pub('estate'))).steps[0].why).toMatch(/protocol cannot decide/); lab.courtVouch('court', c.event, 'X'); expect((await lab.titleAt(lab.pub('estate'))).ok).toBe(false);
    lab.titleTrust = [lab.pub('court')]; const t = await lab.titleAt(lab.pub('estate')); expect(t.ok).toBe(true); expect(t.limit).toMatch(/court order/);
    lab.titleTrust = [lab.pub('mallory')]; expect((await lab.titleAt(lab.pub('estate'))).ok).toBe(false);
  });
  it('a forged transfer (edited after signing) is void', async () => { const { lab } = await sold(); const e = makeTransfer(lab.key('ava'), { x: lab.trackHash, from: lab.pub('ava'), to: lab.pub('harbour'), reason: 'sale' }); const forged = { ...e, tags: e.tags.map(t => t[0] === 'to' ? ['to', lab.pub('mallory')] : t) };
    const t = await checkTitle(lab.trackHash, lab.pub('mallory'), lab.chain.tip.height, lab.chain, { transfers: [{ event: forged as any }] }, { origin: lab.pub('ava') }); expect(t.ok).toBe(false); expect(t.steps[0].why).toMatch(/not validly signed/); });
});
describe('rights attacks fail for the right reason', () => {
  const want: Record<string, RegExp> = { A12c: /retired/, A20: /does not count: the plan needs 2 of 3/, A21: /does not count: this key had already handed the rights on/, A22: /does not count: this key had already handed the rights on/, A23: /handed on/ };
  for (const [id, re] of Object.entries(want)) it(id, async () => { const o = await runAttack(ATTACKS.find(a => a.id === id)!); expect(o.outcome).toBe('blocked'); expect(o.verdict?.result.reason).toMatch(re); });
  it('A22: the first timestamped sale wins and the second is void as a double sale', async () => { const o = await runAttack(ATTACKS.find(a => a.id === 'A22')!); const st = o.verdict!.result.title!.steps; expect(st[0].ok).toBe(true); expect(st[1].why).toMatch(/double sale/); });
  it('A20: the void step says the plan needs 2', async () => { const o = await runAttack(ATTACKS.find(a => a.id === 'A20')!); expect(o.verdict!.result.title!.steps.some(s => /needs 2 of 3/.test(s.why ?? ''))).toBe(true); });
});
