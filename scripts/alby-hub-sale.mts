// Live end-to-end sale with an Alby Hub (LDK backend, Mutinynet) as Alice's seller node over NWC. Test coins only.
// Alice binds her Nostr key to the Hub's node key (sign_message), signs an offer; Bob's agent signs a request; the Hub makes an invoice whose
// description_hash commits to the request; a Mutinynet LND node (test coins) pays it; verifyLicence runs on the real preimage.
// Reads the NWC URI from ALBY_NWC_FILE. Prints no secrets and no preimage; writes the bundle to BUNDLE_OUT (outside the repo).
import WebSocket from 'ws'; (globalThis as any).WebSocket = WebSocket;
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { sha256 } from '@noble/hashes/sha256'; import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Nwc } from '../src/live/nwc';
import { bindingViaNwc } from '../src/lib/mll/nodebind';
import { makeOffer, makeConsent, makePrivateRequest, tagv } from '../src/lib/mll/events';
import { verifyLicence, requestBytes, type LicenceBundle } from '../src/lib/mll/verify';
import { clientCheck, httpBinding, requestHash, NETWORKS, type Requirements } from '../src/lib/mll/x402';
import { decodeInvoice } from '../src/lib/mll/bolt11';
import { TERMS, USES } from '../src/engine/lab';
const hub = new Nwc(fs.readFileSync(process.env.ALBY_NWC_FILE!, 'utf8').trim());
const alice = generateSecretKey(), bob = generateSecretKey(), carol = generateSecretKey(), dave = generateSecretKey();
const info: any = await hub.getInfo(); const out: Record<string, unknown> = { hubNetwork: info.network, hubNode: info.pubkey };
const { binding, node } = await bindingViaNwc(hub, alice, { notBefore: info.block_hash });
const offer = makeOffer(alice, { track: 'rain', title: 'Rain', masterSha256: bytesToHex(sha256(new TextEncoder().encode('Rain (Alby Hub test master)'))), use: USES.creator.slice(1), termsText: TERMS.creator, priceSats: 100,
  payLink: 'https://alice.lab.test/licence/rain/creator', bindingId: binding.id, validUntil: 999_999_999,
  coOwners: [{ pubkey: getPublicKey(carol), role: 'carol', bps: 2000 }, { pubkey: getPublicKey(dave), role: 'dave', bps: 1500 }] });
const consents = [makeConsent(carol, offer, 2000, 'carol@lab.test'), makeConsent(dave, offer, 1500, 'dave@lab.test')];
const use = USES.creator.slice(1).filter(x => !x.startsWith('max-seconds')).concat('seconds=60');
const { request, link } = makePrivateRequest(bob, { offer, binding, network: NETWORKS.signet.id, notBefore: info.block_hash, use });
const dh = requestHash(httpBinding('POST', tagv(offer, 'pay-link')!, requestBytes(request), { 'content-type': 'application/json' }));
const r = await hub.makeInvoice(100, { descriptionHash: dh }); const inv = decodeInvoice(r.invoice);
const reqs: Requirements = { scheme: 'exact', network: NETWORKS.signet.id, amount: '100000', asset: 'BTC', payTo: inv.payee!, maxTimeoutSeconds: 600, extra: { assetTransferMethod: 'bolt11', paymentFlow: 'upfront', requestHash: dh, requestBindingProfile: 'http:1', requestBindingParams: { headers: ['content-type'] }, invoice: r.invoice } } as any;
clientCheck(reqs, dh, node, Math.floor(Date.now() / 1000), 60, tagv(request, 'amount')); out.clientCheck = 'passed';
const pay = JSON.parse(execFileSync('bash', ['-c', '. "${MUTINYNET_DIR:-../mutinynet}/net/env.sh"; lnc sam payinvoice --force --json "$INV"'], { env: { ...process.env, INV: r.invoice }, encoding: 'utf8', timeout: 120000 }).trim().split('\n').filter(Boolean).join('\n'));
const preimage = pay.payment_preimage as string; out.paid = { status: pay.status, preimageMatchesHash: bytesToHex(sha256(hexToBytes(preimage))) === inv.paymentHash, feeSat: pay.fee_sat };
const looked: any = await hub.lookupInvoice(inv.paymentHash); out.hubLookup = { state: looked.state, settled: !!looked.settled_at, preimageMatches: looked.preimage === preimage };
const bundle: LicenceBundle = { version: 1, offer, binding, consents, request, invoice: r.invoice, preimage };
const v = await verifyLicence(structuredClone(bundle), undefined, { link }); out.verifyLicence = { ok: v.ok, code: (v as any).code, checks: v.checks, reason: (v as any).reason };
out.tamper = { wrongPreimage: (await verifyLicence({ ...structuredClone(bundle), preimage: '00'.repeat(32) })).code };
if (process.env.BUNDLE_OUT) fs.writeFileSync(process.env.BUNDLE_OUT, JSON.stringify(bundle), { mode: 0o600 });
out.paymentHash = inv.paymentHash; out.bindingId = binding.id; out.nodeSigMethod = binding.tags.find(t => t[0] === 'node-sig')?.[2];
console.log(JSON.stringify(out, (_k, x) => typeof x === 'bigint' ? String(x) : x, 2)); hub.close(); process.exit(0);
