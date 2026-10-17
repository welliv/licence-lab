import type { Scenario } from './types';
import { F, short, baseWorld, verdictOut, anchorAndVerify, seconds } from './common';
import { listing, purchase, payout, signOffer, consent, onboardAva, reqsSummary, tagNet } from '../engine/actions';
import { LAB_KIND, verifyEvent, sha256hex, tagv, decodeInvoice, checkLink, type Event } from '../engine/lab';
import { makeZapRequest, makeZapReceipt, validateZapRequest } from 'nostr-tools/nip57';
import { finalizeEvent } from 'nostr-tools/pure';
import * as nip17 from 'nostr-tools/nip17';

const requestStep = (buyer: string, offerName: string, store: string, sec = 60) => ({
  inputs: [seconds(sec)],
  run: (lab: any, i: any) => { const { offer, binding, consents } = listing(lab, offerName); const use = [...offer.tags.find((t: string[]) => t[0] === 'use').slice(1, 5), `seconds=${i.seconds}`];
    const r = lab.lib.makePrivateRequest(lab.key(buyer), { offer, binding, use, network: tagNet(), notBefore: lab.notBefore() }); lab.a[store] = r; lab.flow(buyer, 'ava', 'request ✍', 'event');
    let inside = true, why = ''; try { lab.lib.checkDeal(offer, binding, consents, r.request); } catch (e: any) { inside = false; why = e.message; }
    return { ok: inside, badge: inside ? 'real' : 'fail', json: r.request, proves: inside ? [4, 5] : [4],
      summary: inside ? `Request ${short(r.request.id)} signed by a brand-new key ${short(r.request.pubkey)}, not by ${lab.name(buyer)}'s main key.` : `The request is outside the offer: ${why}. The seller will not invoice it (check 5).`,
      fields: [F('fresh licence key', short(r.request.pubkey, 10)), F('use', use.join(' · '), false), F('amount (signed by buyer)', `${Number(tagv(r.request, 'amount')) / 1000} sats`), F('not-before block', short(tagv(r.request, 'not-before')))],
      code: `const { request, link } = makePrivateRequest(${buyer}Sk, { offer, binding, use: ${JSON.stringify(use)}, network, notBefore })\n// a fresh key per licence: deriveLicenceKey(mainSk, offer.id, nonce)` } as any; } });
const invoiceStep = (buyer: string, offerName: string, store: string) => (lab: any) => {
  const { offer, binding, consents } = listing(lab, offerName); const { request } = lab.a[store];
  const x = lab.issueInvoice({ nodeId: 'node.ava', creditTo: 'ava', offer, binding, consents, request, label: `${offerName} for ${buyer}` }); lab.a[store + '.inv'] = x;
  const dh = decodeInvoice(x.rec.bolt11).descriptionHash; lab.flow('ava', buyer, `402 + invoice ${Number(x.reqs.amount) / 1000} sats`, 'invoice');
  return { ok: true, badge: 'real', json: x.reqs, proves: [6, 7], summary: `HTTP 402 with a real BOLT11 invoice signed by Ava's node key. Its description hash equals the hash of ${lab.name(buyer)}'s request.`,
    fields: [...reqsSummary(x.reqs), F('description_hash', short(dh, 12)), F('hash of request', short(x.reqs.extra.requestHash, 12))],
    code: `// seller: checkDeal(offer, binding, consents, request) then\nconst dh = requestHash(httpBinding('POST', payLink, requestBytes(request), { 'content-type': 'application/json' }))\nconst invoice = await node.addInvoice({ valueMsat: ${x.reqs.amount}, descriptionHash: dh })` };
};

export const S3: Scenario = {
  id: 's3', n: 3, part: 2, emoji: '🎬', title: 'Mia licenses by hand', complexity: 'easy', status: 'v1',
  summary: 'Mia taps "License this", pays one invoice and holds a licence anyone can check. The payment is split to the co-owners at once.',
  situation: "Mia makes travel videos. She wants 'Rain' in a video for YouTube. She wants to pay quickly and avoid a copyright claim.",
  education: 'The invoice\'s description_hash is the hash of Mia\'s own signed request, so the payment is tied to exactly what she asked for. The preimage, revealed by paying, is the receipt. Six parts make the bundle; verifyLicence re-checks all of them.',
  how: [{ title: 'Fresh key', description: 'A new key per licence, so her purchases cannot be linked.' }, { title: '402', description: 'The node replies "payment required" with the invoice.' }, { title: 'Preimage', description: 'Paying reveals it. It completes the licence.' }],
  cast: ['ava', 'mia', 'jay', 'nova', 'lena'], setup: lab => baseWorld(lab),
  steps: [
    { id: 'find', actor: 'mia', title: 'Find "Rain"', button: 'Search', narration: 'Mia searches "Rain Ava". She sees the verified badge, the price for creator video, worldwide, perpetual, and the plain-English licence summary.',
      run: lab => { const l = listing(lab, 'offer.creator'); return { ok: l.forSale, badge: 'real', proves: l.forSale ? [1, 2, 3] : [], summary: `Found: "Rain" by Ava ✓ verified, ${tagv(l.offer, 'price')} sats, ${l.reason}.`, fields: [F('offer', short(l.offer.id)), F('summary', 'Creator video, worldwide, perpetual. Recording only.', false)], code: 'checkDeal(offer, binding, consents, null) // passes: for sale' }; } },
    { id: 'request', actor: 'mia', to: 'ava', title: 'Tap "License this"', button: 'License this', narration: 'Her app creates a fresh per-licence key and signs a request: the offer id, the use, the network and how many seconds she will use.', ...requestStep('mia', 'offer.creator', 's3.req') },
    { id: 'invoice', actor: 'ava', to: 'mia', title: "Ava's node replies 402", button: 'Ask for invoice', narration: "The site asks Ava's node for an invoice. The node checks the deal and replies HTTP 402 with a BOLT11 invoice whose description hash is the hash of Mia's request.", run: invoiceStep('mia', 'offer.creator', 's3.req') },
    { id: 'pay', actor: 'mia', to: 'ava', title: 'Mia pays', button: 'Pay invoice', narration: 'Mia taps Pay in her wallet. (Without a wallet she could pay by card through a licensed provider that pays the invoice for her; not shown here.)',
      run: lab => { const x = lab.a['s3.req.inv']; const p = lab.pay('mia', x.rec.bolt11); if (!p.ok) return { ok: false, badge: 'fail', summary: p.error! }; lab.a['s3.pre'] = p.preimage; lab.flow('ava', 'mia', '🔑 preimage', 'preimage');
        return { ok: true, badge: 'sim', proves: [8], summary: `Paid ${Number(x.reqs.amount) / 1000} sats (simulated money). Preimage ${short(p.preimage, 10)} hashes to the payment hash (real).`, fields: [F('preimage', p.preimage!), F('sha256(preimage)', short(sha256hex(Buffer.from(p.preimage!, 'hex') as any), 12))], code: `const { preimage } = await nwc.payInvoice({ invoice })\nsha256(preimage) === paymentHash // true` }; } },
    { id: 'bundle', actor: 'mia', title: 'Mia holds the bundle', button: 'Assemble and verify', narration: 'Her app now has all six parts: offer, consents, binding, request, invoice and preimage. It runs verifyLicence. The timestamp comes in the next batch.',
      run: async lab => { const { offer, binding, consents } = listing(lab, 'offer.creator'); const b = lab.bundle('bundle.mia', { offer, binding, consents, request: lab.a['s3.req'].request, invoice: lab.a['s3.req.inv'].rec.bolt11, preimage: lab.a['s3.pre'] }); lab.a['bundle.mia.link'] = lab.a['s3.req'].link;
        const v = await lab.verify(b, { chain: false }); return { ...verdictOut(v, 'Bundle', `8 of 9 checks pass now. Check 9 waits for the timestamp.`), json: b }; } },
    { id: 'split', actor: 'ava', to: 'jay', title: 'Split to co-owners', button: 'Pay co-owners', narration: "Ava's node pays Jay, Nova and Lena their shares straight away and sends each a signed sales statement.",
      run: lab => { const r = payout(lab, 'offer.creator', lab.a['bundle.mia']); return { ok: true, badge: 'sim', json: r.statements[0], summary: `Paid out: ${r.lines.join(', ')}. Three signed statements (real signatures, kind 3414 draft).`, fields: r.lines.map(l => F('payout', l, false)), code: 'makeStatement(avaSk, offer.id, periodEnd, lines) // one per co-owner' }; } },
    { id: 'anchor', actor: 'echo', to: 'bitcoin', title: 'Timestamp the batch', button: 'Run OpenTimestamps batch', narration: 'The bundle goes into the next OpenTimestamps batch. One Bitcoin block commits to it. Now all nine checks can run.',
      run: async lab => { const v = await anchorAndVerify(lab, lab.a['bundle.mia'], 'Mia licence'); return verdictOut(v); } },
    { id: 'claim', actor: 'mia', to: 'echo', title: 'Clear a Content ID claim', button: 'Dispute with licence link', narration: "A week later a claim lands on Mia's video. She disputes it and pastes her licence link. Echo checks the bundle, and her private link proves she holds it, so Echo asks the distributor to release the claim.",
      run: async lab => { lab.advance(7 * 86400); const v = await lab.verify(lab.a['bundle.mia'], { link: lab.a['bundle.mia.link'] }); lab.flow('mia', 'echo', 'licence link', 'message'); lab.flow('echo', 'distributor', 'release claim', 'message');
        return { ...verdictOut(v, 'Licence', `Valid, and Mia's private link proves she holds it (holder ${short(v.result.holder)}). Claim released (simulated platform step).`), badge: v.result.ok ? 'real' : 'fail' }; } },
  ],
  proven: "Mia, using a fresh key, paid Ava's own node for this exact use, under these exact terms, at this time.",
  canGoWrong: [{ text: 'An edited bundle with the old signature', attack: 'A1' }, { text: 'Reuse the preimage for another request', attack: 'A4' }, { text: 'Timeout, then pay again', attack: 'A9' }, { text: 'Card payment fails: no preimage, no licence' }],
  limits: ['Clearing a Content ID claim still depends on the distributor and the platform.', 'Composition (publishing) claims are separate in v1.'],
  prompts: [{ title: 'License this button', prompt: 'Build a "License this" button: make a fresh per-licence key with makePrivateRequest, POST it to the offer pay-link, read the HTTP 402 x402 challenge, run clientCheck, pay through NWC, then assemble the bundle and call verifyLicence. Write vitest tests plus attacks A1, A4 and A9.' }],
};

export const S4: Scenario = {
  id: 's4', n: 4, part: 2, emoji: '🛰️', title: 'Scout buys automatically', complexity: 'medium', status: 'v1 + later',
  summary: "ClipAI's agent Scout buys a licence on its own, inside a hard NWC budget, and checks everything before it pays.",
  situation: "ClipAI adds music to users' videos. Its agent, Scout, buys licences on its own within a wallet budget.",
  education: 'NWC (NIP-47) lets an app give an agent a wallet connection with hard limits. Scout\'s own rules come on top: it pays only the amount in its own signed request, never takes money or use from text, writes a payment record before paying, and looks a payment up after a timeout.',
  how: [{ title: 'Budget', description: 'Max per payment, daily and monthly caps, expiry, pay_invoice only.' }, { title: 'Pre-pay checks', description: 'clientCheck() from the library, before any money moves.' }, { title: 'Payment record', description: 'Written before paying, so a crash never causes a double pay.' }],
  cast: ['clipai', 'scout', 'ava', 'echo'], setup: lab => baseWorld(lab),
  steps: [
    { id: 'budget', actor: 'clipai', to: 'scout', title: 'Connect Scout with a budget', button: 'Create NWC connection', narration: 'ClipAI connects Scout to its wallet with NWC. The connection has hard limits and allows pay_invoice only.',
      inputs: [{ key: 'per', label: 'Max per payment (sats)', type: 'number', default: 5000 }, { key: 'daily', label: 'Daily cap (sats)', type: 'number', default: 20000 }],
      run: (lab, i) => { const w = lab.setNwc('scout', { maxPerPaymentSat: Number(i.per), dailyCapSat: Number(i.daily), monthlyCapSat: Number(i.daily) * 20 }); lab.agentCaps.scout = { perLicenceSat: Number(i.per), totalSat: Number(i.daily), spentSat: 0 }; lab.flow('clipai', 'scout', 'NWC 🔌', 'message');
        return { ok: true, badge: 'sim', summary: `Scout can spend up to ${w.maxPerPaymentSat} sats per payment and ${w.dailyCapSat} sats a day, until ${new Date(w.expiresAt * 1000).toISOString().slice(0, 10)}. Methods: pay_invoice only.`, fields: [F('max_amount', w.maxPerPaymentSat), F('renewal', 'daily'), F('request_methods', w.methods.join(','))], code: `// NWC-08 budget fields\n{ max_amount: ${w.maxPerPaymentSat * 1000}, renewal: 'daily', expires_at: ${w.expiresAt}, request_methods: ['pay_invoice'] }` }; } },
    { id: 'read', actor: 'scout', title: 'Read the offer', button: 'Read structured fields', narration: 'Scout finds Ava\'s offer and reads only the structured, signed fields: uses, price, terms hash. It ignores free text for anything to do with money.',
      run: lab => { const l = listing(lab, 'offer.creator'); return { ok: l.forSale, badge: 'real', trace: [`✓ offer signed by ${short(l.offer.pubkey)} (Ava, vouched)`, `✓ price ${tagv(l.offer, 'price')} sats ≤ my cap`, '✓ all co-owners consented', '· free text ignored for price and use'], summary: 'Offer checked with checkDeal before spending anything.', proves: [1, 2, 3] }; } },
    { id: 'negotiate', actor: 'scout', to: 'echo', title: 'Ask for a volume price', button: 'Send counter-offer', narration: 'Scout wants 30 licences this month and asks Echo for a lower price in an encrypted message. Echo checks Ava\'s signed rules (20 or more, down to 80%). Agent-to-agent negotiation is planned for later; here Echo answers, and Scout buys at list price today.',
      run: lab => { const msg = nip17.wrapEvent(lab.key('scout'), { publicKey: lab.pub('echo') }, 'Scout here. 30 creator licences for Rain this month at 1,600 sats each?'); const got = nip17.unwrapEvent(msg, lab.key('echo'));
        lab.flow('scout', 'echo', '✉ NIP-17', 'message'); lab.flow('echo', 'scout', '✉ "fits Ava\'s rules (later)"', 'message');
        return { ok: true, badge: 'real', json: msg, summary: `Real NIP-17 gift-wrapped message (kind ${msg.kind}); Echo decrypted: "${got.content}". Rules allow 80% for 20+; volume pricing is a later feature.`, fields: [F('wrapper kind', msg.kind), F('outer key (throw-away)', short(msg.pubkey))] }; } },
    { id: 'request', actor: 'scout', to: 'ava', title: 'Sign a request', button: 'Sign request', narration: 'Scout signs a request with the price, use and network, from a fresh key.', ...requestStep('scout', 'offer.creator', 's4.req', 30) },
    { id: 'invoice', actor: 'ava', to: 'scout', title: '402 with invoice', button: 'Get 402', narration: "Ava's node returns an HTTP 402 / x402 reply with the invoice.", run: invoiceStep('scout', 'offer.creator', 's4.req') },
    { id: 'pay', actor: 'scout', to: 'ava', title: 'Check, record, pay', button: 'Run pre-pay checks and pay', narration: 'Before paying, Scout checks the amount equals its own signed request, the description hash is its request, and the payment fits the budget. It writes a payment record, then pays through NWC.',
      run: lab => { const { offer, binding } = listing(lab, 'offer.creator'); const r = lab.agentPay('scout', lab.a['s4.req.inv'].reqs, lab.a['s4.req'].request, offer, binding); lab.a['s4.pre'] = r.preimage;
        return { ok: r.ok, badge: r.ok ? 'sim' : 'fail', trace: r.trace, summary: r.ok ? 'Paid inside the budget. Money is simulated; every check before it was real.' : r.error!, code: 'clientCheck(requirements, expectedHash, boundNode, now, 60, request.amount)\nledger[paymentHash] = "in_flight" // before paying\nawait nwc.payInvoice({ invoice })' }; } },
    { id: 'verify', actor: 'scout', title: 'Verify and publish', button: 'verifyLicence', narration: 'Scout stores the bundle, it is timestamped in the next batch, and verifyLicence passes all nine checks. The video is published with the licence attached.',
      run: async lab => { const { offer, binding, consents } = listing(lab, 'offer.creator'); const b = lab.bundle('bundle.scout', { offer, binding, consents, request: lab.a['s4.req'].request, invoice: lab.a['s4.req.inv'].rec.bolt11, preimage: lab.a['s4.pre'] }); return verdictOut(await anchorAndVerify(lab, b, 'Scout licence')); } },
  ],
  proven: "The agent bought within its owner's budget, at a price Ava's signed offer set.",
  canGoWrong: [{ text: 'Seller asks for more than the request', attack: 'A6' }, { text: 'Prompt injection in offer text', attack: 'A7' }, { text: 'Many payments against the daily cap', attack: 'A8' }, { text: 'Timeout, then pay again', attack: 'A9' }],
  prompts: [{ title: 'Buyer agent with a hard budget', prompt: 'Build a buyer agent that buys music licences over x402 with an NWC connection that has max_amount, renewal and expires_at. Hard rules: amount only from its own signed request, never from offer text; write a payment record before paying; after a timeout, look the payment up; a fresh key per licence. Include tests for attacks A6 to A9.' }],
};

export const S5: Scenario = {
  id: 's5', n: 5, part: 2, emoji: '📺', title: 'StreamCo licenses at scale', complexity: 'advanced', status: 'v1 + later',
  summary: 'StreamCo\'s settlement agent buys one licence per post, timestamps them in one batch, exports a ledger, and an auditor re-checks a sample.',
  situation: 'StreamCo has thousands of users who add songs to their posts every day. It needs one licence per use, clean accounts and an audit trail.',
  education: 'Each post gets its own licence with its own fresh key. OpenTimestamps puts many licences into one Bitcoin proof, so timestamps cost nothing per licence. An auditor re-runs verifyLicence and does not need to trust StreamCo.',
  how: [{ title: 'Per-post licence', description: 'Fresh key, request, invoice, preimage.' }, { title: 'Batch', description: 'One OpenTimestamps proof covers the whole batch.' }, { title: 'Audit', description: 'Sample and re-verify from scratch.' }],
  cast: ['streamco', 'ava', 'auditor'], setup: lab => baseWorld(lab),
  steps: [
    { id: 'caps', actor: 'streamco', title: 'Set caps', button: 'Set NWC caps', narration: 'StreamCo\'s settlement agent pays from a wallet connection with a daily cap.', run: lab => { lab.setNwc('streamco', { maxPerPaymentSat: 5000, dailyCapSat: 1_000_000, monthlyCapSat: 20_000_000 }); return { ok: true, badge: 'sim', summary: 'Daily cap 1,000,000 sats; 5,000 per payment.' }; } },
    { id: 'run', actor: 'streamco', to: 'ava', title: 'Users add "Rain" to posts', button: 'Run the posts', narration: 'Each time a user adds "Rain" to a post, the agent makes a fresh key, signs a request, gets an invoice and pays it. Real signatures and invoices; simulated payments.',
      inputs: [{ key: 'n', label: 'Number of posts', type: 'number', default: 60, hint: 'Each one is a full real request, invoice and preimage.' }],
      run: lab => { /* n read below */ return { ok: true, summary: '' }; } },
    { id: 'batch', actor: 'streamco', to: 'bitcoin', title: 'One timestamp for the batch', button: 'Stamp the batch', narration: 'All the bundles go into one OpenTimestamps batch. One Bitcoin block proves them all.',
      run: async lab => { const list: any[] = lab.a['s5.bundles']; list.forEach((b, k) => lab.stamp(lab.lib.grantDigest(b), `post ${k + 1}`)); lab.advance(1800); const blk = lab.anchorBatch('StreamCo batch')!; list.forEach(b => lab.attachProof(b));
        return { ok: true, badge: 'sim', summary: `${list.length} real .ots proofs, one simulated block (${blk.height}). Each proof is a merkle path of ${Math.ceil(Math.log2(list.length))} steps.`, fields: [F('licences', list.length), F('block', blk.height)] }; } },
    { id: 'ledger', actor: 'streamco', title: 'Nightly ledger', button: 'Export ledger CSV', narration: 'Every night the agent exports a ledger for finance: post, licence id, sats, value at invoice time, artist.',
      run: lab => { const list: any[] = lab.a['s5.bundles']; const rows = ['post,licence_id,sats,usd_at_invoice,artist', ...list.map((b, k) => `post-${k + 1},${b.request.id.slice(0, 16)},${Number(tagv(b.request, 'amount')) / 1000},${(Number(tagv(b.request, 'amount')) / 1000 * 0.001).toFixed(2)},Ava`)]; lab.a['s5.csv'] = rows.join('\n');
        return { ok: true, badge: 'sim', summary: `${list.length} rows. The fiat column uses a fixed demo rate (simulated).`, json: rows.slice(0, 6).join('\n') }; } },
    { id: 'audit', actor: 'auditor', title: 'Auditor samples 20', button: 'Sample and re-verify', narration: 'Once a year an auditor picks bundles at random and runs verifyLicence on each. Every check is recomputed.',
      run: async lab => { const list: any[] = lab.a['s5.bundles']; const pick = list.filter((_, k) => k % Math.max(1, Math.floor(list.length / 20)) === 0).slice(0, 20); let ok = 0; const t0 = performance.now(); for (const b of pick) if ((await lab.verify(b)).result.ok) ok++;
        return { ok: ok === pick.length, badge: 'real', proves: [1, 2, 3, 4, 5, 6, 7, 8, 9], summary: `${ok}/${pick.length} sampled licences pass all nine checks (${(performance.now() - t0).toFixed(0)} ms in total).` }; } },
    { id: 'delete', actor: 'streamco', title: 'A user deletes a post', button: 'Delete post 1', narration: 'When a user deletes a post, the licence stays valid: it was paid.',
      run: async lab => verdictOut(await lab.verify(lab.a['s5.bundles'][0]), 'Licence for deleted post 1') },
  ],
  proven: 'Every use was licensed and paid, one by one, at a known price and time.',
  canGoWrong: [{ text: 'A payment times out: look it up first', attack: 'A9' }, { text: 'The agent overspends: daily caps stop it', attack: 'A8' }, { text: 'Ava revokes an offer: earlier licences stay valid', attack: 'A13' }],
  limits: ['Bulk invoices and accounting exports are planned for later.'],
  prompts: [{ title: 'Settlement agent', prompt: 'Build a settlement agent that buys one music licence per user post with a fresh key, batches the bundles into OpenTimestamps, and exports a nightly CSV ledger. Add an auditor script that samples 20 bundles and runs verifyLicence.' }],
};
S5.steps[1].run = (lab, i) => { const n = Math.max(1, Math.min(500, Number(i.n))); const t0 = performance.now(); const list = [];
  for (let k = 0; k < n; k++) list.push(purchase(lab, 'streamco', 'offer.creator', { seconds: 30, name: `bundle.post${k + 1}` }).bundle);
  lab.a['s5.bundles'] = list; const ms = performance.now() - t0; lab.flows.splice(lab.flows.length - 3 * (n - 1), 3 * (n - 1));
  return { ok: true, badge: 'sim', summary: `${n} licences bought in ${ms.toFixed(0)} ms (${(ms / n).toFixed(1)} ms each): ${n} fresh keys, ${n} signed requests, ${n} real invoices. Money is simulated.`, fields: [F('posts', n), F('sats paid', n * 2000), F('distinct buyer keys', new Set(list.map(b => b.request.pubkey)).size)] }; };

export const S6: Scenario = {
  id: 's6', n: 6, part: 2, emoji: '🧠', title: 'ModelCo trains, a regulator checks', complexity: 'advanced', status: 'v1 + later',
  summary: 'ModelCo licenses "Rain" for AI training, timestamps before training starts, and later proves it to a regulator.',
  situation: 'ModelCo trains an AI music model. It must be able to prove later what it trained on and that it paid.',
  education: 'The regulator checks three things: the bundle passes all nine checks, the track hash matches the file in the training log, and the Bitcoin timestamp is before training started.',
  how: [{ title: 'Training preset', description: 'A standard AI training licence text, linked by hash.' }, { title: 'Timestamp first', description: 'Proof the licence existed before training.' }, { title: 'Regulator', description: 'Re-runs verifyLicence and compares hashes and times.' }],
  cast: ['modelco', 'ava', 'regulator'], setup: lab => baseWorld(lab),
  steps: [
    { id: 'buy', actor: 'modelco', to: 'ava', title: 'License for training', button: 'Buy training licence', narration: 'ModelCo\'s agent signs a request naming "ai-training" from a fresh key and pays the invoice.',
      run: lab => { const r = purchase(lab, 'modelco', 'offer.training', { name: 'bundle.modelco' }); lab.a['s6.log'] = [{ file: 'rain.wav', sha256: lab.trackHash, licence: r.request.id }]; return { ok: true, badge: 'sim', json: r.bundle.request, summary: `Training licence bought for ${Number(r.reqs.amount) / 1000} sats. Training data log: rain.wav → ${short(lab.trackHash)}.` }; } },
    { id: 'stamp', actor: 'modelco', to: 'bitcoin', title: 'Timestamp before training', button: 'Stamp bundle', narration: 'All bundles are timestamped with OpenTimestamps before training starts.',
      run: async lab => { const v = await anchorAndVerify(lab, lab.a['bundle.modelco'], 'ModelCo licence'); lab.a['s6.anchorTime'] = lab.chain.tip.time; return verdictOut(v); } },
    { id: 'train', actor: 'modelco', title: 'Training starts', button: 'Start training', narration: 'ModelCo signs a note: training run 7 starts now, with this data log.',
      run: lab => { lab.advance(3600); const e = lab.sign('modelco', LAB_KIND.NOTE, [['t', 'training-start'], ['x', lab.trackHash]], 'Training run 7 starts now.'); lab.a['s6.trainAt'] = lab.now; return { ok: true, badge: 'real', json: e, summary: `Training start note signed at ${new Date(lab.now * 1000).toISOString().slice(11, 16)} UTC (simulated clock).` }; } },
    { id: 'reg', actor: 'regulator', to: 'modelco', title: 'Regulator asks for proof', button: 'Check the proof', narration: 'Months later a regulator asks: "Prove you had permission." ModelCo hands over the bundle and the training data log.',
      run: async lab => { lab.advance(90 * 86400); const b = lab.a['bundle.modelco']; const v = await lab.verify(b); const hashOk = lab.a['s6.log'][0].sha256 === tagv(b.offer, 'x'); const timeOk = lab.a['s6.anchorTime'] < lab.a['s6.trainAt'];
        const use = b.request.tags.find((t: string[]) => t[0] === 'use')[1];
        return { ...verdictOut(v), ok: v.result.ok && hashOk && timeOk, trace: [`${v.result.ok ? '✓' : '✗'} bundle: ${v.passed}/9 checks`, `${hashOk ? '✓' : '✗'} track hash in the log equals the offer's track hash`, `${use === 'ai-training' ? '✓' : '✗'} use is ai-training`, `${timeOk ? '✓' : '✗'} anchored at block ${v.result.anchoredHeight}, before training started`], summary: 'For this track: the rights holders agreed to AI training, ModelCo paid, and both happened before training.' }; } },
    { id: 'late', actor: 'modelco', title: 'Try it: licensed after training', button: 'Buy a licence late', expectFail: true, narration: 'What if ModelCo only bought a licence after training, and claims it was before? The timestamp shows the truth.',
      run: async lab => { const r = purchase(lab, 'modelco', 'offer.training', { name: 'bundle.late' }); const v = await anchorAndVerify(lab, r.bundle, 'late'); const t = lab.chain.at(v.result.anchoredHeight!)!.time;
        return { ok: t < lab.a['s6.trainAt'], badge: 'real', summary: `The late licence is valid as a licence, but its anchor (block ${v.result.anchoredHeight}) is after training started. The regulator sees it was bought too late.` }; } },
  ],
  proven: 'For each track: the rights holder agreed to AI training, ModelCo paid, and both happened before training.',
  canGoWrong: [{ text: 'Licensed after training: the timestamp shows it', attack: 'A11' }, { text: 'Catalogue-wide licences: planned for later' }],
  prompts: [{ title: 'Training data provenance', prompt: 'Build a training-data log that stores, for each audio file, its SHA-256 and the licence bundle, and refuses to start training until every bundle has a confirmed OpenTimestamps proof. Add a regulator report that runs verifyLicence and compares times.' }],
};

export const S7: Scenario = {
  id: 's7', n: 7, part: 2, emoji: '🎧', title: 'Sam the fan', complexity: 'easy', status: 'v1 + later',
  summary: 'Sam zaps Ava\'s demo over Lightning (NIP-57), his fan agent stays inside a monthly cap, and Ava sends him a signed badge.',
  situation: 'Sam loves Ava\'s music. He wants to support her, get early access, and share her songs.',
  education: 'A zap is a tip paid over Lightning and recorded on Nostr: Sam signs a zap request, the invoice commits to it, and a zap receipt is published. A badge (NIP-58) is a signed award. No per-play rewards means there is nothing to fake.',
  how: [{ title: 'Zap', description: 'NIP-57 request, invoice, receipt.' }, { title: 'Monthly cap', description: 'Sam\'s fan agent cannot overspend.' }, { title: 'Badge', description: 'NIP-58 "early supporter".' }],
  cast: ['sam', 'ava'], setup: lab => baseWorld(lab, { kinds: ['creator'] }),
  steps: [
    { id: 'zap', actor: 'sam', to: 'ava', title: 'Zap the demo', button: 'Zap 1,000 sats', narration: 'Sam taps the lightning bolt on Ava\'s demo post. His app signs a zap request; Ava\'s zap service returns an invoice that commits to it.',
      inputs: [{ key: 'amt', label: 'Zap (sats)', type: 'number', default: 1000 }],
      run: (lab, i) => { const post = lab.sign('ava', 1, [], 'New demo: Rain (acoustic). 🌧️'); lab.publish(post, 'ava', 'demo post');
        const zr = finalizeEvent(makeZapRequest({ event: post, amount: Number(i.amt) * 1000, relays: lab.relays.map(r => r.url), comment: 'Love this!' }), lab.key('sam')); const zrJson = JSON.stringify(zr);
        const err = validateZapRequest(zrJson); const inv = lab.plainInvoice('node.ava', 'ava', Number(i.amt), 'zap', sha256hex(zrJson)); lab.setNwc('sam', { maxPerPaymentSat: 5000, dailyCapSat: 10000, monthlyCapSat: 5000 });
        const p = lab.pay('sam', inv.bolt11); if (!p.ok) return { ok: false, badge: 'fail', summary: p.error! };
        const receipt = finalizeEvent(makeZapReceipt({ zapRequest: zrJson, preimage: p.preimage, bolt11: inv.bolt11, paidAt: new Date(lab.now * 1000) }), lab.key('ava', 'zapper')); lab.publish(receipt, 'ava', '⚡ zap receipt'); lab.a['s7.zapped'] = Number(i.amt);
        return { ok: !err && decodeInvoice(inv.bolt11).descriptionHash === sha256hex(zrJson), badge: 'real', json: receipt, summary: `Zap request valid (${err ?? 'NIP-57 checks pass'}); the invoice's description hash commits to it; receipt published (kind 9735). Money simulated.`, code: "const zr = finalizeEvent(makeZapRequest({ event: post, amount, relays }), samSk)\nvalidateZapRequest(JSON.stringify(zr)) // null = valid" }; } },
    { id: 'cap', actor: 'sam', to: 'ava', title: 'Try it: zap past the monthly cap', button: 'Zap 5,000 more', expectFail: true, narration: 'Sam\'s fan agent has a monthly cap of 5,000 sats. A second big zap is refused by the wallet connection itself.',
      run: lab => { const inv = lab.plainInvoice('node.ava', 'ava', 5000, 'zap 2'); const p = lab.pay('sam', inv.bolt11); return { ok: p.ok, badge: 'sim', summary: p.ok ? 'Paid.' : `Refused by the NWC wallet service: ${p.error} (${p.code}).` }; } },
    { id: 'badge', actor: 'ava', to: 'sam', title: 'Ava sends a badge', button: 'Award "Early supporter"', narration: 'Ava signs a badge award (NIP-58) for everyone who zapped the demo.',
      run: lab => { const def = lab.sign('ava', LAB_KIND.BADGE_DEF, [['d', 'early-supporter'], ['name', 'Early supporter of Rain']]); const award = lab.sign('ava', LAB_KIND.BADGE_AWARD, [['a', `30009:${lab.pub('ava')}:early-supporter`], ['p', lab.pub('sam')]]); lab.publish(def, 'ava', 'badge def'); lab.publish(award, 'ava', '🏅 badge');
        return { ok: verifyEvent(award), badge: 'real', json: award, summary: 'Signed badge award (kind 8) naming Sam. Anyone can check it came from Ava.' }; } },
    { id: 'early', actor: 'ava', to: 'sam', title: 'Early access for badge holders', button: 'Send private preview', narration: 'Ava sends badge holders a private message with an early preview link. Subscriptions and discovery rewards are planned for later.',
      run: lab => { const m = nip17.wrapEvent(lab.key('ava'), { publicKey: lab.pub('sam') }, 'Thanks for the support! Early preview of Rain (live version): https://ava.lab.test/preview'); const got = nip17.unwrapEvent(m, lab.key('sam')); lab.flow('ava', 'sam', '✉ NIP-17', 'message');
        return { ok: true, badge: 'real', summary: `Encrypted message delivered; Sam reads: "${got.content.slice(0, 50)}…".` }; } },
  ],
  proven: 'Sam supported Ava directly, with a public receipt, and his spending stayed inside his cap.',
  canGoWrong: [{ text: '"Fake plays": there are no per-play rewards to fake' }, { text: 'Subscriptions and fan rewards: later' }],
  prompts: [{ title: 'Fan zaps with a cap', prompt: 'Build a fan page that zaps an artist post with NIP-57 through an NWC connection with a monthly budget, then shows NIP-58 badges the artist awarded.' }],
};

export const S8: Scenario = {
  id: 's8', n: 8, part: 2, emoji: '🎚️', title: 'Kai\'s remix pays the original', complexity: 'advanced', status: 'later',
  summary: 'Kai buys a remix licence, sells his remix with 30% going back to the original owners, and one payment fans out like a prism.',
  situation: 'A producer called Kai wants to release a remix of "Rain".',
  education: 'Kai\'s own offer lists Ava as a co-owner with 30%, and Ava signs a consent for it. Kai\'s licence text names the remix licence he bought, so the chain of rights is signed and hashed.',
  how: [{ title: 'Remix licence', description: 'Kai buys the right to remix.' }, { title: 'Kai\'s offer', description: 'Ava is a co-owner at 30%.' }, { title: 'Prism', description: 'Mia pays Kai; 30% flows to Ava and on to Jay, Nova and Lena.' }],
  cast: ['kai', 'ava', 'mia'], setup: lab => baseWorld(lab, { kinds: ['creator', 'remix'] }),
  steps: [
    { id: 'buy', actor: 'kai', to: 'ava', title: 'Kai buys a remix licence', button: 'Buy remix licence', narration: 'Kai buys Ava\'s remix licence like any other licence.',
      run: async lab => { const r = purchase(lab, 'kai', 'offer.remix', { name: 'bundle.kai' }); const v = await anchorAndVerify(lab, r.bundle, 'Kai remix licence'); return verdictOut(v, 'Kai\'s remix licence'); } },
    { id: 'kaioffer', actor: 'kai', to: 'relays', title: 'Kai offers his remix', button: 'Sign remix offer', narration: 'Kai gets a node and binding, then signs an offer for his remix. Ava is a co-owner at 30%, and the licence text names the remix licence he bought.',
      run: lab => { onboardAva(lab, 'kai', { quiet: true }); const src = lab.lib.grantDigest(lab.a['bundle.kai']); const terms = `Creator licence for "Rain (Kai remix)", based on remix licence ${src}. Non-exclusive, online video, worldwide, perpetual. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.`;
        const o = signOffer(lab, 'kai', 'creator', { name: 'offer.kai', price: 3000, coOwners: [{ pubkey: lab.pub('ava'), role: 'original-owners', bps: 3000 }], termsText: terms, masterSha256: sha256hex(lab.track.map((b, k) => k > lab.track.length - 4000 ? b ^ 0x5a : b)) });
        return { ok: true, badge: 'real', json: o, summary: `Kai's offer ${short(o.id)}: Ava 30%. Waiting for Ava's consent.`, fields: [F('source licence', short(src, 12))] }; } },
    { id: 'avaok', actor: 'ava', to: 'relays', title: 'Ava consents', button: 'Ava agrees to 30%', narration: 'Echo checks the remix offer names Ava\'s remix licence and the 30% share, and asks Ava to tap.',
      run: lab => { consent(lab, 'ava', 'offer.kai'); const l = listing(lab, 'offer.kai', 'kai'); return { ok: l.forSale, badge: 'real', summary: `Kai's remix is for sale: ${l.reason}.`, proves: [3] }; } },
    { id: 'mia', actor: 'mia', to: 'kai', title: 'Mia buys the remix', button: 'Buy remix', narration: 'Mia licenses the remix from Kai. Kai\'s node pays Ava 30%, and Ava\'s node splits that to Jay, Nova and Lena.',
      run: async lab => { const r = purchase(lab, 'mia', 'offer.kai', { artist: 'kai', name: 'bundle.mia.remix' }); const toAva = 900; lab.balances.kai -= toAva; lab.balances.ava += toAva; lab.flow('kai', 'ava', `⚡ ${toAva} sats (30%)`, 'payment');
        const fake = { ...r.bundle, request: { ...r.bundle.request, tags: r.bundle.request.tags.map((t: string[]) => t[0] === 'amount' ? ['amount', String(toAva * 1000)] : t) } }; const p = payout(lab, 'offer.creator', fake as any);
        const v = await anchorAndVerify(lab, r.bundle, 'Mia remix licence'); return { ...verdictOut(v, 'Remix licence'), trace: [`Mia → Kai: 3,000 sats`, `Kai → Ava: ${toAva} sats (30%)`, ...p.lines.map(l => `Ava → ${l}`)] }; } },
    { id: 'cheat', actor: 'kai', title: 'Try it: leave out the original share', button: 'Offer without Ava', expectFail: true, narration: 'What if Kai lists a remix with no share for the originals? The offer is validly signed by Kai, but an index that knows the track hash of the remix licence flags it.',
      run: lab => { const o = signOffer(lab, 'kai', 'creator', { name: 'offer.kai.bad', price: 3000, coOwners: [] }); const ok = o.tags.some(t => t[0] === 'p' && t[1] === lab.pub('ava'));
        return { ok, badge: 'limit', summary: 'Flagged by the index: a remix based on Ava\'s licence must list her as a co-owner. The signatures are fine, so this is a rule the index enforces, not maths.' }; } },
  ],
  proven: 'The chain of rights: Ava allowed the remix, Kai sells it, and 30% of each sale flows back automatically.',
  canGoWrong: [{ text: 'Kai leaves out the original share: flagged by indexes (a rule, not maths)' }],
  limits: ['Remix licences are planned for after v1.'],
  prompts: [{ title: 'Remix prism', prompt: 'Build a remix flow: buy a remix licence, publish a remix offer that lists the original owner as a co-owner at 30%, and forward 30% of each sale to the original node, which splits it again.' }],
};

export const S9: Scenario = {
  id: 's9', n: 9, part: 2, emoji: '🎮', title: 'Sync for a game', complexity: 'advanced', status: 'later',
  summary: 'A game studio negotiates a custom sync deal in encrypted messages. Ava approves it herself, every co-owner must agree, then the studio pays.',
  situation: 'A game studio wants "Rain" in a trailer and in the game. Higher price, custom terms, and Ava wants to approve it herself.',
  education: 'Custom deals happen in NIP-17 encrypted messages. Echo\'s signed rules say sync needs Ava\'s tap. The one-off offer still needs every co-owner\'s consent.',
  how: [{ title: 'Encrypted talk', description: 'NIP-17 gift-wrapped messages.' }, { title: 'Ava approves', description: 'Outside Echo\'s rules, so she taps.' }, { title: 'Consents', description: 'One "no" means no sale.' }],
  cast: ['studio', 'echo', 'ava', 'jay', 'nova', 'lena'], setup: lab => baseWorld(lab, { kinds: ['creator'] }),
  steps: [
    { id: 'ask', actor: 'studio', to: 'echo', title: 'Studio asks for sync', button: 'Send encrypted request', narration: 'The studio\'s agent sends Echo an encrypted message: trailer plus in-game use, five years, budget 150,000 sats.',
      run: lab => { const m = nip17.wrapEvent(lab.key('studio'), { publicKey: lab.pub('echo') }, 'Sync request: Rain in our trailer and in-game, 5 years, budget 150,000 sats.'); lab.a['s9.msg'] = m; lab.flow('studio', 'echo', '✉ NIP-17', 'message'); return { ok: true, badge: 'real', json: m, summary: `Gift-wrapped (kind ${m.kind}). Relays see only a throw-away key.` }; } },
    { id: 'rules', actor: 'echo', to: 'ava', title: 'Echo checks its rules', button: 'Check Ava\'s rules', narration: 'Echo decrypts the message. Ava\'s signed rules say sync needs her approval, so Echo asks her.',
      run: lab => { const got = nip17.unwrapEvent(lab.a['s9.msg'], lab.key('echo')); lab.flow('echo', 'ava', 'needs your tap', 'message'); return { ok: true, badge: 'real', summary: `Decrypted: "${got.content.slice(0, 60)}…". Rule: sync → ask Ava.` }; } },
    { id: 'offer', actor: 'ava', to: 'relays', title: 'Ava approves a one-off offer', button: 'Sign sync offer', narration: 'Ava reads the deal and signs a one-off sync offer.', inputs: [{ key: 'price', label: 'Price (sats)', type: 'number', default: 150000 }],
      run: (lab, i) => { const o = signOffer(lab, 'ava', 'sync', { price: Number(i.price), name: 'offer.sync' }); return { ok: true, badge: 'real', json: o, summary: `Sync offer ${short(o.id)} at ${i.price} sats.`, proves: [1] }; } },
    { id: 'nova-no', actor: 'nova', title: 'Nova says no (at first)', button: 'Collect consents', expectFail: true, narration: 'Jay and Lena agree. Nova wants to see the trailer first, so she does not sign. Without her consent, the offer cannot be sold.',
      run: lab => { consent(lab, 'jay', 'offer.sync'); consent(lab, 'lena', 'offer.sync'); const l = listing(lab, 'offer.sync'); return { ok: l.forSale, badge: 'real', summary: `Not for sale: ${l.reason}.` }; } },
    { id: 'nova-yes', actor: 'nova', to: 'relays', title: 'Nova agrees', button: 'Nova taps Agree', narration: 'After seeing the trailer, Nova agrees.', run: lab => { consent(lab, 'nova', 'offer.sync'); const l = listing(lab, 'offer.sync'); return { ok: l.forSale, badge: 'real', summary: `For sale: ${l.reason}.`, proves: [3] }; } },
    { id: 'pay', actor: 'studio', to: 'ava', title: 'Studio pays', button: 'Buy sync licence', narration: 'The studio pays the invoice and verifies its licence.',
      run: async lab => { const r = purchase(lab, 'studio', 'offer.sync', { seconds: 120, name: 'bundle.studio' }); payout(lab, 'offer.sync', r.bundle); return verdictOut(await anchorAndVerify(lab, r.bundle, 'sync'), 'Sync licence'); } },
  ],
  proven: 'A custom deal that the artist and every co-owner signed, paid in one step.',
  canGoWrong: [{ text: 'A co-owner says no: no sale', attack: 'A3' }],
  limits: ['Custom sync deals are planned for after v1.'],
  prompts: [{ title: 'Sync desk', prompt: 'Build a sync desk: receive NIP-17 requests, check them against the artist\'s signed agent rules, ask the artist for approval, and publish a one-off offer that needs every co-owner\'s consent.' }],
};
export const PART2 = [S3, S4, S5, S6, S7, S8, S9];
