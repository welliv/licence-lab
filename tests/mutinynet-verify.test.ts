// The Verify page's Mutinynet mode: the real "Rain" licence from the v2 live run, checked against mutinynet.com (network test; skipped offline).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { verifyLicence } from '../src/lib/mll/verify';
import { MutinynetChain } from '../src/live/mutinynet';
const b = JSON.parse(fs.readFileSync(new URL('../public/mutinynet/licence-bundle-mutinynet-v2.json', import.meta.url), 'utf8'));
const vouch = JSON.parse(fs.readFileSync(new URL('../public/mutinynet/owner-vouch-mutinynet-v2.json', import.meta.url), 'utf8'));
const online = await fetch('https://mutinynet.com/api/blocks/tip/height', { signal: AbortSignal.timeout(5000) }).then(r => r.ok).catch(() => false);
describe.skipIf(!online)('Verify page, Mutinynet mode (mutinynet.com)', () => {
  it('the real "Rain" licence (sha256 54bdd620…) passes 1-9 against mutinynet.com, and check 10 with the distributor vouch', async () => {
    expect(b.offer.tags.find((t: string[]) => t[0] === 'x')[1]).toBe('54bdd6209af9d5aa84cdd71f904047fb7269cd0cf106f79c32356c20c4b65695');
    const r = await verifyLicence(structuredClone(b), new MutinynetChain(), { ownership: { trust: [vouch.pubkey], vouches: [vouch] } });
    expect(r.ok).toBe(true); expect(r.checks).toContain('9 no prior revocation'); expect(r.checks).toContain('10 ownership (vouch)'); expect(r.anchoredHeight).toBe(b.anchor.height);
  }, 60000);
  it('the same licence with a changed preimage or the wrong anchor transaction is refused', async () => {
    expect((await verifyLicence({ ...structuredClone(b), preimage: '00'.repeat(32) }, new MutinynetChain())).code).toBe('preimage');
    expect((await verifyLicence({ ...structuredClone(b), anchor: { ...b.anchor, txid: '8998c7e59afbb3936c71304abcfbf6034a63ba2fb3794bdfdd85c76e8eb82740' } }, new MutinynetChain())).ok).toBe(false);
  }, 60000);
});
