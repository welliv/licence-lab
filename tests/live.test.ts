import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';
import { LiveWorld, memoryStore } from '../src/live/live';
import { parseNwc } from '../src/live/nwc';
(globalThis as any).WebSocket ??= WebSocket;
describe('live tier guards (offline)', () => {
  it('parses an NWC connection string and rejects junk', () => {
    const u = 'nostr+walletconnect://' + 'a'.repeat(64) + '?relay=wss://relay.getalby.com&relay=wss://relay2.getalby.com&secret=' + 'b'.repeat(64) + '&lud16=x@getalby.com';
    expect(parseNwc(u).relays).toHaveLength(2); expect(() => parseNwc('nostr+walletconnect://abc?relay=x')).toThrow(); });
  it('every action has a clear guard when its inputs are missing', async () => {
    const w = new LiveWorld(memoryStore());
    expect(() => w.publish()).toThrow(/Alice has no test wallet/);
    expect(() => w.requestLicence()).toThrow(/not published an offer/);
    await expect(w.issueInvoice()).rejects.toThrow(/no licence request/);
    await expect(w.pay()).rejects.toThrow(/no invoice to pay/);
    await expect(w.verify()).rejects.toThrow(/not complete/);
    await expect(w.payout()).rejects.toThrow(/Nothing has been sold/);
  });
});
describe.skipIf(!process.env.LIVE)('live tier against the real NWC faucet (LIVE=1)', () => {
  it('real invoice commits to the request; real payment; verifyLicence runs on the real preimage', async () => {
    const w = new LiveWorld(memoryStore()); for (const p of ['alice', 'bob', 'carol', 'dave', 'erin'] as const) await w.connect(p);
    w.publish(50); w.requestLicence('bob', 60); await w.issueInvoice(); const before = w.balances.bob!; const pre = await w.pay('bob');
    expect(pre).toMatch(/^[0-9a-f]{64}$/); expect(w.balances.bob).toBe(before - 50);
    await expect(w.pay('bob')).rejects.toThrow(/Already paid/);
    const v = await w.verify(); expect(v.strict.result.ok).toBe(false); expect((v.strict.result as any).code).toBe('binding_node_sig');
    expect(v.facts.slice(0, 5).every(f => f.ok)).toBe(true);
    const lines = await w.payout(); expect(lines.join(' ')).toMatch(/Carol 10 sats/); w.close();
  }, 120000);
});
