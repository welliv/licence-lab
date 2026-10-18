// Alby Hub as a seller node: its NIP-47 sign_message (LDK backend) must produce a node-key signature that the binding check accepts.
// The fixture is a real signature from Alby Hub v1.24.3 (LDK, Mutinynet), captured 2026-10-18 for the fixed test key 0x11…11. Public data only.
import { describe, it, expect } from 'vitest';
import { getPublicKey } from 'nostr-tools/pure';
import { recoverLnMessage, signLnMessage } from '../src/lib/mll/lnmsg';
import { bindMessage, makeBinding, makeOffer } from '../src/lib/mll/events';
import { checkDeal } from '../src/lib/mll/verify';
import { bindingViaNwc, type NwcLike } from '../src/lib/mll/nodebind';
import { TERMS } from '../src/engine/lab';
const HUB = { node: '02242f22dda7bec6178ed4b95c6e78e694decb4182a401848b9d25deaedf4a41ea', signature: 'rdnh4epazbbe1eh4rd33nxoux1rdebsumx1dzitcyyrp5cbc3jk4w4cqy95hhgkchec3go4zuwz1cc6nkk17zjp6dp31g7jjxcwz6w68' };
const artist = new Uint8Array(32).fill(0x11); const artistPub = getPublicKey(artist);
const offerFor = (b: ReturnType<typeof makeBinding>) => makeOffer(artist, { track: 'rain', title: 'Rain', masterSha256: 'ab'.repeat(32), use: ['personal', 'worldwide', 'perpetual', 'non-exclusive'], termsText: TERMS.personal ?? TERMS.creator, priceSats: 100, payLink: 'https://alice.lab.test/licence/rain/personal', bindingId: b.id, validUntil: 999_999_999, coOwners: [] });
const hubLike = (o: { methods?: string[]; pubkey?: string; sign?: (m: string) => any }): NwcLike => ({ async call(method, params) {
  if (method === 'get_info') return { result: { pubkey: o.pubkey ?? HUB.node, network: 'signet', methods: o.methods ?? ['get_info', 'make_invoice', 'lookup_invoice', 'sign_message'] } };
  if (method === 'sign_message') return o.sign ? o.sign(String(params.message)) : { result: { message: params.message, signature: HUB.signature } };
  throw new Error('unexpected ' + method); } });
describe('Alby Hub (LDK) node-key binding', () => {
  it('the real Alby Hub sign_message signature recovers to the Hub node key', () => {
    expect(recoverLnMessage(bindMessage(artistPub), HUB.signature)).toBe(HUB.node);
  });
  it('a binding carrying it passes check 3 (binding_node_sig) in checkDeal', () => {
    const b = makeBinding(artist, HUB.node, HUB.signature, ['*'], undefined, { method: 'nwc-sign_message' });
    expect(() => checkDeal(offerFor(b), b, [], null)).not.toThrow();
  });
  it('the same signature does not bind a different artist key', () => {
    const other = new Uint8Array(32).fill(0x22); const b = makeBinding(other, HUB.node, HUB.signature);
    const o = makeOffer(other, { track: 'rain', title: 'Rain', masterSha256: 'ab'.repeat(32), use: ['personal', 'worldwide', 'perpetual', 'non-exclusive'], termsText: TERMS.creator, priceSats: 1, payLink: 'https://x.test/l', bindingId: b.id, validUntil: 999_999_999, coOwners: [] });
    expect(() => checkDeal(o, b, [], null)).toThrow(/node-sig was not made by the bound node/);
  });
  it('bindingViaNwc builds a valid binding from an Alby Hub-shaped connection', async () => {
    const { binding, node } = await bindingViaNwc(hubLike({}), artist);
    expect(node).toBe(HUB.node); expect(binding.tags.find(t => t[0] === 'node-sig')?.[2]).toBe('nwc-sign_message');
    expect(() => checkDeal(offerFor(binding), binding, [], null)).not.toThrow();
  });
  it('a sub-wallet (no sign_message in get_info, as on faucet.nwc.dev) is refused with NO_SIGN_MESSAGE', async () => {
    await expect(bindingViaNwc(hubLike({ methods: ['get_info', 'make_invoice', 'pay_invoice'] }), artist)).rejects.toMatchObject({ code: 'NO_SIGN_MESSAGE' });
  });
  it('a RESTRICTED answer to sign_message (a connection without the scope) is refused and no binding is made', async () => {
    const w = hubLike({ sign: () => ({ error: { code: 'RESTRICTED', message: 'This app does not have the sign_message scope' } }) });
    await expect(bindingViaNwc(w, artist)).rejects.toMatchObject({ code: 'RESTRICTED' });
  });
  it('a signature by some other key (shared or proxied node) is refused with NODE_SIG_MISMATCH', async () => {
    const w = hubLike({ sign: m => ({ result: { message: m, signature: signLnMessage(m, new Uint8Array(32).fill(7)) } }) });
    await expect(bindingViaNwc(w, artist)).rejects.toMatchObject({ code: 'NODE_SIG_MISMATCH' });
  });
});
