import WS from 'ws'; (globalThis as any).WebSocket ??= WS;
// Smoke test for Stop 1 real test money (faucet.nwc.dev, faucet-only sats). Run: npx tsx scripts/realpay-smoke.mts
import { faucetReachable, realLicence } from '../src/live/realpay.ts';
console.log('reachable', await faucetReachable());
const r = await realLicence({ onStep: s => console.log(' ', s) });
console.log(JSON.stringify({ ok: r.strict.result.ok, code: r.strict.result.code, facts: r.facts.map(f => [f.ok, f.label]), ms: Math.round(r.ms), aliceGot: r.aliceGot, ph: r.paymentHash, wallets: [r.aliceWallet, r.bobWallet] }, null, 1)); process.exit(0);
