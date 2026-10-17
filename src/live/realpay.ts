// Stop 1 "Use real test money": real faucet.nwc.dev wallets made silently, a real Lightning payment, and the real verifyLicence on the real preimage.
// Faucet sats exist only inside the faucet. Every faucet wallet shares ONE node, and that node refuses sign_message, so check 2/3 (the artist's own node
// signed the binding) cannot pass here. We say so plainly and point to the Mutinynet licence, where Alice's own node did sign.
import { FAUCET } from './nwc';
import { LiveWorld, memoryStore } from './live';
import type { Verdict } from '../engine/lab';
export async function faucetReachable(ms = 3000): Promise<boolean> {
  try { await fetch(FAUCET, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(ms) }); return true; } catch { return false; }
}
export interface RealResult { strict: Verdict; facts: { label: string; ok: boolean; how: string }[]; paymentHash: string; preimage: string; invoice: string; aliceWallet?: string; bobWallet?: string; ms: number; aliceGot: number; offerSha256?: string }
/** One real purchase: Alice and Bob (or Bob's agent) get fresh faucet wallets, Alice signs the offer, the buyer pays the real invoice, and we verify. */
export async function realLicence(o: { priceSat?: number; buyer?: 'bob' | 'bobagent'; song?: { title: string; sha256: string; termsText: string; use?: string[] }; budget?: { maxPerPaymentSat: number; dailyCapSat: number }; onStep?: (s: string) => void } = {}): Promise<RealResult> {
  const step = o.onStep ?? (() => {}); const w = new LiveWorld(memoryStore()); const buyer = o.buyer ?? 'bob'; const t0 = performance.now(); if (o.budget) w.budget = { ...o.budget, spentSat: 0 };
  step('Making test wallets…'); await Promise.all([w.connect('alice', 50), w.connect(buyer, Math.min(5000, (o.priceSat ?? 100) + 300))]); const before = w.balances.alice ?? 0; // faucet test wallets hold up to 5,000 test sats
  w.publish(o.priceSat ?? 100, o.song); w.requestLicence(buyer); step('Asking for the invoice…'); await w.issueInvoice();
  step(`Paying ${o.priceSat ?? 100} test sats…`); const preimage = await w.pay(buyer); step('Checking the licence…'); const { strict, facts } = await w.verify(); await w.refresh('alice');
  const inv = w.reqs!.extra.invoice as string; const { decodeInvoice } = await import('../lib/mll/bolt11');
  for (const p of ['alice', buyer] as const) w.wallets[p]?.close();
  return { strict, facts, paymentHash: decodeInvoice(inv).paymentHash, preimage, invoice: inv, aliceWallet: w.lud16.alice, bobWallet: w.lud16[buyer], ms: performance.now() - t0, aliceGot: (w.balances.alice ?? 0) - before, offerSha256: w.offer?.tags.find(t => t[0] === 'x')?.[1] };
}
