import type { Scenario } from './types';
import { F, short, baseWorld } from './common';
import { onboardAlice, vouch, signOffer, consent, listing } from '../engine/actions';
import { LAB_KIND, verifyEvent, sha256hex, tagv } from '../engine/lab';
import { signLnMessage, recoverLnMessage } from '../lib/mll/lnmsg';
import { bindMessage } from '../lib/mll/events';

export const S1: Scenario = {
  id: 's1', n: 1, part: 1, emoji: '👋', title: 'Alice onboards with Echo', complexity: 'simplest', status: 'v1',
  summary: 'Alice talks to her agent Echo. Echo sets up her key and her own wallet, and links them, so payments can only reach her.',
  situation: "Alice has finished 'Rain'. She is not technical. She opens the app and talks to Echo, her agent.",
  education: 'A Nostr key is Alice\'s identity. A node binding is a signed note: "this Lightning node is mine". Vouching from people who know her is what makes the key believable. Echo can only ask Alice\'s signer for signatures; it holds no key.',
  how: [{ title: 'Key in a signer', description: 'The key lives in a remote signer (NIP-46) on Alice\'s phone, not in the app.' }, { title: 'Node binding', description: 'Alice\'s key and her node each sign, so the link works both ways.' }, { title: 'Vouching', description: 'Her distributor signs that the key is really Alice.' }],
  cast: ['alice', 'echo', 'distributor', 'host'],
  steps: [
    { id: 'chat', actor: 'echo', to: 'alice', title: 'Echo asks three questions', button: 'Start the chat', narration: 'Alice says: "I want to sell licences for my music." Echo asks her artist name, whether she owns her recordings, and where they are released.',
      inputs: [{ key: 'artist', label: 'Artist name', type: 'text', default: 'Alice' }, { key: 'owns', label: 'Do you own the recording?', type: 'select', default: 'yes', options: ['yes', 'no'] }],
      run: (lab, i) => { lab.flow('echo', 'alice', '💬 3 questions', 'message');
        if (i.owns !== 'yes') return { ok: false, badge: 'limit', summary: 'v1 is for artists who own their recordings. Echo explains that a label or rights holder must sell instead (see S18).' };
        return { ok: true, badge: 'sim', summary: `Echo has what it needs: artist "${i.artist}", owns the recording, released with a distributor.`, fields: [F('chat', 'simulated agent conversation', false)] }; } },
    { id: 'key', actor: 'echo', to: 'alice', title: 'Make Alice\'s key in her signer', button: 'Create key', narration: 'Echo asks Alice\'s phone to create her Nostr key inside a remote signer (NIP-46). Echo only gets the right to ask for signatures.',
      run: lab => { const pk = lab.pub('alice'); lab.flow('echo', 'alice', 'NIP-46 connect', 'message');
        return { ok: true, badge: 'real', summary: `Key created. Public key ${short(pk, 10)}. The signer app is simulated; the key is real secp256k1.`, fields: [F('public key (npub hex)', pk), F('where the secret lives', 'Alice\'s signer (simulated NIP-46)', false), F('Echo can sign alone?', 'no', false)], code: `import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'\nconst sk = generateSecretKey() // inside the signer\nconst pk = getPublicKey(sk) // "${short(pk)}"` }; } },
    { id: 'echo-alone', actor: 'echo', title: 'Try it: Echo signs on its own', button: 'Let Echo sign alone', expectFail: true, narration: 'What if Echo is hacked and tries to sign an offer by itself? It has no key, so the only thing it can do is ask Alice\'s signer, and the signer asks Alice.',
      run: lab => { lab.flow('echo', 'alice', 'sign? (no key)', 'refuse', false); return { ok: false, badge: 'real', summary: 'Refused: Echo holds no secret key. Every signature goes through Alice\'s signer, and anything outside her signed rules needs her tap.' }; } },
    { id: 'recovery', actor: 'alice', title: 'Choose two ways to recover', button: 'Choose recovery', narration: 'Alice picks a printed recovery sheet and a trusted contact. Echo shows her the one-tap revocation button: "If your phone is stolen, press this."',
      run: lab => { lab.a.recovery = ['printed sheet', 'trusted contact']; return { ok: true, badge: 'sim', summary: 'Recovery set: printed sheet and trusted contact. One-tap revocation is ready (see S11).', fields: [F('recovery', 'printed sheet + trusted contact', false)] }; } },
    { id: 'node', actor: 'host', to: 'alice', title: 'Open her own wallet', button: 'Open wallet', narration: 'Alice picks a one-click hosted Lightning node. The node\'s key belongs to Alice; HostCo only runs the hardware. (Many artists sharing one node is a known open issue: see attack A18.)',
      run: lab => { const n = lab.makeNode('node.alice', 'alice', "Alice's node (hosted by HostCo)"); lab.a['node.alice'] = 'node.alice'; lab.flow('host', 'alice', '⚡ node ready', 'message');
        return { ok: true, badge: 'sim', summary: `Node ready: ${short(n.pub, 10)}. The node is simulated; its key is real and signs real BOLT11 invoices.`, fields: [F('node public key', n.pub), F('who holds the node key', 'Alice', false)] }; } },
    { id: 'bind', actor: 'alice', to: 'relays', title: 'Link her wallet to her account', button: 'Link them', narration: 'Alice taps to sign: "this Lightning node is mine". The node also signs Alice\'s key, so the link works both ways. Echo publishes it to several relays.',
      run: lab => { const b = onboardAlice(lab, 'alice', { quiet: true }); const rec = recoverLnMessage(bindMessage(b.pubkey), tagv(b, 'node-sig')!);
        return { ok: verifyEvent(b) && rec === tagv(b, 'node'), badge: 'real', json: b, proves: [2], summary: `Binding ${short(b.id)} signed by Alice and by her node. Both signatures check out.`,
          fields: [F('event kind', `${b.kind} (binding, draft kind)`), F('node', short(tagv(b, 'node'), 10)), F('node-sig recovers to', short(rec, 10)), F('relays holding it', '3 of 3 (simulated)', false)],
          code: `const nodeSig = await lnd.signMessage(bindMessage(alicePub)) // LND "signmessage"\nconst binding = makeBinding(aliceSk, nodePub, nodeSig, ['*'], notBeforeBlock)\n// id ${short(b.id)}` }; } },
    { id: 'vouch', actor: 'distributor', to: 'alice', title: 'Distributor vouches', button: 'Ask for vouching', narration: 'Alice\'s distributor signs an attestation: "this key belongs to the artist Alice, who released these tracks with us". When enough vouching arrives, Alice\'s profile shows a verified badge.',
      run: lab => { const e = vouch(lab, 'distributor', 'alice'); return { ok: verifyEvent(e), badge: 'real', json: e, summary: `Vouch ${short(e.id)} signed by the distributor (NIP-32 label). Alice now shows ✓ verified.`, fields: [F('kind', `${e.kind} (NIP-32 label)`), F('names', short(lab.pub('alice'), 10)), F('badge', '✓ verified (2 of 2 sources)', false)] }; } },
    { id: 'rules', actor: 'alice', to: 'echo', title: 'Sign Echo\'s rules', button: 'Sign agent rules', narration: 'Alice signs her agent rules: Echo may sell creator licences at the list price, accept volume offers down to 80% of list, and must ask her for anything new.',
      inputs: [{ key: 'floor', label: 'Lowest price Echo may accept (% of list)', type: 'number', default: 80 }],
      run: (lab, i) => { const rules = { agent: lab.pub('echo'), sellAtList: ['creator-video', 'podcast'], volumeFloorPct: Number(i.floor), volumeMin: 20, askArtistFor: ['sync', 'exclusive', 'new-use'] };
        const e = lab.sign('alice', LAB_KIND.APPDATA, [['d', 'mll-agent-rules'], ['p', lab.pub('echo')]], JSON.stringify(rules)); lab.a['rules.echo'] = e; lab.publish(e, 'alice', 'agent rules ✍');
        return { ok: verifyEvent(e), badge: 'real', json: e, summary: `Echo's powers are written down and signed (${short(e.id)}).`, fields: [F('floor', `${i.floor}% of list`, false), F('asks Alice for', rules.askArtistFor.join(', '), false)] }; } },
  ],
  proven: "Alice's key controls a named Lightning node. Independent parties vouch that the key belongs to the real artist. Echo's powers are written down and signed.",
  canGoWrong: [{ text: 'Alice loses her phone: recover, or revoke if someone has it', attack: 'A12' }, { text: 'Echo is hacked: it cannot sign anything by itself' }, { text: 'Nobody vouches yet: buyers see "not yet verified"', attack: 'A14' }, { text: 'Many artists share one hosted node (open issue)', attack: 'A18' }],
  prompts: [{ title: 'Onboarding chat', prompt: 'Build a chat onboarding for artists that creates a Nostr key in a NIP-46 remote signer, asks the user\'s Lightning node to sign "MLL-BIND:<pubkey>", and publishes the binding. Use the music-licence library (makeBinding). Write vitest tests and a Playwright test that takes screenshots.' }],
};

export const S2: Scenario = {
  id: 's2', n: 2, part: 1, emoji: '🌧️', title: "Release 'Rain' with Carol, Dave and Erin", complexity: 'easy', status: 'v1',
  summary: 'Alice signs a licence offer with splits. It goes on sale only when every co-owner has signed a consent.',
  situation: "'Rain' has four people with a stake in the recording: Alice 50%, Carol 20%, Dave 15%, Erin 15%. v1 covers the recording only.",
  education: 'The offer is a signed Nostr event with the track hash, uses, price, splits and the hash of the licence text. Each co-owner signs a consent naming the offer\'s event id and their share. checkDeal() refuses to list it until the consents add up.',
  how: [{ title: 'Track hash', description: 'A fingerprint of the exact audio file.' }, { title: 'Offer', description: 'Signed by Alice. Its event id is unique.' }, { title: 'Consents', description: 'One signed note per co-owner.' }, { title: 'Proof of release', description: 'OpenTimestamps puts the offer into a Bitcoin block.' }],
  cast: ['alice', 'echo', 'carol', 'dave', 'erin'],
  setup: lab => { lab.setUpAll(['alice', 'distributor']); onboardAlice(lab, 'alice', { quiet: true }); vouch(lab, 'distributor', 'alice'); },
  steps: [
    { id: 'hash', actor: 'echo', title: 'Fingerprint the track', button: 'Fingerprint "Rain"', narration: 'Echo computes the track hash: a fingerprint of the exact audio file. Press play in the card to hear the demo recording.',
      run: lab => ({ ok: true, badge: 'real', summary: `SHA-256 of the ${lab.track.length.toLocaleString()}-byte demo recording: ${short(lab.trackHash, 12)}`, fields: [F('track hash', lab.trackHash)], code: `const masterSha256 = sha256hex(await file.arrayBuffer()) // "${short(lab.trackHash)}"` }) },
    { id: 'offer', actor: 'alice', to: 'relays', title: 'Sign the offer', button: 'Sign offer', narration: 'Alice checks the summary on her phone and taps Sign: creator video, worldwide, perpetual, with the splits. The offer gets a unique event id.',
      inputs: [{ key: 'price', label: 'Price (sats)', type: 'number', default: 2000 }],
      run: (lab, i) => { const o = signOffer(lab, 'alice', 'creator', { price: Number(i.price) }); const l = listing(lab, 'offer.creator');
        return { ok: true, badge: 'real', json: o, proves: [1], summary: `Offer ${short(o.id)} signed. Status: waiting for consent (${l.reason}).`,
          fields: [F('price', `${tagv(o, 'price')} sats`), F('use', o.tags.find(t => t[0] === 'use')!.slice(1).join(' · '), false), F('splits', 'Alice 50 · Carol 20 · Dave 15 · Erin 15', false), F('terms hash', short(tagv(o, 'terms'), 10))],
          code: `const offer = makeOffer(aliceSk, { track: 'rain', masterSha256, use: [...], termsText, priceSats: ${i.price}, payLink, bindingId: binding.id, validUntil, coOwners })` }; } },
    ...(['carol', 'dave', 'erin'] as const).map((who, k) => ({ id: `consent-${who}`, actor: who, to: 'relays', title: `${who[0].toUpperCase() + who.slice(1)} agrees`, button: 'Tap Agree',
      narration: `${who[0].toUpperCase() + who.slice(1)} opens the link, sees "Rain, your share: ${who === 'carol' ? '20' : '15'}%" and taps Agree. The tap signs a consent naming the offer's event id and the share.`,
      run: (lab: any) => { const c = consent(lab, who, 'offer.creator'); const l = listing(lab, 'offer.creator');
        return { ok: verifyEvent(c), badge: 'real' as const, json: c, proves: l.forSale ? [3] : [], summary: `Consent ${short(c.id)} signed. ${l.forSale ? 'All three consents are in: the offer is FOR SALE.' : `Still waiting: ${l.reason}`}`,
          fields: [F('names offer', short(tagv(c, 'e'))), F('share', `${Number(tagv(c, 'share')) / 100}%`), F('listing', l.forSale ? 'for sale' : 'waiting for consent', false)], code: `makeConsent(${who}Sk, offer, ${tagv(c, 'share')}, payout)\ncheckDeal(offer, binding, consents, null) // ${l.forSale ? 'passes' : 'throws ' + l.code}` }; } })),
    { id: 'ots', actor: 'echo', to: 'bitcoin', title: 'Timestamp the release', button: 'Date it on Bitcoin', narration: 'Echo timestamps the offer and consents with OpenTimestamps. This is the proof of release: anyone can later show the offer for this exact audio existed by a certain Bitcoin block.',
      run: async lab => { const D = sha256hex(JSON.stringify([lab.a['offer.creator'].id, ...lab.a['offer.creator.consents'].map((c: any) => c.id)])); lab.stamp(D, 'proof of release'); lab.stamp(lab.a['offer.creator'].id, 'offer id');
        lab.advance(1800); const b = lab.anchorBatch('Proof of release')!; const r = await lab.checkStamp(D);
        return { ok: r.status === 'confirmed', badge: 'sim', summary: `Real .ots proof, checked against simulated block ${b.height}: ${r.status}. (A real OpenTimestamps proof on Mutinynet, from the recorded live run, is under the hood in Real runs.)`, fields: [F('digest', short(D, 12)), F('block', b.height), F('proof bytes', lab.proofs[D].ots.length / 2)], code: `const proof = await otsStamp(calendar, digest)\nawait verifyOts(proof, digest, chain) // ${r.status}` }; } },
    { id: 'changed', actor: 'mallory', title: 'Try it: change the audio', button: 'Fingerprint a changed file', expectFail: true, narration: 'Someone changes a few bytes of the audio and claims it is the same song. A different file has a different hash, so this offer does not cover it.',
      run: lab => { const b = lab.track.slice(); b[1000] ^= 1; const h = sha256hex(b); return { ok: false, badge: 'real', summary: `One flipped bit gives a different hash: ${short(h, 12)} ≠ ${short(lab.trackHash, 12)}. Not covered by this offer.` }; } },
  ],
  proven: 'Exactly who agreed to sell what, at what price and split, and since when.',
  canGoWrong: [{ text: 'Dave does not sign: the offer cannot be sold', attack: 'A3' }, { text: 'Shares do not add up: check 3 fails', attack: 'A3' }, { text: 'Someone changes the audio: different hash' }],
  prompts: [{ title: 'Release flow with consents', prompt: 'Build a release page: hash an uploaded audio file, let the artist sign a licence offer (makeOffer) with co-owner splits, send each co-owner a consent link (makeConsent), and show "for sale" only when checkDeal(offer, binding, consents, null) passes. Include tests for a missing and a forged consent.' }],
};
