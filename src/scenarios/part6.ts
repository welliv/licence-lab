// Part 6: rights change hands. Sale of rights, planned succession, an estate with no plan.
// Built on the Lab's rights extension (src/lib/mll/rights.ts): transfers, plans and co-signatures are real signed
// events; their Bitcoin timestamps are "MLT1" OP_RETURNs in the simulated chain; verifyLicence checks the chain of title.
import type { Scenario } from './types';
import { F, short, baseWorld, verdictOut, anchorAndVerify, purchase } from './common';
import { onboardAlice, signOffer, consent, type Out } from '../engine/actions';
import type { Lab, Verdict } from '../engine/lab';
import { tagsOf } from '../lib/mll/events';

/** Alice, Rain released with Carol, Dave and Erin, Bob's licence anchored, and the verifier told Alice's key is the original owner (vouched in S1). */
export async function rightsWorld(lab: Lab) {
  baseWorld(lab); lab.setUpAll(['bob', 'grace']); lab.titleOrigin = lab.pub('alice');
  const r = purchase(lab, 'bob', 'offer.creator', { name: 'bundle.bob.before', seconds: 60 }); await anchorAndVerify(lab, r.bundle, 'Bob before'); return r.bundle;
}
export const coOwnersOf = (lab: Lab) => tagsOf(lab.a['offer.creator'], 'p').map(p => ({ pubkey: p[1], role: p[2], bps: Number(p[3]) }));
/** A new owner (or the estate) gets a key, a node, a binding and an offer for "Rain", with the co-owners' consents. */
export function newSeller(lab: Lab, who: string, price = 2_000) {
  lab.setUp(who); onboardAlice(lab, who, { quiet: true }); signOffer(lab, who, 'creator', { name: `offer.${who}`, price });
  for (const c of ['carol', 'dave', 'erin']) consent(lab, c, `offer.${who}`); return lab.a[`offer.${who}`];
}
export async function sell(lab: Lab, seller: string, offerName: string, buyer: string, name: string) {
  lab.advance(600); const r = purchase(lab, buyer, offerName, { artist: seller, name, seconds: 60 }); lab.advance(1800); return anchorAndVerify(lab, r.bundle, name);
}
export function saleToHarbour(lab: Lab, o: { anchor?: boolean; to?: string } = {}) {
  return lab.addTransfer('alice', { x: lab.trackHash, from: lab.pub('alice'), to: lab.pub(o.to ?? 'harbour'), reason: 'sale', coOwners: coOwnersOf(lab), note: 'Alice sells her rights in "Rain" to Harbour Music. Co-owners keep their shares.' }, { anchor: o.anchor });
}
export const titleFields = (v: Verdict, lab: Lab) => { const t = v.result.title; if (!t) return [];
  const who = (k: string) => { const id = ['alice', 'harbour', 'estate', 'mallory', 'thief', 'heidi', 'ivan', 'judy'].find(id => lab.pub(id) === k || lab.pub(id, 'rotated') === k); return id ? lab.name(id) : short(k, 6); }; const who2 = (k: string) => who(k) + (Object.keys(lab.sk).some(s => s.endsWith('/rotated') && lab.pub(s.split('/')[0], 'rotated') === k) ? ' (new key)' : '');
  return [F('rights holder at that block', who2(t.holder), false), ...t.steps.map((s, i) => F(`title record ${i + 1} (${s.reason})`, `${who2(s.from)} → ${who2(s.to)} · ${s.height ? 'block ' + s.height : 'no timestamp'} · ${s.ok ? 'counts' : 'void: ' + s.why}`, false))]; };
const out = (v: Verdict, lab: Lab, okText?: string): Out => { const o = verdictOut(v, 'Licence', okText); return { ...o, fields: [...(o.fields ?? []).slice(0, 2), ...titleFields(v, lab)] }; };

export const S25: Scenario = {
  id: 's25', n: 25, part: 6, emoji: '🤝', title: 'Alice sells the rights to "Rain"', complexity: 'medium', status: 'later',
  summary: 'Alice sells her rights to a publisher. New licences must come from the publisher; licences sold before stay valid.',
  situation: 'Harbour Music offers Alice a lump sum for her rights in "Rain". Carol, Dave and Erin keep their shares and must agree.',
  education: 'A transfer record is a signed note: "my rights in this track now belong to this key". Co-owners co-sign it. It counts only once it is timestamped on Bitcoin, and the first timestamped transfer wins.',
  how: [{ title: 'Transfer record', description: 'Signed by Alice. Names the track hash, the new key and the co-owners.' }, { title: 'Co-signatures', description: 'Each co-owner signs that they agree.' }, { title: 'Timestamp', description: 'A tiny OP_RETURN ("MLT1" and the record id) fixes the date.' }, { title: 'Chain of title', description: 'Check 9 walks the records from Alice\'s vouched key to today.' }],
  cast: ['alice', 'carol', 'dave', 'erin', 'harbour', 'bob', 'grace'],
  setup: async lab => { await rightsWorld(lab); },
  steps: [
    { id: 'sign', actor: 'alice', to: 'harbour', title: 'Signs the transfer to Harbour', button: 'Sign transfer', narration: 'Alice signs: "my rights in Rain now belong to Harbour Music". The record names Carol, Dave and Erin, who keep their shares.',
      run: lab => { const r = saleToHarbour(lab, { anchor: false }); lab.a.transfer = r; return { ok: true, badge: 'real', json: r.event, summary: `Transfer ${short(r.event.id)} signed by Alice. Not timestamped yet, so it moves nothing yet.`, fields: [F('kind', '3417 (transfer, draft kind)'), F('to', short(lab.pub('harbour'), 10)), F('co-owners who must agree', 'Carol, Dave, Erin', false)] }; } },
    { id: 'early', actor: 'harbour', title: 'Try it: sells before anyone agrees', button: 'Sell too early', expectFail: true, narration: 'Harbour timestamps the transfer and sells at once, before the co-owners have co-signed. The timestamp fixes what was signed at that moment.',
      run: async lab => { lab.anchorTitle(lab.a.transfer, 'rights transfer (sale), no co-signatures yet'); newSeller(lab, 'harbour'); const v = await sell(lab, 'harbour', 'offer.harbour', 'grace', 'bundle.grace.early'); return out(v, lab); } },
    { id: 'cosign', actor: 'carol', to: 'harbour', title: 'Co-signs with Dave and Erin', button: 'Co-sign and timestamp', narration: 'Each co-owner signs that they agree to the sale. Their shares stay as they were. Then the transfer, with their signatures, is timestamped on Bitcoin.',
      run: lab => { const t = lab.a.transfer.event; const c = ['carol', 'dave', 'erin'].map(w => lab.cosign(w, t, 'co-owner')); const r = lab.anchorTitle(lab.a.transfer, 'rights transfer (sale) with co-signatures'); lab.a.transferDone = r;
        return { ok: true, badge: 'real', json: c[0], summary: `3 co-signatures on transfer ${short(t.id)}, timestamped with them in block ${r.anchor!.height}. The rights now belong to Harbour.`, fields: [...c.map((x, i) => F(['Carol', 'Dave', 'Erin'][i], short(x.id))), F('OP_RETURN', 'MLT1 + digest of record and co-signatures (36 bytes)', false)] }; } },
    { id: 'new', actor: 'harbour', to: 'grace', title: 'Sells a licence', button: 'Sell as Harbour', narration: 'Harbour now holds the rights. Grace buys a licence from Harbour\'s own key and node.',
      run: async lab => { if (!lab.a['offer.harbour']) newSeller(lab, 'harbour'); const v = await sell(lab, 'harbour', 'offer.harbour', 'grace', 'bundle.grace.harbour'); return out(v, lab, `Valid, 9/9: Harbour holds the rights since block ${(lab.a.transferDone ?? lab.a.transfer).anchor?.height}.`); } },
    { id: 'before', actor: 'bob', title: 'Checks his older licence', button: 'Check Bob\'s licence', narration: 'Bob bought from Alice before the sale. Is his licence still good?',
      run: async lab => out(await lab.verify(lab.a['bundle.bob.before']), lab, 'Still valid, 9/9: it was timestamped before the transfer.') },
    { id: 'old', actor: 'alice', to: 'bob', title: 'Try it: her old key sells again', button: 'Sell with the old key', expectFail: true, narration: 'Alice (or anyone with her key) keeps selling "Rain" after the sale.',
      run: async lab => out(await sell(lab, 'alice', 'offer.creator', 'bob', 'bundle.bob.after'), lab) },
  ],
  proven: 'Rights moved from Alice\'s key to Harbour\'s key with every co-owner\'s signature, at a Bitcoin-fixed date. Licences before that date stay valid; new ones must come from Harbour.',
  canGoWrong: [{ text: 'Alice sells the same rights twice', attack: 'A22' }, { text: 'Alice\'s old key keeps selling', attack: 'A23' }, { text: 'A thief with Alice\'s key sells the rights', attack: 'A21' }],
  limits: ['The verifier must fetch transfer records from relays. If every relay hides one, it is not seen (the same limit as revocations; several relays and indexes help).', 'The first owner is the key that vouching (S1) says is Alice. The protocol does not decide who wrote the song.', 'Buyer agents should check the title before paying, or they may pay an old key for a licence that will not verify.'],
  prompts: [{ title: 'Sell my rights', prompt: 'Echo, prepare a transfer of my rights in "Rain" to Harbour Music\'s key and ask Carol, Dave and Erin to co-sign.' }],
};

export const S26: Scenario = {
  id: 's26', n: 26, part: 6, emoji: '🕊️', title: 'Planned succession', complexity: 'advanced', status: 'later',
  summary: 'Alice names three people in a succession plan. After her death, two of them together move the rights to a new key.',
  situation: 'Alice wants her music to keep earning for her family. She names her daughter Heidi, her brother Ivan and her executor Judy. Any two can act.',
  education: 'A succession plan is signed and timestamped while Alice is alive. A takeover needs the number of plan keys she chose (2 of 3). One key alone cannot do it. After the takeover Alice\'s old key cannot sell, and the new key can.',
  how: [{ title: 'Plan', description: 'Signed by Alice: three keys, any two may take over. Timestamped.' }, { title: 'Takeover', description: 'A transfer signed by plan keys, naming the plan.' }, { title: 'Threshold', description: 'Fewer signers than the plan asks for: the takeover is void.' }],
  cast: ['alice', 'heidi', 'ivan', 'judy', 'estate', 'bob', 'grace'],
  setup: async lab => { await rightsWorld(lab); },
  steps: [
    { id: 'plan', actor: 'alice', title: 'Signs her succession plan', button: 'Sign plan', narration: 'Alice names Heidi and Ivan (heirs) and Judy (executor). Any 2 of the 3 may take over. The plan is timestamped on Bitcoin.',
      inputs: [{ key: 'threshold', label: 'Signatures needed', type: 'select', default: '2', options: ['1', '2', '3'], hint: '2 of 3 is the usual choice' }],
      run: (lab, i) => { const p = lab.addPlan('alice', { x: '*', threshold: Number(i.threshold), keys: [{ pubkey: lab.pub('heidi'), role: 'heir' }, { pubkey: lab.pub('ivan'), role: 'heir' }, { pubkey: lab.pub('judy'), role: 'executor' }], note: 'If I die, any two of Heidi, Ivan and Judy may move my music rights to a new key.' }); lab.a.plan = p;
        return { ok: true, badge: 'real', json: p.event, summary: `Plan ${short(p.event.id)}: ${i.threshold} of 3 keys, timestamped in block ${p.anchor!.height}.`, fields: [F('kind', '3418 (succession plan, draft kind)'), F('keys', 'Heidi, Ivan, Judy', false), F('needed', `${i.threshold} of 3`, false), F('covers', 'all of Alice\'s tracks', false)] }; } },
    { id: 'one', actor: 'ivan', title: 'Try it: takes over alone', button: 'Take over alone', expectFail: true, narration: 'Alice has died. Ivan signs a takeover by himself and starts selling from his own key.',
      run: async lab => { lab.advance(86400 * 30); lab.addTransfer('ivan', { x: '*', from: lab.pub('alice'), to: lab.pub('ivan'), reason: 'succession', plan: lab.a.plan.event.id }); newSeller(lab, 'ivan'); return out(await sell(lab, 'ivan', 'offer.ivan', 'grace', 'bundle.grace.ivan'), lab); } },
    { id: 'takeover', actor: 'judy', to: 'estate', title: 'Takes over with Heidi (2 of 3)', button: 'Sign takeover', narration: 'Judy signs a takeover to a new estate key; Heidi co-signs. Two of three: the plan is met. The record is timestamped.',
      run: lab => { const r = lab.addTransfer('judy', { x: '*', from: lab.pub('alice'), to: lab.pub('estate'), reason: 'succession', plan: lab.a.plan.event.id }, { anchor: false }); lab.cosign('heidi', r.event, 'plan-key'); lab.anchorTitle(r, 'takeover'); lab.a.takeover = r;
        return { ok: true, badge: 'real', json: r.event, summary: `Takeover ${short(r.event.id)} signed by Judy and Heidi, timestamped in block ${r.anchor!.height}.`, fields: [F('signers', 'Judy (executor), Heidi (heir)', false), F('new key', short(lab.pub('estate'), 10))] }; } },
    { id: 'estate', actor: 'estate', to: 'grace', title: 'Sells a licence', button: 'Sell as the estate', narration: 'The estate key gets its own node and sells a licence to Grace.',
      run: async lab => { newSeller(lab, 'estate'); return out(await sell(lab, 'estate', 'offer.estate', 'grace', 'bundle.grace.estate'), lab, 'Valid, 9/9: the estate holds the rights by the plan.'); } },
    { id: 'frozen', actor: 'alice', to: 'bob', title: 'Try it: her old key sells', button: 'Sell with Alice\'s key', expectFail: true, narration: 'Someone who has Alice\'s old phone keeps selling under her key.',
      run: async lab => out(await sell(lab, 'alice', 'offer.creator', 'bob', 'bundle.bob.frozen'), lab) },
    { id: 'before', actor: 'bob', title: 'Checks a licence from Alice\'s lifetime', button: 'Check Bob\'s licence', narration: 'Bob bought from Alice years ago.',
      run: async lab => out(await lab.verify(lab.a['bundle.bob.before']), lab, 'Still valid, 9/9: it was timestamped before the takeover.') },
  ],
  proven: 'Rights moved to a new key by the plan Alice chose, signed by enough of the people she named. Her old key is frozen; licences from her lifetime stay valid.',
  canGoWrong: [{ text: 'A fake heir signs alone', attack: 'A20' }, { text: 'Heirs lose their keys: the plan can name more keys than it needs' }],
  limits: ['The protocol cannot see a death. The plan trusts the people Alice named; any two could act early. Alice chooses the number.', 'Co-owners are not asked; their shares stay as they were.'],
  prompts: [{ title: 'Set up my succession', prompt: 'Echo, draft a succession plan: Heidi, Ivan and Judy, any two of three.' }],
};

export const S27: Scenario = {
  id: 's27', n: 27, part: 6, emoji: '🏛️', title: 'An estate with no plan', complexity: 'expert', status: 'not in v1',
  summary: 'Alice dies without a plan and her key is lost. The protocol cannot decide who inherits. A court does.',
  situation: 'Alice\'s family has no key and no plan. Her estate goes to court and gets an order naming the estate as owner.',
  education: 'With no plan, nothing Alice signed says who comes next. The estate publishes a transfer, and a court registry vouches for it. Each verifier decides whether it trusts that voucher. This is an honest limit, not a protocol decision.',
  how: [{ title: 'Estate transfer', description: 'Signed by the estate\'s new key, reason "court".' }, { title: 'Voucher', description: 'A signed note by a court registry naming the order.' }, { title: 'Trust is chosen', description: 'Verifiers list the vouchers they trust.' }],
  cast: ['alice', 'estate', 'court', 'bob', 'grace'],
  setup: async lab => { await rightsWorld(lab); },
  steps: [
    { id: 'claim', actor: 'estate', title: 'Claims "Rain" (no plan)', button: 'Publish estate transfer', expectFail: true, narration: 'The estate signs a transfer from Alice\'s key to its own, reason "court", and timestamps it. Then it sells to Grace.',
      run: async lab => { lab.advance(86400 * 90); lab.a.court = lab.addTransfer('estate', { x: '*', from: lab.pub('alice'), to: lab.pub('estate'), reason: 'court', court: 'Probate case 2027/114' }); newSeller(lab, 'estate');
        const v = await sell(lab, 'estate', 'offer.estate', 'grace', 'bundle.grace.court'); const o = out(v, lab); return { ...o, ok: false, badge: 'limit', summary: `Not decided by the protocol: ${v.result.reason}.` }; } },
    { id: 'vouch', actor: 'court', to: 'estate', title: 'Vouches for the court order', button: 'Publish court voucher', narration: 'The court registry signs: "this transfer follows court order 2027/114".',
      run: lab => { const v = lab.courtVouch('court', lab.a.court.event, 'Probate case 2027/114'); return { ok: true, badge: 'real', json: v, summary: `Voucher ${short(v.id)} signed by the court registry.`, fields: [F('kind', '1985 (NIP-32 label)'), F('names transfer', short(lab.a.court.event.id))] }; } },
    { id: 'trusting', actor: 'bob', title: 'Checks, trusting the court', button: 'Check, trusting the court', narration: 'Grace\'s platform lists the court registry as a voucher it trusts.',
      run: async lab => { lab.titleTrust = [lab.pub('court')]; const v = await lab.verify(lab.a['bundle.grace.court']); const o = out(v, lab, 'Valid, 9/9, resting on the court voucher (an honest limit).'); return { ...o, badge: 'limit' }; } },
    { id: 'sceptic', actor: 'grace', title: 'Checks, trusting no one', button: 'Check, trusting no one', narration: 'Another verifier trusts no court registry. Same licence.',
      run: async lab => { lab.titleTrust = []; const v = await lab.verify(lab.a['bundle.grace.court']); const o = out(v, lab); return { ...o, ok: true, badge: 'limit', summary: `Not decided: ${v.result.reason}. Different verifiers can disagree here.` }; } },
  ],
  proven: 'Nothing new is proven by the protocol. It shows the gap honestly: without a plan, ownership after death rests on a court and on whom each verifier trusts.',
  canGoWrong: [{ text: 'A fake court voucher: only trusted registries count' }, { text: 'Lost keys with no plan: use a plan (S26)' }],
  limits: ['The protocol cannot decide inheritance without a plan. A court decides; verifiers choose which registries they trust.', 'Licences Alice sold while alive stay valid either way.'],
  prompts: [{ title: 'Why make a plan?', prompt: 'Explain what happens to my licences if I die without a succession plan.' }],
};
export const PART6 = [S25, S26, S27];
