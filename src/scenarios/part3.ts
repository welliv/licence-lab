import type { Scenario } from './types';
import { F, short, baseWorld, verdictOut, anchorAndVerify } from './common';
import { listing, purchase, signOffer, consent, vouch, onboardAva, tagNet } from '../engine/actions';
import { LAB_KIND, tagv } from '../engine/lab';

export const S10: Scenario = {
  id: 's10', n: 10, part: 3, emoji: '🏷️', title: 'A price change', complexity: 'medium', status: 'v1',
  summary: 'Ava raises the price. The new offer needs new consents, the old offer is retired, and licences already sold stay valid.',
  situation: "'Rain' becomes popular. Ava wants to raise the creator price.",
  education: 'Consents name an exact offer event id, so a new offer is not covered by old consents. Licences sold under the old offer keep their own bundle and stay valid.',
  how: [{ title: 'New offer', description: 'A new event id, with a note pointing old → new.' }, { title: 'Re-consent', description: 'Co-owners must sign again.' }, { title: 'Old licences', description: 'Still valid: they carry their own proof.' }],
  cast: ['ava', 'jay', 'nova', 'lena', 'mia', 'sam'], setup: async lab => { baseWorld(lab, { kinds: ['creator'] }); lab.setUp('mia'); const r = purchase(lab, 'mia', 'offer.creator', { name: 'bundle.old' }); await anchorAndVerify(lab, r.bundle, 'old'); },
  steps: [
    { id: 'new', actor: 'ava', to: 'relays', title: 'Sign the new offer', button: 'Sign new offer', narration: 'Ava signs a new creator offer at a higher price, plus a short note: "this replaces the old offer".', inputs: [{ key: 'price', label: 'New price (sats)', type: 'number', default: 3000 }],
      run: (lab, i) => { const o = signOffer(lab, 'ava', 'creator', { name: 'offer.creator2', price: Number(i.price) }); const note = lab.sign('ava', LAB_KIND.NOTE, [['e', lab.a['offer.creator'].id, '', 'replaced'], ['e', o.id, '', 'replacement']], 'New creator price for Rain.'); lab.publish(note, 'ava', 'replacement note');
        return { ok: true, badge: 'real', json: o, summary: `New offer ${short(o.id)} at ${i.price} sats. Old offer ${short(lab.a['offer.creator'].id)} is marked replaced.` }; } },
    { id: 'reuse', actor: 'echo', title: 'Try it: reuse the old consents', button: 'List with old consents', expectFail: true, narration: 'What if Echo lists the new offer with the old consents? They name the old event id, so check 3 fails.',
      run: lab => { lab.a['offer.creator2.consents'] = [...lab.a['offer.creator.consents']]; const l = listing(lab, 'offer.creator2'); lab.a['offer.creator2.consents'] = []; return { ok: l.forSale, badge: 'real', summary: `Refused: ${l.reason}.` }; } },
    { id: 'reconsent', actor: 'jay', to: 'relays', title: 'Co-owners consent again', button: 'Collect new consents', narration: 'Jay, Nova and Lena each tap Agree on the new offer.',
      run: lab => { ['jay', 'nova', 'lena'].forEach(w => consent(lab, w, 'offer.creator2')); const l = listing(lab, 'offer.creator2'); return { ok: l.forSale, badge: 'real', proves: [3], summary: `New offer for sale: ${l.reason}.` }; } },
    { id: 'retire', actor: 'ava', to: 'bitcoin', title: 'Retire the old offer', button: 'Revoke old offer', narration: 'Ava retires the old offer with a signed revocation anchored on Bitcoin. No new invoices are issued for it.',
      run: lab => { lab.advance(3 * 3600); const old = lab.a['offer.creator']; const rv = lab.lib.makeRevocation(lab.key('ava'), old.id, 'retire'); lab.publish(rv, 'ava', 'revocation ✍'); const b = lab.opReturn(lab.lib.revocationPayloadCompact(old.id, lab.key('ava')), 'Offer revocation (MLR2)'); (lab.a.retired ??= []).push(old.id);
        return { ok: true, badge: 'sim', json: rv, summary: `Revocation signed (real) and its 80-byte MLR2 record mined in simulated block ${b.height}.` }; } },
    { id: 'old', actor: 'mia', title: 'Old licence still valid', button: 'Verify the old licence', narration: 'Mia bought under the old offer hours before. Her licence stays valid: it was paid and timestamped before the revocation.',
      run: async lab => verdictOut(await lab.verify(lab.a['bundle.old']), 'Old licence') },
    { id: 'buyold', actor: 'sam', to: 'ava', title: 'Try it: buy the old offer now', button: 'Request the old offer', expectFail: true, narration: 'Sam\'s app still shows the old, cheaper offer. Ava\'s node refuses to invoice a retired offer.',
      run: lab => { const old = lab.a['offer.creator']; const refused = lab.a.retired?.includes(old.id); lab.flow('sam', 'ava', 'request (old offer)', 'refuse', false); return { ok: !refused, badge: 'real', summary: 'Refused: this offer was retired. The node points Sam to the new offer.' }; } },
  ],
  proven: 'What each buyer agreed to and paid, under the offer that was live at the time.',
  canGoWrong: [{ text: 'Change splits without asking: check 3 fails', attack: 'A3' }, { text: 'Buy the old offer just before it is retired', attack: 'A13' }],
  prompts: [{ title: 'Price change flow', prompt: 'Build a price change: sign a new offer, publish a replacement note, collect new consents, revoke the old offer with an MLR2 OP_RETURN, and prove old licences still verify.' }],
};

export const S11: Scenario = {
  id: 's11', n: 11, part: 3, emoji: '🛑', title: 'Revocation and a stolen key', complexity: 'expert', status: 'v1',
  summary: 'Ava stops ad sales, then her phone is stolen. See exactly which licences survive, which do not, and one honest gap.',
  situation: "A: Ava wants to stop selling 'Rain' for adverts. B: Ava's phone, with her signer, is stolen.",
  education: 'An offer revocation keeps licences whose invoice is more than 2 hours older than the revocation block. A binding revocation is strict: a licence counts only if a Bitcoin timestamp proves it existed before. Revocations are tiny signed OP_RETURN records (MLR2, 80 bytes).',
  how: [{ title: 'Offer revocation', description: '2-hour margin for clock and relay delays.' }, { title: 'Binding revocation', description: 'Strict, no margin.' }, { title: 'OP_RETURN', description: 'Very hard to dispute when it happened.' }],
  cast: ['ava', 'mia', 'scout', 'thief', 'distributor'],
  setup: async lab => { baseWorld(lab); lab.setUpAll(['mia', 'scout', 'sam', 'clipai']); lab.setNwc('scout', { maxPerPaymentSat: 50_000, dailyCapSat: 200_000 });
    const early = await anchorAndVerify(lab, purchase(lab, 'sam', 'offer.creator', { name: 'bundle.sam.creator' }).bundle, 'sam creator');
    lab.a['s11.mia'] = purchase(lab, 'mia', 'offer.advert', { name: 'bundle.mia.ad', invoiceTimestamp: lab.now - 3 * 3600 }).bundle;
    lab.a['s11.scout'] = purchase(lab, 'scout', 'offer.advert', { name: 'bundle.scout.ad', invoiceTimestamp: lab.now - 3600 }).bundle; void early; },
  steps: [
    { id: 'revoke', actor: 'ava', to: 'bitcoin', title: 'Stop selling for ads', button: 'Revoke the ad offer', narration: 'Ava taps "Stop selling for ads". She signs a revocation of that offer, and Echo anchors it on Bitcoin with OP_RETURN (an OP-RETURN-Bot style paid service).',
      run: lab => { const o = lab.a['offer.advert']; const rv = lab.lib.makeRevocation(lab.key('ava'), o.id, 'retire'); lab.publish(rv, 'ava', 'revocation ✍'); const payload = lab.lib.revocationPayloadCompact(o.id, lab.key('ava')); const b = lab.opReturn(payload, 'Ad offer revocation (MLR2)'); (lab.a.retired ??= []).push(o.id);
        return { ok: true, badge: 'sim', json: { revocationEvent: rv, opReturn: payload }, summary: `Signed revocation; 80-byte MLR2 record in simulated block ${b.height}. A real revocation on Mutinynet, from the recorded live run, is under the hood in Real runs.`, fields: [F('MLR2 payload', short(payload, 16)), F('bytes', payload.length / 2)], code: `const payload = revocationPayloadCompact(offer.id, avaSk) // "MLR2" + 12-byte id + BIP-340 sig\nawait opReturnBot.create(payload)` }; } },
    { id: 'after', actor: 'echo', title: 'Which ad licences survive?', button: 'Timestamp and verify both', narration: 'Mia\'s ad licence was invoiced 3 hours before the revocation; Scout\'s only 1 hour before. Both are timestamped in the next batch. The 2-hour rule decides.',
      run: async lab => { const m = await anchorAndVerify(lab, lab.a['s11.mia'], 'mia ad'); const s = await anchorAndVerify(lab, lab.a['s11.scout'], 'scout ad'); lab.a['s11.vm'] = m;
        return { ok: m.result.ok && !s.result.ok, badge: 'limit', verdict: s, trace: [`Mia (3 h before): ${m.result.ok ? '✓ valid' : '✗ ' + m.result.reason}`, `Scout (1 h before): ${s.result.ok ? '✓ valid' : '✗ voided: ' + s.result.code}`], summary: 'Mia keeps her licence. Scout\'s was inside the 2-hour window, so it is voided: an honest limit. The fix is to anchor at once (see A13).' }; } },
    { id: 'nonew', actor: 'mia', to: 'ava', title: 'No new ad sales', button: 'Try to buy an ad licence', expectFail: true, narration: 'After the revocation, Ava\'s node issues no new invoices for the ad offer.',
      run: lab => { const refused = lab.a.retired?.includes(lab.a['offer.advert'].id); lab.flow('mia', 'ava', 'request (ad)', 'refuse', false); return { ok: !refused, badge: 'real', summary: 'Refused: the ad offer is revoked.' }; } },
    { id: 'stolen', actor: 'ava', to: 'bitcoin', title: 'Phone stolen: one-tap revocation', button: 'Unlink my wallet', narration: 'Ava\'s phone is stolen. From her recovery contact\'s phone she uses one-tap revocation. This revokes her node binding and is anchored with OP_RETURN at once.',
      run: lab => { lab.advance(600); const bd = lab.a['binding.ava']; const rv = lab.lib.makeRevocation(lab.key('ava'), bd.id, 'compromise'); lab.publish(rv, 'ava', 'binding revocation ✍'); const b = lab.opReturn(lab.lib.revocationPayloadCompact(bd.id, lab.key('ava')), 'Binding revocation (MLR2)'); lab.a['s11.revH'] = b.height;
        return { ok: true, badge: 'sim', json: rv, summary: `Binding ${short(bd.id)} revoked in simulated block ${b.height}. Strict: no margin.` }; } },
    { id: 'thief-sells', actor: 'thief', to: 'mia', title: 'Thief sells with the old link', button: 'Thief sells a licence', expectFail: true, narration: 'The thief, holding Ava\'s key, keeps selling under her old binding. Anything sold after the revocation fails check 9.',
      run: async lab => { const r = purchase(lab, 'mia', 'offer.creator', { name: 'bundle.after' }); const v = await anchorAndVerify(lab, r.bundle, 'after revocation'); return verdictOut(v, 'Licence sold after the binding revocation'); } },
    { id: 'before-ok', actor: 'sam', title: 'Earlier licences survive', button: 'Verify Sam\'s earlier licence', narration: 'Sam\'s licence was timestamped before the binding revocation, so it stays valid.',
      run: async lab => verdictOut(await lab.verify(lab.a['bundle.sam.creator']), 'Sam\'s earlier licence') },
    { id: 'newbinding', actor: 'thief', to: 'mia', title: 'Open issue: thief links a new wallet', button: 'Thief links a new wallet', openIssue: true, narration: 'What if the thief uses the stolen key to sign a brand-new binding to his own node, and a new offer? Today the revocation names one binding id, not the whole key. Let\'s see what verifyLicence says.',
      run: async lab => { lab.makeNode('node.thief', 'thief', "Thief's node"); const nb = lab.bind('ava', 'node.thief'); const o = lab.lib.makeOffer(lab.key('ava'), lab.offerInput('ava', 'creator', { bindingId: nb.id, coOwners: [], priceSats: 500 }));
        lab.a['offer.thief'] = o; lab.a['offer.thief.binding'] = nb; lab.a['offer.thief.consents'] = []; const req = lab.lib.makePrivateRequest(lab.key('mia'), { offer: o, binding: nb, use: ['creator-video', 'worldwide', 'perpetual', 'non-exclusive', 'seconds=30'], network: tagNet(), notBefore: lab.notBefore() });
        const { rec } = lab.issueInvoice({ nodeId: 'node.thief', creditTo: 'thief', offer: o, binding: nb, consents: [], request: req.request, label: 'thief sale' }); const p = lab.pay('mia', rec.bolt11);
        const b = lab.bundle('bundle.thief', { offer: o, binding: nb, consents: [], request: req.request, invoice: rec.bolt11, preimage: p.preimage! }); const v = await anchorAndVerify(lab, b, 'thief');
        return { ...verdictOut(v, 'Thief\'s new-binding licence'), ok: !v.result.ok, badge: v.result.ok ? 'open' : 'real', summary: v.result.ok ? `OPEN ISSUE: it passes ${v.passed}/9. The binding revocation only covers binding ${short(lab.a['binding.ava'].id)}, so a new binding signed by the stolen key still verifies. Fix needed: a key-level revocation that check 9 also scans (and dropping the old key's vouching).` : 'Blocked.' }; } },
    { id: 'recover', actor: 'distributor', to: 'ava', title: 'Recover into a new key', button: 'Move the badge', narration: 'Ava recovers into a new key. Her distributor signs that the new key is the real Ava, and her badge moves to it.',
      run: lab => ({ ok: true, summary: '' }) },
  ],
  proven: 'Exactly when sales stopped, and which licences were bought before.',
  canGoWrong: [{ text: 'Revoking 1 hour after a sale voids it', attack: 'A13' }, { text: 'Thief uses the key after the revocation', attack: 'A12' }, { text: 'Thief signs a new binding (open issue)', attack: 'A12b' }, { text: 'Same thief after Ava rotates her key', attack: 'A12c' }, { text: 'An index hides the revocation', attack: 'A17' }],
  limits: ['A licence inside the 2-hour window before an offer revocation is voided.', 'A binding revocation alone does not stop a NEW binding signed by the stolen key (A12b). A key rotation does (A12c, part 6).'],
  prompts: [{ title: 'One-tap revocation', prompt: 'Build a one-tap revocation: sign a revocation for a binding or offer, encode it as an 80-byte MLR2 OP_RETURN, pay an OP-RETURN-Bot style service whose invoice description hash commits to the message, and show which licences still verify.' }],
};
S11.steps[7].run = lab => { const e = lab.sign('distributor', LAB_KIND.VOUCH, [['L', 'mll.vouch'], ['l', 'artist-key', 'mll.vouch'], ['p', lab.pub('ava', 'rotated')], ['replaces', lab.pub('ava')]], 'Ava has moved to a new key after a theft.'); lab.publish(e, 'distributor', 'vouch (new key)');
  return { ok: true, badge: 'real', json: e, summary: `New key ${short(lab.pub('ava', 'rotated'))} vouched by the distributor; it replaces ${short(lab.pub('ava'))}. Indexes move the ✓ badge.` }; };
void vouch; void onboardAva; void tagv;
export const PART3 = [S10, S11];
