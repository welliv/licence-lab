// The Lab world: parties, simulated Lightning nodes and wallets, in-memory relays, a simulated Bitcoin chain.
// Every signature, invoice, hash, timestamp proof and verification is made with the REAL protocol library (src/lib/mll).
// Only the money movement, the network transport and the Bitcoin blocks are simulated, and every log line says which.
import './polyfill';
import { finalizeEvent, getPublicKey, type Event } from 'nostr-tools/pure';
import { secp256k1 } from '@noble/curves/secp256k1';
import { KIND, makeBinding, makeOffer, makeConsent, makeRequest, makePrivateRequest, makeRevocation, makeStatement, bindMessage, tagv, verifyEvent, checkLink, type OfferInput } from '../lib/mll/events';
import { signLnMessage } from '../lib/mll/lnmsg';
import { encodeInvoice, decodeInvoice, type Invoice } from '../lib/mll/bolt11';
import { httpBinding, requestHash, NETWORKS, clientCheck, type Requirements } from '../lib/mll/x402';
import { checkDeal, verifyLicence, requestBytes, grantDigest, revocationPayloadCompact, type LicenceBundle, type Result } from '../lib/mll/verify';
import { type ChainOracle, MLA1 } from '../lib/mll/chain';
import { writeOts, verifyOts, type Op } from '../lib/mll/ots';
import { sha256hex, sha256, bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes } from '../lib/mll/util';
import { CAST, persona } from './cast';
import { rainWav } from './track';
export type { Event, LicenceBundle, Result, Requirements, Invoice };
export { KIND, tagv, verifyEvent, decodeInvoice, grantDigest, checkLink, sha256hex };

export const NET = NETWORKS.signet; // signet-style test network ("lntbs" invoices), the same family as Mutinynet
export const TERMS: Record<string, string> = {
  creator: 'Standard creator licence for "Rain": non-exclusive use of the recording in online video, worldwide, perpetual. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.',
  advert: 'Advert licence for "Rain": non-exclusive use of the recording in adverts, worldwide, 1 year. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.',
  training: 'AI training licence for "Rain": non-exclusive use of the recording as training data, worldwide, perpetual, no output that reproduces the recording. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.',
  podcast: 'Podcast licence for "Rain": non-exclusive use of the recording in podcasts, worldwide, perpetual. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.',
  sync: 'One-off sync licence for "Rain": use in one game trailer and in the game, worldwide, 5 years, as agreed in private messages. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.',
  remix: 'Remix licence for "Rain": release one remix, worldwide, perpetual, 30% of remix income to the original owners. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.',
};
export const USES: Record<string, string[]> = {
  creator: ['use', 'creator-video', 'worldwide', 'perpetual', 'non-exclusive', 'max-seconds=240'],
  advert: ['use', 'advert', 'worldwide', '1y', 'non-exclusive', 'max-seconds=60'],
  training: ['use', 'ai-training', 'worldwide', 'perpetual', 'non-exclusive'],
  podcast: ['use', 'podcast', 'worldwide', 'perpetual', 'non-exclusive', 'max-seconds=240'],
  sync: ['use', 'sync', 'worldwide', '5y', 'non-exclusive', 'max-seconds=180'],
  remix: ['use', 'remix', 'worldwide', 'perpetual', 'non-exclusive'],
};
/** Placeholder kinds the Lab uses for things the spec has not named yet. Shown with a "draft" note in the UI. */
export const LAB_KIND = { VOUCH: 1985 /* NIP-32 label */, REPORT: 1984 /* NIP-56 */, APPDATA: 30078 /* NIP-78: agent rules, status record */, BADGE_DEF: 30009, BADGE_AWARD: 8, REFUND: 3416 /* placeholder */, NOTE: 1 } as const;

export type Badge = 'real' | 'sim' | 'limit' | 'open' | 'fail' | 'recorded';
export interface LogEntry { id: number; t: number; step?: string; from: string; to?: string; amountSat?: number; text: string; badge: Badge; ok: boolean; code?: string; data?: unknown }
export interface Flow { id: number; step?: string; from: string; to: string; label: string; kind: 'event' | 'invoice' | 'payment' | 'preimage' | 'anchor' | 'message' | 'report' | 'check' | 'refuse'; ok: boolean; code?: string }
export interface NodeRec { id: string; label: string; priv: string; pub: string; operator: string; tenants: string[]; online: boolean }
export interface InvoiceRec { bolt11: string; paymentHash: string; preimage: string; node: string; creditTo: string; amountMsat: number; paid: boolean; paidBy?: string; label: string; refunded?: boolean }
export interface Nwc { maxPerPaymentSat: number; dailyCapSat: number; monthlyCapSat: number; expiresAt: number; methods: string[]; spentTodaySat: number; spentMonthSat: number; revoked?: boolean }
export interface PayRecord { status: 'in_flight' | 'paid' | 'failed'; amountSat: number; preimage?: string; invoice: string; requestId?: string }
export interface Block { height: number; hash: string; time: number; merkleRoot: string; ors: { payload: string; txid: string }[]; note?: string }
export interface DocCheck { n: number; label: string; status: 'pass' | 'fail' | 'skip' | 'todo'; detail?: string }
export interface Verdict { result: Result; checks: DocCheck[]; ms: number; passed: number }

export const NINE = ['Offer signed by the artist', 'Node binding by the same key names the invoice node', 'Every co-owner consented; shares add up',
  'Request signed and names this offer', 'Use, territory and term allowed by the offer', 'Invoice signed by the bound node and commits to the request',
  'Invoice amount equals the price', 'Preimage matches (it was paid)', 'Timestamped, and no revocation cancels it'];
// Where each library failure code lands in the document's nine checks, and its order inside verifyLicence.
const CODE_MAP: [RegExp, number, number][] = [[/^offer_/, 1, 0], [/^consent_/, 3, 1], [/^binding_(?!not_before)/, 2, 2], [/^request_use$/, 5, 3.5], [/^request_/, 4, 3], [/^link_invalid$/, 4, 3.9],
  [/^invoice_(decode|description|not_committed)$/, 6, 4], [/^invoice_wrong_node$/, 6, 5], [/^invoice_amount$/, 7, 5.5], [/^invoice_network$/, 6, 5.7], [/^preimage$/, 8, 6], [/./, 9, 7]];
const POS: Record<number, number> = { 1: 0, 3: 1, 2: 2, 4: 3, 5: 3.5, 6: 5, 7: 5.5, 8: 6, 9: 7 };
export function mapChecks(r: Result, withChain: boolean): DocCheck[] {
  const fail = r.ok ? null : CODE_MAP.find(([re]) => re.test(r.code ?? ''))!;
  return NINE.map((label, i) => { const n = i + 1;
    if (!fail) return { n, label, status: n === 9 && !withChain ? 'skip' : 'pass', detail: n === 9 && !withChain ? 'needs a chain (no timestamp checked)' : undefined };
    if (n === fail[1]) return { n, label, status: 'fail', detail: r.reason };
    return { n, label, status: POS[n] < fail[2] ? 'pass' : 'todo' }; });
}

const h2 = (s: string) => sha256(utf8ToBytes(s));
export const short = (h?: string, n = 8) => (h ? (h.length > 2 * n + 1 ? `${h.slice(0, n)}…${h.slice(-4)}` : h) : '');
export const sats = (msat: number) => Math.round(msat / 1000);

/** Simulated Bitcoin chain. Implements the library's ChainOracle, so verifyLicence really scans it. */
export class SimChain implements ChainOracle {
  method = 'simulated chain (Licence Lab, not Bitcoin)';
  blocks: Block[] = [];
  constructor(public seed: string, start: number, startTime: number, n = 12) { for (let i = 0; i < n; i++) this.push(start + i, startTime - (n - 1 - i) * 600, []); }
  private push(height: number, time: number, ors: { payload: string; txid: string }[], merkleRoot?: string, note?: string) {
    const hash = bytesToHex(h2(`lab-block:${this.seed}:${height}:${merkleRoot ?? ''}`)); const b: Block = { height, hash, time, merkleRoot: merkleRoot ?? bytesToHex(h2(`root:${height}`)), ors, note }; this.blocks.push(b); return b;
  }
  get tip() { return this.blocks[this.blocks.length - 1]; }
  mine(opts: { time: number; opReturns?: string[]; merkleRootInternal?: Uint8Array; note?: string }) {
    const ors = (opts.opReturns ?? []).map(p => ({ payload: p, txid: sha256hex(p + ':' + (this.tip.height + 1)) }));
    const root = opts.merkleRootInternal ? bytesToHex(opts.merkleRootInternal.slice().reverse()) : undefined; // display order, like bitcoind
    return this.push(this.tip.height + 1, Math.max(opts.time, this.tip.time + 1), ors, root, opts.note);
  }
  at(h: number) { return this.blocks.find(b => b.height === h); }
  async heightOfBlockHash(hash: string) { return this.blocks.find(b => b.hash === hash)?.height ?? null; }
  async opReturnHeight(txid: string, blockhash: string, payload: string) { const b = this.blocks.find(x => x.hash === blockhash); return b && b.ors.some(o => o.txid === txid && o.payload === payload) ? b.height : null; }
  async scanOpReturns(prefix: string, maxHeight: number, minHeight = 0) { const out: { payload: string; height: number; txid: string }[] = [];
    for (const b of this.blocks) if (b.height >= minHeight && b.height <= maxHeight) for (const o of b.ors) if (o.payload.startsWith(prefix)) out.push({ ...o, height: b.height }); return out; }
  async blockTime(h: number) { return this.at(h)?.time ?? null; }
  async merkleRootAtHeight(h: number) { return this.at(h)?.merkleRoot ?? null; }
}

/** A chain view that hides some blocks' OP_RETURNs (an index that "forgets" a revocation, S24 / A17). */
export class FilteredChain implements ChainOracle {
  constructor(public inner: SimChain, public hide: (payload: string) => boolean, public method = 'index view (trusts one index)') {}
  heightOfBlockHash(h: string) { return this.inner.heightOfBlockHash(h); }
  opReturnHeight(t: string, b: string, p: string) { return this.inner.opReturnHeight(t, b, p); }
  async scanOpReturns(p: string, max: number, min = 0) { return (await this.inner.scanOpReturns(p, max, min)).filter(o => !this.hide(o.payload)); }
  blockTime(h: number) { return this.inner.blockTime(h); }
  merkleRootAtHeight(h: number) { return this.inner.merkleRootAtHeight(h); }
}

export interface Relay { url: string; online: boolean; events: Event[] }

export class Lab {
  seed: string; now: number; private seq = 0;
  ready = new Set<string>();
  balances: Record<string, number> = {};
  sk: Record<string, string> = {};
  nodes: Record<string, NodeRec> = {};
  invoices: Record<string, InvoiceRec> = {};
  nwc: Record<string, Nwc> = {};
  ledgers: Record<string, Record<string, PayRecord>> = {};
  agentCaps: Record<string, { perLicenceSat: number; totalSat: number; spentSat: number }> = {};
  relays: Relay[] = [{ url: 'wss://relay-one.lab.test', online: true, events: [] }, { url: 'wss://relay-two.lab.test', online: true, events: [] }, { url: 'wss://relay-three.lab.test', online: true, events: [] }];
  chain: SimChain;
  otsQueue: { digest: string; nonce: string; label: string }[] = [];
  proofs: Record<string, { ots: string; height: number; label: string }> = {};
  /** Named artefacts: events, bundles, requirements, anything a later step needs. */
  a: Record<string, any> = {};
  logs: LogEntry[] = []; flows: Flow[] = []; history: { step: string; t: number; balances: Record<string, number> }[] = [];
  currentStep?: string;
  track: Uint8Array; trackHash: string;
  constructor(seed = 'rain') {
    this.seed = seed; this.now = Math.floor(Date.now() / 1000);
    this.chain = new SimChain(seed, 250_000, this.now);
    this.track = rainWav(); this.trackHash = sha256hex(this.track);
    this.makeNode('node.wallets', 'host', 'Test wallet service (people without a node)');
  }
  // ---------- parties ----------
  key(id: string, purpose = 'main'): Uint8Array {
    const k = `${id}/${purpose}`; if (!this.sk[k]) { let ctr = 0, b: Uint8Array;
      do b = h2(`licence-lab/v1/${this.seed}/${k}/${ctr++}`); while (!secp256k1.utils.isValidPrivateKey(b)); this.sk[k] = bytesToHex(b); }
    return hexToBytes(this.sk[k]);
  }
  pub(id: string, purpose = 'main') { return getPublicKey(this.key(id, purpose)); }
  setUp(id: string) { if (this.ready.has(id)) return; this.ready.add(id); this.balances[id] = persona(id).startSats; this.key(id);
    this.log({ from: id, text: `${persona(id).name} is set up: Nostr key ${short(this.pub(id))} (real), test wallet with ${persona(id).startSats.toLocaleString()} sats (simulated)`, badge: 'sim' }); }
  setUpAll(ids: string[]) { ids.forEach(i => this.setUp(i)); }
  name(id: string) { return persona(id).name; }
  // ---------- logging ----------
  log(e: Omit<LogEntry, 'id' | 't' | 'ok'> & { ok?: boolean }) { const x = { id: ++this.seq, t: this.now, step: this.currentStep, ok: true, ...e }; this.logs.push(x); return x; }
  flow(from: string, to: string, label: string, kind: Flow['kind'], ok = true, code?: string) { this.flows.push({ id: ++this.seq, step: this.currentStep, from, to, label, kind, ok, code }); }
  snapshot(step: string) { this.history.push({ step, t: this.now, balances: { ...this.balances } }); }
  advance(seconds: number) { this.now += seconds; }
  // ---------- relays ----------
  publish(e: Event, from: string, label: string) {
    const up = this.relays.filter(r => r.online); up.forEach(r => { if (!r.events.some(x => x.id === e.id)) r.events.push(e); });
    this.flow(from, 'relays', label, 'event', up.length > 0);
    return up.length;
  }
  fromRelays(id: string) { for (const r of this.relays) if (r.online) { const e = r.events.find(x => x.id === id); if (e) return e; } return undefined; }
  sign(id: string, kind: number, tags: string[][], content = '', purpose = 'main') { return finalizeEvent({ kind, tags, content, created_at: Math.floor(Date.now() / 1000) }, this.key(id, purpose)); }
  // ---------- Lightning (simulated nodes, real invoices) ----------
  makeNode(id: string, operator: string, label: string, tenants: string[] = [operator]) {
    if (this.nodes[id]) return this.nodes[id]; const priv = this.key(operator, 'node:' + id);
    return (this.nodes[id] = { id, label, priv: bytesToHex(priv), pub: bytesToHex(secp256k1.getPublicKey(priv, true)), operator, tenants, online: true });
  }
  bind(artist: string, nodeId: string, scope: string[] = ['*']) {
    const n = this.nodes[nodeId]; const nodeSig = signLnMessage(bindMessage(this.pub(artist)), hexToBytes(n.priv));
    return makeBinding(this.key(artist), n.pub, nodeSig, scope, this.chain.blocks[0].hash);
  }
  /** The seller side: check the deal, then make an invoice whose description hash commits to the exact request. */
  issueInvoice(o: { nodeId: string; creditTo: string; offer: Event; binding: Event; consents: Event[]; request: Event; amountMsat?: number; timestamp?: number; expiry?: number; dh?: string; label: string; skipDealCheck?: boolean }) {
    const node = this.nodes[o.nodeId]; if (!node.online) throw Object.assign(new Error(`${node.label} is offline: no invoice`), { code: 'NODE_DOWN' });
    if (!o.skipDealCheck) checkDeal(o.offer, o.binding, o.consents, o.request);
    const url = tagv(o.offer, 'pay-link')!; const pre = randomBytes(32);
    const dh = o.dh ?? requestHash(httpBinding('POST', url, requestBytes(o.request), { 'content-type': 'application/json' }));
    const amountMsat = o.amountMsat ?? Number(tagv(o.request, 'amount')); const expiry = o.expiry ?? 600;
    const bolt11 = encodeInvoice({ currency: 'tbs', amountMsat: BigInt(amountMsat), timestamp: o.timestamp ?? this.now, expiry, paymentHash: sha256hex(pre), descriptionHash: dh, paymentSecret: bytesToHex(h2('ps' + bytesToHex(pre))) }, hexToBytes(node.priv));
    const rec: InvoiceRec = { bolt11, paymentHash: sha256hex(pre), preimage: bytesToHex(pre), node: o.nodeId, creditTo: o.creditTo, amountMsat, paid: false, label: o.label }; this.invoices[rec.paymentHash] = rec;
    const reqs: Requirements = { scheme: 'exact', network: NET.id, amount: String(amountMsat), asset: 'BTC', payTo: node.pub, maxTimeoutSeconds: expiry,
      extra: { assetTransferMethod: 'bolt11', paymentFlow: 'upfront', requestHash: dh, requestBindingProfile: 'http:1', requestBindingParams: { headers: ['content-type'] }, invoice: bolt11 } };
    return { rec, reqs, url };
  }
  /** Plain invoice (zaps, payouts, refunds, OP_RETURN service fees). */
  plainInvoice(nodeId: string, creditTo: string, amountSat: number, label: string, descriptionHash?: string) {
    const node = this.nodes[nodeId]; const pre = randomBytes(32);
    const bolt11 = encodeInvoice({ currency: 'tbs', amountMsat: BigInt(amountSat * 1000), timestamp: this.now, expiry: 600, paymentHash: sha256hex(pre), descriptionHash: descriptionHash ?? sha256hex(label), paymentSecret: bytesToHex(h2('ps' + bytesToHex(pre))) }, hexToBytes(node.priv));
    return (this.invoices[sha256hex(pre)] = { bolt11, paymentHash: sha256hex(pre), preimage: bytesToHex(pre), node: nodeId, creditTo, amountMsat: amountSat * 1000, paid: false, label });
  }
  setNwc(id: string, n: Partial<Nwc>) { this.nwc[id] = { maxPerPaymentSat: 1_000, dailyCapSat: 10_000, monthlyCapSat: 100_000, expiresAt: this.now + 30 * 86400, methods: ['pay_invoice'], spentTodaySat: 0, spentMonthSat: 0, ...n }; return this.nwc[id]; }
  /** Simulated wallet payment. Real invoice decoding, real preimage check; balances and the wallet service are simulated. */
  pay(payer: string, bolt11: string, o: { method?: string; loseResponse?: boolean } = {}): { ok: boolean; preimage?: string; error?: string; code?: string; inv?: Invoice } {
    let inv: Invoice; try { inv = decodeInvoice(bolt11); } catch (e: any) { return { ok: false, error: e.message, code: 'BAD_INVOICE' }; }
    const rec = this.invoices[inv.paymentHash]; const amt = Number(inv.amountMsat ?? 0n) / 1000;
    const wallet = this.nwc[payer]; const funder = persona(payer).agentOf && wallet ? persona(payer).agentOf! : payer;
    if (wallet) { if (wallet.revoked) return { ok: false, error: 'NWC connection was revoked', code: 'UNAUTHORIZED' };
      if (!wallet.methods.includes(o.method ?? 'pay_invoice')) return { ok: false, error: `method ${o.method} not allowed`, code: 'RESTRICTED' };
      if (this.now > wallet.expiresAt) return { ok: false, error: 'NWC connection expired', code: 'EXPIRED' };
      if (amt > wallet.maxPerPaymentSat) return { ok: false, error: `${amt} sats is above the ${wallet.maxPerPaymentSat}-sat limit per payment`, code: 'QUOTA_EXCEEDED' };
      if (wallet.spentTodaySat + amt > wallet.dailyCapSat) return { ok: false, error: `daily cap of ${wallet.dailyCapSat} sats reached`, code: 'QUOTA_EXCEEDED' };
      if (wallet.spentMonthSat + amt > wallet.monthlyCapSat) return { ok: false, error: `monthly cap of ${wallet.monthlyCapSat} sats reached`, code: 'QUOTA_EXCEEDED' }; }
    if (!rec || !this.nodes[rec.node]?.online) return { ok: false, error: 'no route to the node that signed this invoice', code: 'NO_ROUTE' };
    if (rec.paid) return { ok: false, error: 'invoice has already been paid', code: 'ALREADY_PAID' };
    if ((this.balances[funder] ?? 0) < amt) return { ok: false, error: 'insufficient balance', code: 'INSUFFICIENT_BALANCE' };
    this.balances[funder] -= amt; this.balances[rec.creditTo] = (this.balances[rec.creditTo] ?? 0) + amt; rec.paid = true; rec.paidBy = payer;
    if (wallet) { wallet.spentTodaySat += amt; wallet.spentMonthSat += amt; }
    if (sha256hex(hexToBytes(rec.preimage)) !== inv.paymentHash) return { ok: false, error: 'preimage mismatch', code: 'BAD_PREIMAGE' };
    this.flow(payer, rec.creditTo === payer ? rec.node : rec.creditTo, `⚡ ${amt.toLocaleString()} sats`, 'payment');
    if (o.loseResponse) return { ok: false, error: 'timed out waiting for the wallet reply', code: 'TIMEOUT', inv };
    return { ok: true, preimage: rec.preimage, inv };
  }
  lookup(paymentHash: string) { const r = this.invoices[paymentHash]; return r ? { state: r.paid ? 'settled' : 'pending', preimage: r.paid ? r.preimage : undefined } : { state: 'not_found' }; }
  // ---------- buyer agent rules (the library's BuyerAgent logic, with an in-memory payment record) ----------
  agentPay(agent: string, reqs: Requirements, request: Event, offer: Event, binding: Event, o: { loseResponse?: boolean } = {}) {
    const trace: string[] = []; const ledger = (this.ledgers[agent] ??= {}); const caps = this.agentCaps[agent];
    const url = tagv(offer, 'pay-link')!; const expected = requestHash(httpBinding('POST', url, requestBytes(request), { 'content-type': 'application/json' }));
    let inv: Invoice; try { inv = clientCheck(reqs, expected, tagv(binding, 'node')!, this.now, 60, tagv(request, 'amount')); trace.push('✓ invoice amount equals my own signed request', '✓ description hash commits to my request', '✓ invoice signed by the node Ava bound'); }
    catch (e: any) { trace.push(`✗ refused before paying: ${e.message}`); return { ok: false, trace, error: e.message, code: 'AGENT_RULE' as const }; }
    const amt = Number(inv.amountMsat) / 1000; const prior = ledger[inv.paymentHash];
    if (prior?.status === 'paid') { trace.push('✓ already paid this exact invoice (payment record): reuse preimage, pay nothing'); return { ok: true, trace, preimage: prior.preimage!, reused: true, inv }; }
    if (prior?.status === 'in_flight') { const l = this.lookup(inv.paymentHash); trace.push(`… payment record says "in flight": look it up instead of paying again → ${l.state}`);
      if (l.preimage) { prior.status = 'paid'; prior.preimage = l.preimage; return { ok: true, trace, preimage: l.preimage, reused: true, inv }; } return { ok: false, trace, error: 'payment not confirmed; will not pay again', code: 'UNRESOLVED' as const }; }
    if (caps) { if (amt > caps.perLicenceSat) { trace.push(`✗ ${amt} sats is above my own per-licence cap (${caps.perLicenceSat})`); return { ok: false, trace, error: 'agent cap', code: 'AGENT_CAP' as const }; }
      if (caps.spentSat + amt > caps.totalSat) { trace.push(`✗ my total cap would be passed`); return { ok: false, trace, error: 'agent cap', code: 'AGENT_CAP' as const }; } caps.spentSat += amt; }
    ledger[inv.paymentHash] = { status: 'in_flight', amountSat: amt, invoice: reqs.extra.invoice, requestId: request.id }; trace.push(`✓ wrote payment record "about to pay ${short(inv.paymentHash)}"`);
    const r = this.pay(agent, reqs.extra.invoice, { loseResponse: o.loseResponse });
    if (r.code === 'TIMEOUT') { trace.push('… wallet timed out; the record stays "in flight"'); return { ok: false, trace, error: r.error, code: 'TIMEOUT' as const, inv }; }
    if (!r.ok) { delete ledger[inv.paymentHash]; if (caps) caps.spentSat -= amt; trace.push(`✗ wallet refused: ${r.error}`); return { ok: false, trace, error: r.error, code: r.code as string, inv }; }
    ledger[inv.paymentHash] = { ...ledger[inv.paymentHash], status: 'paid', preimage: r.preimage }; trace.push(`✓ paid ${amt} sats through NWC; preimage ${short(r.preimage)}`);
    return { ok: true, trace, preimage: r.preimage!, inv };
  }
  // ---------- Bitcoin anchoring ----------
  /** Queue a digest for the next OpenTimestamps batch (simulated calendar). */
  stamp(digest: string, label: string) { this.otsQueue.push({ digest, nonce: bytesToHex(randomBytes(16)), label }); }
  /** Mine one simulated block whose merkle root commits to every queued digest, and build a REAL .ots proof for each. */
  anchorBatch(note = 'OpenTimestamps batch') {
    const q = this.otsQueue.splice(0); if (!q.length) return null;
    const leaves = q.map(x => sha256(concatBytes(hexToBytes(x.digest), hexToBytes(x.nonce))));
    const paths: Op[][] = q.map(x => [{ tag: 0xf0, arg: hexToBytes(x.nonce) }, { tag: 0x08 }]);
    let level = leaves.map((l, i) => ({ h: l, members: [i] }));
    while (level.length > 1) { const next: typeof level = [];
      for (let i = 0; i < level.length; i += 2) { const L = level[i], R = level[i + 1] ?? level[i];
        for (const m of L.members) paths[m].push({ tag: 0xf0, arg: R.h }, { tag: 0x08 });
        if (level[i + 1]) for (const m of R.members) paths[m].push({ tag: 0xf1, arg: L.h }, { tag: 0x08 });
        next.push({ h: sha256(concatBytes(L.h, R.h)), members: [...L.members, ...(level[i + 1] ? R.members : [])] }); }
      level = next; }
    const block = this.chain.mine({ time: this.now, merkleRootInternal: level[0].h, note: `${note} (${q.length} digest${q.length > 1 ? 's' : ''})` });
    q.forEach((x, i) => { this.proofs[x.digest] = { ots: bytesToHex(writeOts(hexToBytes(x.digest), [{ ops: paths[i], att: { kind: 'bitcoin', height: block.height } }])), height: block.height, label: x.label }; });
    this.flow('ots', 'bitcoin', `⛓ block ${block.height}: ${q.length} proof${q.length > 1 ? 's' : ''}`, 'anchor');
    return block;
  }
  async checkStamp(digest: string) { const p = this.proofs[digest]; if (!p) return { status: 'pending' as const }; return verifyOts(p.ots, digest, this.chain); }
  /** Write an OP_RETURN (OP-RETURN-Bot style) and mine it in the next simulated block. */
  opReturn(payload: string, note: string) { const b = this.chain.mine({ time: this.now, opReturns: [payload], note }); this.flow('echo', 'bitcoin', `⛓ OP_RETURN in block ${b.height}`, 'anchor'); return b; }
  // ---------- convenience ----------
  notBefore() { return this.chain.tip.hash; }
  bundle(name: string, b: Omit<LicenceBundle, 'version'>) { const x: LicenceBundle = { version: 1, ...b }; this.a[name] = x; return x; }
  /** Anchor a bundle: queue its grant digest; after anchorBatch() attach the proof. */
  attachProof(b: LicenceBundle) { const D = grantDigest(b); const p = this.proofs[D]; if (p) b.anchor = { type: 'ots', ots: p.ots, height: p.height }; return !!p; }
  async verify(b: LicenceBundle, o: { chain?: ChainOracle | false; link?: Event } = {}): Promise<Verdict> {
    const t0 = performance.now(); const chain = o.chain === false ? undefined : (o.chain ?? this.chain);
    const result = await verifyLicence(structuredClone(b), chain, { link: o.link }); const checks = mapChecks(result, !!chain);
    return { result, checks, ms: performance.now() - t0, passed: checks.filter(c => c.status === 'pass').length };
  }
  // ---------- protocol building blocks, re-exported so scenario code reads plainly ----------
  lib = { makeOffer, makeConsent, makeRequest, makePrivateRequest, makeRevocation, makeStatement, checkDeal, revocationPayloadCompact, clientCheck, requestHash, httpBinding, requestBytes, grantDigest, MLA1 };
  offerInput(artist: string, kind: keyof typeof USES, o: Partial<OfferInput> & { coOwners?: OfferInput['coOwners'] }): OfferInput {
    return { track: 'rain', title: 'Rain', masterSha256: this.trackHash, use: USES[kind].slice(1), termsText: TERMS[kind], priceSats: 2_000, payLink: `https://${artist}.lab.test/licence/rain/${kind}`,
      bindingId: '', validUntil: this.chain.tip.height + 52_560, coOwners: [], ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) };
  }
  coOwners() { return [{ pubkey: this.pub('jay'), role: 'producer', bps: 2000 }, { pubkey: this.pub('nova'), role: 'featured-artist', bps: 1500 }, { pubkey: this.pub('lena'), role: 'songwriter-share', bps: 1500 }]; }
}
export { CAST };
