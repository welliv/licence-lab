// End-to-end Live tier run against the public NWC faucet. Saves evidence to docs/live-evidence.json.
import WebSocket from 'ws'; (globalThis as any).WebSocket = WebSocket;
import { writeFileSync } from 'fs';
import { LiveWorld, LIVE_PARTIES } from '../src/live/live';
import { decodeInvoice } from '../src/lib/mll/bolt11';
const w = new LiveWorld(); const ev: any = { startedAt: new Date().toISOString(), steps: [] }; const step = (name: string, x: any) => { ev.steps.push({ name, ...x }); console.log('•', name, JSON.stringify(x).slice(0, 300)); };
for (const p of LIVE_PARTIES) await w.connect(p);
step('wallets', { faucetNode: w.faucetNode, lud16: w.lud16, balances: { ...w.balances } });
const budget = await w.wallets.scout!.call('get_budget').catch((e: any) => ({ error: e.code + ' ' + e.message })); step('faucet get_budget (scout)', { budget });
await w.topUp('mia', 300); step('top-up mia +300', { mia: w.balances.mia });
w.publish(100); step('publish', { binding: w.binding!.id, offer: w.offer!.id, consents: w.consents.length });
w.requestLicence('mia', 60); step('request', { request: w.request!.id, pubkey: w.request!.pubkey, mainPub: w.pub('mia') });
const inv = await w.issueInvoice(); const d = decodeInvoice(inv); step('invoice', { invoice: inv, prefix: inv.slice(0, 6), payee: d.payee, descriptionHash: d.descriptionHash, requestHash: w.reqs!.extra.requestHash, amountMsat: String(d.amountMsat) });
const before = { ...w.balances }; const pre = await w.pay('mia'); step('pay', { preimage: pre, paymentHash: d.paymentHash, before: { mia: before.mia, ava: before.ava }, after: { mia: w.balances.mia, ava: w.balances.ava } });
try { await w.pay('mia'); step('pay again', { refused: false }); } catch (e: any) { step('pay again', { refused: true, reason: e.message }); }
const v = await w.verify(); step('verifyLicence', { ok: v.strict.result.ok, code: (v.strict.result as any).code, reason: (v.strict.result as any).reason, checks: v.strict.checks.map(c => `${c.n}:${c.status}`), facts: v.facts.map(f => `${f.ok ? '✓' : '✗'} ${f.label}`) });
const lines = await w.payout(); step('payout', { lines, balances: { ...w.balances } });
// Agent: Scout buys with a Lab-enforced budget (faucet wallets have no budget)
w.budget = { maxPerPaymentSat: 300, dailyCapSat: 150, spentSat: 0 };
w.requestLicence('scout', 30); await w.issueInvoice(); await w.pay('scout'); step('scout pays within Lab budget', { spent: w.budget.spentSat, scout: w.balances.scout });
w.requestLicence('scout', 30); await w.issueInvoice(); try { await w.pay('scout'); step('scout second buy', { refused: false }); } catch (e: any) { step('scout second buy', { refused: true, reason: e.message }); }
ev.finishedAt = new Date().toISOString(); writeFileSync('docs/live-evidence.json', JSON.stringify(ev, null, 2)); w.close(); process.exit(0);
