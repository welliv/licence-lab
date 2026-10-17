import type { Scenario } from './types';
import { F, short, baseWorld, verdictOut, anchorAndVerify } from './common';
import { listing, purchase, signOffer, consent, onboardAva, vouch, statusRecord, tagNet, report } from '../engine/actions';
import { LAB_KIND, tagv, verifyEvent, decodeInvoice, sha256hex, FilteredChain, USES, TERMS, type Event } from '../engine/lab';
import * as nip17 from 'nostr-tools/nip17';

export const S18: Scenario = {
  id: 's18', n: 18, part: 5, emoji: '🏢', title: 'A label joins with its artists', complexity: 'medium', status: 'later',
  summary: 'A label that owns a recording sells it, and its artist signs a consent for her share.',
  situation: 'A small label has 40 artists and owns many of their recordings. It wants to sell licences.',
  education: 'The label is the rights holder, so the label\'s key signs the offer and binding. The artist is a co-owner of income and signs a consent like any co-owner. Ownership disputes produce evidence, not automatic answers.',
  how: [{ title: 'Label key', description: 'Vouched by the distributor.' }, { title: 'Artist share', description: 'A consent, like Jay\'s.' }],
  cast: ['label', 'nova', 'distributor', 'mia'], setup: lab => { lab.setUpAll(['distributor', 'label', 'nova', 'mia']); },
  steps: [
    { id: 'join', actor: 'label', to: 'relays', title: 'Label sets up', button: 'Key, node and binding', narration: 'The label gets a key, a node and a binding, and the distributor vouches for it.',
      run: lab => { const b = onboardAva(lab, 'label', { quiet: true }); const v = vouch(lab, 'distributor', 'label'); return { ok: verifyEvent(b) && verifyEvent(v), badge: 'real', json: b, summary: `Label binding ${short(b.id)} and vouch ${short(v.id)} signed.` }; } },
    { id: 'offer', actor: 'label', to: 'relays', title: 'Label offers "Dawn"', button: 'Sign offer for "Dawn"', narration: 'The label signs a creator offer for Nova\'s track "Dawn", which the label owns. Nova keeps 25% of income.',
      run: lab => { const o = lab.lib.makeOffer(lab.key('label'), { ...lab.offerInput('label', 'creator', { bindingId: lab.a['binding.label'].id, coOwners: [{ pubkey: lab.pub('nova'), role: 'artist-share', bps: 2500 }] }), track: 'dawn', title: 'Dawn', masterSha256: sha256hex('Dawn master v1'), termsText: TERMS.creator.replace(/Rain/g, 'Dawn') }); lab.a['offer.dawn'] = o; lab.a['offer.dawn.consents'] = []; lab.publish(o, 'label', 'offer ✍');
        return { ok: true, badge: 'real', json: o, summary: `Offer ${short(o.id)} by the label; Nova 25%.` }; } },
    { id: 'nova', actor: 'nova', to: 'relays', title: 'Nova consents', button: 'Nova agrees', narration: 'Nova signs a consent for her 25%.', run: lab => { consent(lab, 'nova', 'offer.dawn'); const l = listing(lab, 'offer.dawn', 'label'); return { ok: l.forSale, badge: 'real', summary: `For sale: ${l.reason}.`, proves: [3] }; } },
    { id: 'buy', actor: 'mia', to: 'label', title: 'Mia buys "Dawn"', button: 'Buy', narration: 'Mia licenses "Dawn" from the label.', run: async lab => verdictOut(await anchorAndVerify(lab, purchase(lab, 'mia', 'offer.dawn', { artist: 'label', name: 'bundle.dawn' }).bundle, 'dawn'), '"Dawn" licence') },
    { id: 'dispute', actor: 'nova', title: 'Try it: an ownership dispute', button: 'Nova claims the master', expectFail: true, narration: 'Years later Nova says she owns the master. She signs her own offer for the same file. Two valid offers, same hash: evidence for a mediator, not an automatic answer.',
      run: lab => { onboardAva(lab, 'nova', { quiet: true }); const o = lab.lib.makeOffer(lab.key('nova'), { ...lab.offerInput('nova', 'creator', { bindingId: lab.a['binding.nova'].id }), track: 'dawn', masterSha256: sha256hex('Dawn master v1') }); return { ok: false, badge: 'limit', json: o, summary: 'Both offers are valid maths. Indexes show both with a dispute flag; contracts and vouching decide.' }; } },
  ],
  proven: 'Who holds the rights (the label, vouched), and what share the artist agreed.',
  canGoWrong: [{ text: 'Ownership dispute: evidence only', attack: 'A14' }],
  limits: ['Labels and catalogues are planned for after v1.'],
  prompts: [{ title: 'Label console', prompt: 'Build a label console that signs offers for many tracks with artist shares as co-owners and tracks which consents are missing.' }],
};

export const S19: Scenario = {
  id: 's19', n: 19, part: 5, emoji: '🖥️', title: 'A "License this" button', complexity: 'easy', status: 'v1',
  summary: 'A video site adds a button and checks every upload with verifyLicence in a few lines. No trust in anyone.',
  situation: "A video-editing site wants a 'License this' button next to every song, and wants to check licences when users upload.",
  education: 'The platform calls verifyLicence(bundle, chain) on each upload. It re-checks every signature every time, so an edited bundle never slips through a cached "verified" flag. Try it yourself in the Verify page: drop any bundle.',
  how: [{ title: 'Button', description: 'Fresh key, request, invoice, bundle.' }, { title: 'Verify', description: 'A few lines; nine checks.' }, { title: 'Badge', description: '"Licensed: Rain by Ava".' }],
  cast: ['site', 'mia', 'ava'], setup: lab => baseWorld(lab, { kinds: ['creator'] }),
  steps: [
    { id: 'embed', actor: 'site', title: 'Add the button', button: 'Embed', narration: 'The site adds the button next to "Rain".', run: () => ({ ok: true, badge: 'sim', summary: 'Button added (preview below in the Code tab).', code: `<licence-button offer="naddr…rain" relays="wss://relay-one.lab.test" />` }) },
    { id: 'tap', actor: 'mia', to: 'ava', title: 'A user taps it', button: 'License this', narration: 'Mia taps the button: fresh key, signed request, invoice, payment, bundle.', run: async lab => { const r = purchase(lab, 'mia', 'offer.creator', { name: 'bundle.upload' }); return verdictOut(await anchorAndVerify(lab, r.bundle, 'upload'), 'New licence'); } },
    { id: 'upload', actor: 'site', title: 'Check on upload', button: 'Upload and verify', narration: 'On upload the site calls verifyLicence. If all nine checks pass it shows "Licensed: Rain by Ava".',
      run: async lab => { const v = await lab.verify(lab.a['bundle.upload']); return { ...verdictOut(v, 'Upload', `✓ Licensed: Rain by Ava (${v.passed}/9 checks, ${v.ms.toFixed(0)} ms)`), code: `import { verifyLicence } from '@welliv/licence'\napp.post('/upload', async (req, res) => {\n  const bundle = JSON.parse(req.body.licence)\n  const r = await verifyLicence(bundle, chain)\n  if (!r.ok) return res.status(422).json({ reason: r.reason })\n  res.json({ badge: 'Licensed: Rain by Ava', anchoredHeight: r.anchoredHeight })\n})` }; } },
    { id: 'cache', actor: 'mallory', to: 'site', title: 'Try it: the cached "verified" trap', button: 'Upload an edited copy', expectFail: true, narration: 'Mallory takes the valid bundle, changes the use to advert in the offer, keeps the old signature and uploads it. A platform that cached "verified" would accept it. verifyLicence recomputes everything.',
      run: async lab => { const b = structuredClone(lab.a['bundle.upload']); b.offer.tags = b.offer.tags.map((t: string[]) => t[0] === 'use' ? ['use', 'advert', ...t.slice(2)] : t); return verdictOut(await lab.verify(b), 'Edited copy'); } },
  ],
  proven: 'The platform did not have to trust anyone: it checked the bundle itself.',
  canGoWrong: [{ text: 'The cached "verified" trap', attack: 'A1' }],
  prompts: [{ title: 'Upload checker', prompt: 'Add licence checks to a video upload endpoint: parse the bundle, call verifyLicence(bundle, chain), show a badge, and reject with the exact reason. Include tests for attacks A1 to A5.' }],
};

export const S20: Scenario = {
  id: 's20', n: 20, part: 5, emoji: '🕶️', title: 'Privacy with fresh keys', complexity: 'medium', status: 'v1',
  summary: 'Mia buys three licences. A stranger reading the network cannot link them to her or to each other. She proves only the one she chooses.',
  situation: 'Mia does not want the whole world to see every song she has licensed.',
  education: 'Each request is signed by a key derived just for that licence. Only Mia can make the private link that both her main key and the licence key sign. Timing can still give hints: fresh keys reduce linking, they do not remove it.',
  how: [{ title: 'Fresh key', description: 'deriveLicenceKey(main, offer, nonce).' }, { title: 'Private link', description: 'Signed by both keys; shown only when she wants.' }, { title: 'Limit', description: 'Timing patterns.' }],
  cast: ['mia', 'observer', 'ava'], setup: lab => baseWorld(lab),
  steps: [
    { id: 'buy3', actor: 'mia', to: 'ava', title: 'Mia buys three licences', button: 'Buy creator, podcast, advert', narration: 'Mia licenses "Rain" for three different videos.',
      run: lab => { const r = ['creator', 'podcast', 'advert'].map(k => purchase(lab, 'mia', `offer.${k}`, { name: `bundle.mia.${k}`, seconds: 30 })); lab.a['s20'] = r; return { ok: true, badge: 'real', fields: r.map(x => F(tagv(x.bundle.offer, 'd')!, `request key ${short(x.request.pubkey, 10)}`)), summary: 'Three requests from three different keys.' }; } },
    { id: 'observe', actor: 'observer', title: 'What a stranger sees', button: 'Observer view', narration: 'The observer sees three requests (sellers and relays can see them). Can it tell they are all Mia?',
      run: lab => { const r: any[] = lab.a['s20']; const keys = r.map(x => x.request.pubkey); const main = lab.pub('mia'); const linked = keys.some(k => k === main) || new Set(keys).size < keys.length;
        return { ok: !linked, badge: 'real', trace: [...keys.map((k, i) => `request ${i + 1}: key ${short(k, 10)} ${k === main ? '= Mia!' : '≠ Mia\'s main key'}`), `distinct keys: ${new Set(keys).size} of ${keys.length}`], summary: 'No key matches Mia\'s main key, and no two match each other.' }; } },
    { id: 'prove', actor: 'mia', to: 'site', title: 'Mia proves one licence', button: 'Share one bundle and link', narration: 'For YouTube, Mia shares only the creator bundle with its private link. The link proves she holds it. The other two stay private.',
      run: async lab => { const x = lab.a['s20'][0]; const v = await lab.verify(x.bundle, { chain: false, link: x.link }); return { ...verdictOut(v, 'Shared licence', `Valid; holder proven as ${short(v.result.holder)} (Mia's main key). The other two licences are not revealed.`), json: x.link }; } },
    { id: 'forge', actor: 'mallory', title: 'Try it: claim Mia\'s licence', button: 'Mallory signs a link', expectFail: true, narration: 'Mallory signs a "this licence is mine" link with only her own key. The licence key did not co-sign, so it fails.',
      run: async lab => { const x = lab.a['s20'][0]; const fake = lab.sign('mallory', 3415, [['p', x.request.pubkey], ['e', x.request.id], ['licence-sig', '00'.repeat(64)]]); const v = await lab.verify(x.bundle, { chain: false, link: fake }); return verdictOut(v, 'Mallory\'s claim'); } },
    { id: 'timing', actor: 'observer', title: 'Honest limit: timing', button: 'Look at timing', expectFail: true, narration: 'All three were bought within a minute from the same app. A careful observer at Ava\'s node might guess they are one person.',
      run: () => ({ ok: false, badge: 'limit', summary: 'Fresh keys reduce linking but do not remove it. Spacing purchases and using Lightning privacy features help.' }) },
  ],
  proven: 'The licence is valid without revealing who else Mia licenses from.',
  canGoWrong: [{ text: 'Link Mia\'s purchases', attack: 'A16' }],
  limits: ['Timing or network patterns can still hint at links.'],
  prompts: [{ title: 'Private wallet of licences', prompt: 'Build a licence wallet that derives a fresh key per licence (deriveLicenceKey), stores only the main key and nonces, and can produce a private holder link for one bundle on demand.' }],
};

export const S21: Scenario = {
  id: 's21', n: 21, part: 5, emoji: '💱', title: 'Fiat pricing', complexity: 'medium', status: 'v1',
  summary: 'Ava thinks in her own currency. Two price feeds set the sats price; if they disagree, no invoice.',
  situation: 'Ava thinks in her local currency, not in sats. Bitcoin\'s price moves.',
  education: 'The signed offer must name a sats price (verifyLicence checks it). So the Lab shows the v1-safe way: Echo checks two price feeds and asks Ava\'s signer to sign a short-lived offer at today\'s rate. Locking a fiat price only at invoice time would need a spec change (the request amount must equal the signed price).',
  how: [{ title: 'Two feeds', description: 'Refuse if they differ by more than 2%.' }, { title: 'Short-lived offer', description: 'valid-until a few blocks ahead.' }, { title: 'Both figures', description: 'Sats and local value on the invoice and statements.' }],
  cast: ['ava', 'echo', 'mia'], setup: lab => baseWorld(lab, { kinds: ['creator'] }),
  steps: [
    { id: 'feeds', actor: 'echo', title: 'Read two price feeds', button: 'Read feeds', narration: 'Ava set her price at 20 units of her currency. Echo reads two price feeds.', inputs: [{ key: 'a', label: 'Feed A (units per 1,000 sats)', type: 'number', default: 1.0 }, { key: 'b', label: 'Feed B (units per 1,000 sats)', type: 'number', default: 1.01, hint: 'Try 1.2 to make the feeds disagree.' }],
      run: (lab, i) => { const a = Number(i.a), b = Number(i.b); const diff = Math.abs(a - b) / Math.min(a, b); lab.a['s21.rate'] = (a + b) / 2; return { ok: diff <= 0.02, badge: 'sim', summary: diff <= 0.02 ? `Feeds agree (${(diff * 100).toFixed(1)}% apart). 20 units ≈ ${Math.round(20 / ((a + b) / 2) * 1000)} sats.` : `Feeds disagree by ${(diff * 100).toFixed(1)}%: Echo refuses to price anything.` }; } },
    { id: 'offer', actor: 'ava', to: 'relays', title: 'Sign today\'s offer', button: 'Sign short-lived offer', narration: 'Echo asks Ava\'s signer (her rules allow it) to sign an offer at today\'s sats price, valid for about a day of blocks.',
      run: lab => { const satsPrice = Math.round(20 / lab.a['s21.rate'] * 1000); const o = signOffer(lab, 'ava', 'creator', { name: 'offer.today', price: satsPrice, validUntil: lab.chain.tip.height + 144 }); ['jay', 'nova', 'lena'].forEach(w => consent(lab, w, 'offer.today'));
        return { ok: listing(lab, 'offer.today').forSale, badge: 'real', json: o, summary: `Offer at ${satsPrice} sats (≈ 20 units), valid until block ${tagv(o, 'valid-until')}.` }; } },
    { id: 'buy', actor: 'mia', to: 'ava', title: 'Mia buys, invoice shows both', button: 'Buy', narration: 'Mia buys. The invoice expires in 10 minutes. Her receipt shows sats and the local value at that moment.',
      run: async lab => { const r = purchase(lab, 'mia', 'offer.today', { name: 'bundle.today' }); const v = await anchorAndVerify(lab, r.bundle, 'today'); const inv = decodeInvoice(r.rec.bolt11); return { ...verdictOut(v), fields: [F('sats', Number(inv.amountMsat) / 1000), F('local value at invoice', (Number(inv.amountMsat) / 1e6 * lab.a['s21.rate']).toFixed(2) + ' units'), F('expiry', inv.expiry + ' s')] }; } },
    { id: 'gap', actor: 'echo', title: 'Open question: lock at invoice time', button: 'Try a fiat-locked invoice', openIssue: true, narration: 'The document says the node locks the fiat price into sats at invoice time. Let\'s try an invoice for a different sats amount than the signed offer.',
      run: async lab => { const { offer, binding, consents } = listing(lab, 'offer.today'); const rq = lab.lib.makePrivateRequest(lab.key('mia'), { offer, binding, use: ['creator-video', 'worldwide', 'perpetual', 'non-exclusive', 'seconds=30'], network: tagNet(), notBefore: lab.notBefore() });
        const amt = Number(tagv(rq.request, 'amount')) + 150_000; const x = lab.issueInvoice({ nodeId: 'node.ava', creditTo: 'ava', offer, binding, consents, request: rq.request, amountMsat: amt, label: 'fiat lock' }); const p = lab.pay('mia', x.rec.bolt11);
        const v = await lab.verify(lab.bundle('bundle.fiat', { offer, binding, consents, request: rq.request, invoice: x.rec.bolt11, preimage: p.preimage! }), { chain: false });
        return { ok: false, badge: 'open', verdict: v, summary: `Rejected by check ${v.checks.find(c => c.status === 'fail')?.n}: ${v.result.reason}. Fiat locking at invoice time needs a spec change (for example a signed price rule and a tolerance). Until then, use short-lived sats offers.` }; } },
  ],
  proven: 'What was paid in sats, and what it was worth at that moment.',
  canGoWrong: [{ text: 'A bad price feed: no invoice' }, { text: 'Price moves during payment: short expiry, new invoice' }],
  limits: ['Fiat locking at invoice time is not in the library yet (open question).'],
  prompts: [{ title: 'Fiat pricer', prompt: 'Write a pricer that reads two BTC price feeds, refuses if they differ by more than 2%, and produces a short-lived sats offer for the artist\'s signer to sign.' }],
};

export const S22: Scenario = {
  id: 's22', n: 22, part: 5, emoji: '🌍', title: 'A cross-border sale', complexity: 'easy', status: 'v1 + later',
  summary: 'The protocol treats everyone the same. A territory limit is just a signed field, checked by check 5.',
  situation: 'Mia lives in one country, Ava in another, and StreamCo is based in a third.',
  education: 'There are no country rules inside the protocol. If Ava has a deal elsewhere she can limit territory in her offer; a request outside it fails check 5. Tax is handled by providers.',
  how: [{ title: 'Neutral', description: 'Same facts for every sale.' }, { title: 'Territory', description: 'A signed use field.' }, { title: 'Tax', description: 'Providers, not the protocol.' }],
  cast: ['ava', 'mia', 'streamco'], setup: lab => baseWorld(lab, { kinds: ['creator'] }),
  steps: [
    { id: 'offer', actor: 'ava', to: 'relays', title: 'Ava limits a territory', button: 'Sign a regional offer', narration: 'Ava has a separate deal for one region, so she signs an offer limited to "region-a".',
      run: lab => { const o = lab.lib.makeOffer(lab.key('ava'), { ...lab.offerInput('ava', 'creator', { bindingId: lab.a['binding.ava'].id, coOwners: lab.coOwners() }), use: ['creator-video', 'region-a', 'perpetual', 'non-exclusive', 'max-seconds=240'] }); lab.a['offer.region'] = o; lab.a['offer.region.consents'] = []; lab.publish(o, 'ava', 'offer ✍'); ['jay', 'nova', 'lena'].forEach(w => consent(lab, w, 'offer.region'));
        return { ok: listing(lab, 'offer.region').forSale, badge: 'real', json: o, summary: 'Regional offer for sale: territory "region-a".' }; } },
    { id: 'wrong', actor: 'mia', to: 'ava', title: 'Try it: request worldwide', button: 'Request worldwide', expectFail: true, narration: 'Mia asks for worldwide use under the regional offer.',
      run: lab => { const { offer, binding, consents } = listing(lab, 'offer.region'); const rq = lab.lib.makePrivateRequest(lab.key('mia'), { offer, binding, use: ['creator-video', 'worldwide', 'perpetual', 'non-exclusive', 'seconds=30'], network: tagNet(), notBefore: lab.notBefore() });
        try { lab.lib.checkDeal(offer, binding, consents, rq.request); return { ok: true, summary: 'accepted' }; } catch (e: any) { return { ok: false, badge: 'real', proves: [], summary: `Check 5 fails: ${e.message}. No invoice.` }; } } },
    { id: 'right', actor: 'mia', to: 'ava', title: 'Request the right territory', button: 'Request region-a', narration: 'Mia requests "region-a" and pays over Lightning, which works the same everywhere.',
      run: async lab => verdictOut(await anchorAndVerify(lab, purchase(lab, 'mia', 'offer.region', { name: 'bundle.region', useOverride: ['creator-video', 'region-a', 'perpetual', 'non-exclusive', 'seconds=30'] }).bundle, 'region'), 'Regional licence') },
    { id: 'tax', actor: 'streamco', title: 'Tax report', button: 'Export for tax', narration: 'The bundle records what was sold, to which fresh key, when and at what price. A provider turns that into a tax report.',
      run: lab => { const b = lab.a['bundle.region']; return { ok: true, badge: 'sim', json: { licence: b.request.id, sats: Number(tagv(b.request, 'amount')) / 1000, anchoredAt: b.anchor?.height, territory: 'region-a', seller: b.offer.pubkey }, summary: 'Tax reporting through providers is planned for later.' }; } },
  ],
  proven: 'The same facts for every sale, wherever the parties are.',
  canGoWrong: [{ text: 'A territory mismatch: check 5 fails' }],
  prompts: [{ title: 'Territory-aware offers', prompt: 'Add territory to licence offers and show the exact check 5 failure when a request asks for a territory outside the offer.' }],
};

export const S23: Scenario = {
  id: 's23', n: 23, part: 5, emoji: '🔒', title: 'An exclusive request', complexity: 'medium', status: 'not in v1',
  summary: 'A brand wants "Rain" only for itself. Echo declines in protocol, Ava negotiates privately, then revokes ad offers. Earlier ad licences stay valid.',
  situation: "A brand wants 'Rain' only for itself in adverts for a year.",
  education: 'Exclusives are not sold through the protocol in v1. What the protocol can prove is that ad sales stopped at a certain block (the revocation). Earlier ad licences remain valid, and the brand must accept that.',
  how: [{ title: 'Decline', description: 'Echo\'s rules: exclusives go to Ava.' }, { title: 'Private talk', description: 'NIP-17.' }, { title: 'Revoke', description: 'Stops new ad sales.' }],
  cast: ['brand', 'echo', 'ava', 'mia'], setup: async lab => { baseWorld(lab); lab.setUp('mia'); await anchorAndVerify(lab, purchase(lab, 'mia', 'offer.advert', { name: 'bundle.earlyad', seconds: 30 }).bundle, 'early ad'); },
  steps: [
    { id: 'ask', actor: 'brand', to: 'echo', title: 'Brand asks for exclusive', button: 'Ask for exclusive ad use', narration: 'The brand\'s agent asks Echo for exclusive ad use for a year.',
      run: lab => { const m = nip17.wrapEvent(lab.key('brand'), { publicKey: lab.pub('echo') }, 'Exclusive ad use of Rain for 12 months?'); lab.flow('brand', 'echo', '✉ NIP-17', 'message'); void m; return { ok: true, badge: 'real', summary: 'Encrypted request received.' }; } },
    { id: 'decline', actor: 'echo', to: 'ava', title: 'Echo declines in protocol', button: 'Apply rules', narration: 'Echo replies that exclusives are not sold through the protocol, and hands the request to Ava.',
      run: lab => { lab.flow('echo', 'brand', '✉ "not in protocol"', 'message'); lab.flow('echo', 'ava', 'hand-off', 'message'); return { ok: true, badge: 'sim', summary: 'Rule "exclusive → ask Ava" applied. Ava negotiates off-protocol with her lawyer.' }; } },
    { id: 'revoke', actor: 'ava', to: 'bitcoin', title: 'Deal agreed: revoke ad offers', button: 'Revoke ad offer', narration: 'They agree. Ava revokes the ad offer so no new ad licences are sold.',
      run: lab => { lab.advance(3 * 3600); const o = lab.a['offer.advert']; lab.opReturn(lab.lib.revocationPayloadCompact(o.id, lab.key('ava')), 'Ad offer revocation'); (lab.a.retired ??= []).push(o.id); return { ok: true, badge: 'sim', summary: 'Ad offer revoked and anchored. This is the only part the protocol proves.' }; } },
    { id: 'earlier', actor: 'mia', title: 'Earlier ad licence stays valid', button: 'Verify Mia\'s earlier ad licence', narration: 'Mia bought an ad licence before the deal. It remains valid; the brand must accept this in its contract.',
      run: async lab => ({ ...verdictOut(await lab.verify(lab.a['bundle.earlyad']), 'Earlier ad licence'), badge: 'limit' }) },
  ],
  proven: 'Only that ad sales stopped at a certain time. The exclusive deal itself is outside the protocol.',
  canGoWrong: [{ text: 'Someone bought an ad licence earlier: it stays valid' }],
  limits: ['Exclusives are not in v1. A reservation-on-chain design exists but is out of scope.'],
  prompts: [{ title: 'Exclusive hand-off', prompt: 'Make the seller agent decline exclusive requests in protocol, hand them to the artist over NIP-17, and after a deal revoke the matching offers.' }],
};

export const S24: Scenario = {
  id: 's24', n: 24, part: 5, emoji: '🛰', title: 'Infrastructure operators', complexity: 'expert', status: 'v1 + later',
  summary: 'Relays, indexes and timestamp services run the network. One index hides a revocation; the signed status record and a full chain scan expose it.',
  situation: 'Relays, indexes and timestamp services keep the network running. They need to cover their costs.',
  education: 'Echo publishes Ava\'s daily signed status record. Several indexes copy it, so no single index can hide a revocation. A verifier that scans the chain itself (check 9) does not need to trust any index.',
  how: [{ title: 'Status record', description: 'Signed daily by the artist.' }, { title: 'Three indexes', description: 'Compare them.' }, { title: 'OP_RETURN fee', description: 'The invoice commits to the message.' }],
  cast: ['ava', 'echo', 'indexes', 'relays', 'mia'], setup: lab => { baseWorld(lab); lab.setUp('mia'); lab.a['s24.b'] = purchase(lab, 'mia', 'offer.advert', { name: 'bundle.s24', seconds: 30 }).bundle; },
  steps: [
    { id: 'fee', actor: 'echo', to: 'bitcoin', title: 'Pay an OP_RETURN service', button: 'Revoke via paid OP_RETURN', narration: 'Ava revokes the ad offer. Echo pays an OP-RETURN-Bot style service. Before paying, Echo checks that the invoice\'s description hash commits to the exact message.',
      run: lab => { lab.makeNode('node.orb', 'bitcoin', 'OP_RETURN service'); const o = lab.a['offer.advert']; const msg = lab.lib.revocationPayloadCompact(o.id, lab.key('ava')); const inv = lab.plainInvoice('node.orb', 'bitcoin', 3_000, 'orb', sha256hex(Buffer.from(msg, 'hex') as any));
        const commits = decodeInvoice(inv.bolt11).descriptionHash === sha256hex(Buffer.from(msg, 'hex') as any); if (!commits) return { ok: false, summary: 'invoice does not commit' }; lab.pay('ava', inv.bolt11); const b = lab.opReturn(msg, 'Ad revocation via OP_RETURN service'); (lab.a.retired ??= []).push(o.id); lab.a['s24.rev'] = msg;
        return { ok: true, badge: 'sim', summary: `Fee 3,000 sats paid (simulated) only after checking the invoice commits to the message (real). Mined in block ${b.height}.` }; } },
    { id: 'status', actor: 'echo', to: 'relays', title: 'Daily status record', button: 'Publish status record', narration: 'Echo publishes Ava\'s signed status record: which offers are live and which are revoked. It is also timestamped.',
      run: lab => { const st = statusRecord(lab, 'ava', [lab.a['offer.advert'].id]); lab.stamp(st.id, 'status record'); lab.anchorBatch('Status record'); lab.a['s24.status'] = st; return { ok: verifyEvent(st), badge: 'real', json: st, summary: `Status record ${short(st.id)} signed and timestamped.` }; } },
    { id: 'hide', actor: 'indexes', title: 'Try it: one index hides the revocation', button: 'Check with a lying index', expectFail: true, narration: 'Mia\'s ad licence was invoiced only minutes before the revocation, inside the 2-hour window, so the revocation cancels it. One index "forgets" the revocation. A checker that trusts only that index gets the wrong answer.',
      run: async lab => { lab.advance(1800); lab.stamp(lab.lib.grantDigest(lab.a['s24.b']), 's24'); lab.anchorBatch(); lab.attachProof(lab.a['s24.b']); const liar = new FilteredChain(lab.chain, p => p === lab.a['s24.rev']); const v = await lab.verify(lab.a['s24.b'], { chain: liar });
        lab.a['s24.liar'] = v.result.ok; return { ok: !v.result.ok, badge: 'fail', verdict: v, summary: v.result.ok ? 'Index B says "valid", because it hid the revocation. Now compare.' : 'blocked' }; } },
    { id: 'compare', actor: 'mia', title: 'Compare indexes and the record', button: 'Use three indexes + chain scan', narration: 'The checker asks three indexes and reads the signed status record, and verifyLicence scans the chain itself.',
      run: async lab => { const v = await lab.verify(lab.a['s24.b']); const listed = lab.a['s24.status'].tags.some((t: string[]) => t[0] === 'revoked' && t[1] === lab.a['offer.advert'].id);
        return { ok: !v.result.ok && listed, badge: 'real', verdict: v, trace: ['Index A: revoked', 'Index B: "valid" (hid it)', 'Index C: revoked', `Ava's signed status record: ${listed ? 'lists the revocation' : 'missing'}`, `Full chain scan (check 9): ${v.result.ok ? 'valid' : v.result.code}`], summary: 'The hidden revocation is exposed. Index B is caught out by signed, timestamped records.' }; } },
  ],
  proven: 'Anyone can run the infrastructure, and nobody can quietly change the record.',
  canGoWrong: [{ text: 'An index hides a revocation', attack: 'A17' }, { text: 'Free calendars stop: run one, or pay for OP_RETURN' }],
  limits: ['Paid relay and index fees are planned for later.'],
  prompts: [{ title: 'Status record publisher', prompt: 'Build a job that publishes a signed daily status record of live, revoked and refunded offers, timestamps it with OpenTimestamps, and a checker that compares three indexes with it.' }],
};
void signOffer; void report; void USES;
export const PART5 = [S18, S19, S20, S21, S22, S23, S24];
