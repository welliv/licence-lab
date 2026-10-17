// Live test wallets tier: real NWC wallets on the public NWC faucet (dummy sats that exist only inside the faucet),
// real BOLT11 invoices that commit description_hash to the buyer's request, real pay_invoice and preimage, real verifyLicence.
import { getPublicKey, generateSecretKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { makeOffer, makeConsent, makeBinding, makePrivateRequest } from '../lib/mll/events';
import { verifyLicence, checkDeal, requestBytes, type LicenceBundle } from '../lib/mll/verify';
import { clientCheck, httpBinding, requestHash, NETWORKS, type Requirements } from '../lib/mll/x402';
import { decodeInvoice } from '../lib/mll/bolt11';
import { tagv, type Event } from '../engine/lab';
import { Nwc, faucetWallet, faucetTopUp } from './nwc';
import { trackFile } from '../engine/track';
import { mapChecks, TERMS, USES, type Verdict } from '../engine/lab';
export const LIVE_PARTIES = ['ava', 'mia', 'jay', 'nova', 'lena', 'scout'] as const;
export type LiveParty = (typeof LIVE_PARTIES)[number];
export const SHARES: Record<string, number> = { jay: 2000, nova: 1500, lena: 1500 };
export const MAX_LIVE_PAY_SAT = 5000; // Lab safety cap on any one live payment
export interface LiveLog { t: number; from: string; to?: string; text: string; badge: 'real' | 'sim' | 'limit' | 'open' | 'fail'; ok: boolean; data?: unknown }
export interface Budget { maxPerPaymentSat: number; dailyCapSat: number; spentSat: number }
type Store = { get(k: string): string | null; set(k: string, v: string): void; del(k: string): void };
export const memoryStore = (): Store => { const m = new Map<string, string>(); return { get: k => m.get(k) ?? null, set: (k, v) => void m.set(k, v), del: k => void m.delete(k) }; };
export class LiveWorld {
  wallets: Partial<Record<LiveParty, Nwc>> = {}; balances: Partial<Record<LiveParty, number>> = {}; lud16: Partial<Record<LiveParty, string>> = {};
  keys: Record<string, Uint8Array> = {}; logs: LiveLog[] = []; history: { label: string; balances: Record<string, number> }[] = [];
  faucetNode = ''; tipHash = ''; network = NETWORKS.mainnet.id; // faucet invoices are mainnet-format (lnbc); the sats are faucet-only
  offer?: Event; binding?: Event; consents: Event[] = []; request?: Event; link?: Event; reqs?: Requirements; invoice?: string; preimage?: string; buyer?: LiveParty;
  ledger: Record<string, { status: 'in_flight' | 'paid' | 'failed'; preimage?: string }> = {};
  budget: Budget = { maxPerPaymentSat: 300, dailyCapSat: 500, spentSat: 0 }; priceSat = 100; onChange: () => void = () => {};
  constructor(public store: Store = memoryStore()) {
    for (const p of LIVE_PARTIES) { let k = store.get(`ll.live.key.${p}`); if (!k) { k = bytesToHex(generateSecretKey()); store.set(`ll.live.key.${p}`, k); } this.keys[p] = hexToBytes(k); }
  }
  pub(p: string) { return getPublicKey(this.keys[p]); }
  log(e: Omit<LiveLog, 't' | 'ok'> & { ok?: boolean }) { this.logs.push({ t: Date.now(), ok: true, ...e }); this.onChange(); }
  snapshot(label: string) { this.history.push({ label, balances: { ...this.balances } as Record<string, number> }); }
  savedUri(p: LiveParty) { return this.store.get(`ll.live.nwc.${p}`); }
  /** Create (or reconnect) a faucet test wallet for a party. */
  async connect(p: LiveParty, startSat = p === 'mia' || p === 'scout' ? 2000 : 200) {
    let uri = this.savedUri(p); let created = false;
    if (!uri) { uri = await faucetWallet(startSat); this.store.set(`ll.live.nwc.${p}`, uri); created = true; }
    const w = new Nwc(uri); const info = await w.getInfo(); this.wallets[p] = w; this.lud16[p] = w.p.lud16 ?? (info as any).lud16;
    if (!this.faucetNode) this.faucetNode = info.pubkey ?? ''; if ((info as any).block_hash) this.tipHash = (info as any).block_hash;
    if (info.pubkey !== this.faucetNode) this.log({ from: p, text: `Warning: ${p}'s wallet is on a different node (${info.pubkey?.slice(0, 10)}…)`, badge: 'open', ok: false });
    await this.refresh(p);
    this.log({ from: p, text: `${created ? 'Created' : 'Reconnected'} a faucet test wallet: ${this.lud16[p]}, ${this.balances[p]} sats. Node ${info.pubkey?.slice(0, 12)}… (network "${info.network}", shared by every faucet wallet)`, badge: 'real', data: { lud16: this.lud16[p], node: info.pubkey, network: info.network, methods: info.methods } });
    return info;
  }
  forget(p: LiveParty) { this.wallets[p]?.close(); delete this.wallets[p]; delete this.balances[p]; this.store.del(`ll.live.nwc.${p}`); this.onChange(); }
  async refresh(p: LiveParty) { const w = this.wallets[p]; if (w) this.balances[p] = await w.balanceSat(); this.onChange(); }
  async refreshAll() { await Promise.all(LIVE_PARTIES.filter(p => this.wallets[p]).map(p => this.refresh(p))); this.snapshot('balances'); }
  async topUp(p: LiveParty, sat: number) { if (!this.lud16[p]) throw new Error('Create the wallet first.'); await faucetTopUp(this.lud16[p]!, sat); await this.refresh(p); this.log({ from: 'faucet', to: p, text: `Faucet topped up ${p} by ${sat} sats (faucet-only sats)`, badge: 'real' }); }
  need(p: LiveParty, why: string) { if (!this.wallets[p]) throw new Error(`${cap(p)} has no test wallet yet. ${why}`); return this.wallets[p]!; }
  // ---------- 1. Ava publishes (binding + offer + co-owner consents) ----------
  publish(priceSat = this.priceSat) {
    this.need('ava', 'The binding names the node behind her wallet.'); this.priceSat = priceSat;
    // The faucet refuses sign_message (RESTRICTED), so the node cannot sign Ava's key. The binding is real but has no node signature.
    this.binding = makeBinding(this.keys.ava, this.faucetNode, '', ['*']);
    this.offer = makeOffer(this.keys.ava, { track: 'rain', title: 'Rain', masterSha256: trackFile('rain')?.sha256 ?? bytesToHex(sha256(new TextEncoder().encode('Rain (Licence Lab demo master)'))), use: USES.creator.slice(1), termsText: TERMS.creator, priceSats: priceSat,
      payLink: 'https://ava.lab.test/licence/rain/creator', bindingId: this.binding.id, validUntil: 999_999_999, coOwners: Object.entries(SHARES).map(([p, bps]) => ({ pubkey: this.pub(p), role: p, bps })) });
    this.consents = Object.entries(SHARES).map(([p, bps]) => makeConsent(this.keys[p], this.offer!, bps, this.lud16[p as LiveParty] ?? `${p}@lab.test`));
    this.request = this.link = this.reqs = this.invoice = this.preimage = undefined;
    this.log({ from: 'ava', text: `Signed a binding to the faucet node, an offer for "Rain" at ${priceSat} sats, and 3 co-owner consents. The node could not co-sign the binding: the faucet refuses sign_message.`, badge: 'open', data: { binding: this.binding, offer: this.offer, consents: this.consents } });
  }
  // ---------- 2. Buyer signs a request with a fresh per-licence key ----------
  requestLicence(buyer: LiveParty = 'mia', seconds = 60) {
    if (!this.offer || !this.binding) throw new Error('Ava has not published an offer yet.');
    const { request, link } = makePrivateRequest(this.keys[buyer], { offer: this.offer, binding: this.binding, network: this.network, notBefore: this.tipHash || '00'.repeat(32), use: [...USES.creator.slice(1).filter(u => !u.startsWith('max-seconds')), `seconds=${seconds}`] });
    this.request = request; this.link = link; this.buyer = buyer; this.reqs = this.invoice = this.preimage = undefined;
    this.log({ from: buyer, to: 'ava', text: `Signed a licence request with a fresh key ${request.pubkey.slice(0, 10)}… (network: mainnet-format, as the faucet needs)`, badge: 'real', data: request });
  }
  // ---------- 3. Ava's wallet makes the invoice that commits to the request ----------
  async issueInvoice() {
    if (!this.request || !this.offer || !this.binding) throw new Error('There is no licence request to invoice yet.');
    const w = this.need('ava', 'Her wallet makes the invoice.');
    let dealNote = 'checkDeal passed';
    try { checkDeal(this.offer, this.binding, this.consents, this.request); } catch (e: any) { dealNote = `checkDeal refused (${e.code ?? e.message}); the Lab continues under the faucet exception`; }
    const url = tagv(this.offer, 'pay-link')!; const dh = requestHash(httpBinding('POST', url, requestBytes(this.request), { 'content-type': 'application/json' }));
    const amountSat = Number(tagv(this.request, 'amount')) / 1000;
    const r = await w.makeInvoice(amountSat, { descriptionHash: dh }); const inv = decodeInvoice(r.invoice);
    if (inv.descriptionHash !== dh) throw new Error('The faucet invoice does not commit to the request (description hash mismatch).');
    this.invoice = r.invoice; this.preimage = undefined;
    this.reqs = { scheme: 'exact', network: this.network, amount: String(amountSat * 1000), asset: 'BTC', payTo: inv.payee, maxTimeoutSeconds: 600, extra: { assetTransferMethod: 'bolt11', paymentFlow: 'upfront', requestHash: dh, requestBindingProfile: 'http:1', requestBindingParams: { headers: ['content-type'] }, invoice: r.invoice } };
    this.log({ from: 'ava', to: this.buyer, text: `402 Payment Required: real invoice ${r.invoice.slice(0, 18)}… for ${amountSat} sats. description_hash = hash of the exact request (${dh.slice(0, 10)}…). ${dealNote}.`, badge: 'real', data: { invoice: r.invoice, descriptionHash: dh, payee: inv.payee } });
    return r.invoice;
  }
  // ---------- 4. Buyer checks and pays for real ----------
  async pay(payer: LiveParty = this.buyer ?? 'mia') {
    if (!this.reqs || !this.request || !this.binding) throw new Error('There is no invoice to pay yet.');
    const w = this.need(payer, 'They pay from it.'); const amountSat = Number(this.reqs.amount) / 1000;
    const inv = clientCheck(this.reqs, this.reqs.extra.requestHash, tagv(this.binding, 'node')!, Math.floor(Date.now() / 1000), 60, tagv(this.request, 'amount'));
    if (inv.payee !== this.faucetNode) throw new Error('Refused: this invoice is not from the faucet node. The Lab only pays faucet invoices.');
    if (amountSat > MAX_LIVE_PAY_SAT) throw new Error(`Refused: ${amountSat} sats is over the Lab's live cap of ${MAX_LIVE_PAY_SAT}.`);
    const prev = this.ledger[inv.paymentHash]; if (prev?.status === 'paid') { this.preimage = prev.preimage; throw new Error('Already paid: the payment record has the preimage, so it will not pay twice.'); }
    if (payer === 'scout') { const b = this.budget; if (amountSat > b.maxPerPaymentSat) throw new Error(`Refused by the Lab-enforced budget: ${amountSat} > ${b.maxPerPaymentSat} sats per payment.`); if (b.spentSat + amountSat > b.dailyCapSat) throw new Error(`Refused by the Lab-enforced budget: daily cap ${b.dailyCapSat} sats would be passed.`); }
    this.ledger[inv.paymentHash] = { status: 'in_flight' }; const t0 = Date.now();
    try { const r = await w.payInvoice(this.reqs.extra.invoice);
      if (bytesToHex(sha256(hexToBytes(r.preimage))) !== inv.paymentHash) throw new Error('The wallet returned a preimage that does not match the payment hash.');
      this.preimage = r.preimage; this.ledger[inv.paymentHash] = { status: 'paid', preimage: r.preimage }; if (payer === 'scout') this.budget.spentSat += amountSat;
      await Promise.all([this.refresh(payer), this.refresh('ava')]); this.snapshot('pay');
      this.log({ from: payer, to: 'ava', text: `Paid ${amountSat} sats for real over NWC in ${Date.now() - t0} ms. Preimage ${r.preimage.slice(0, 12)}… hashes to the payment hash.`, badge: 'real', data: { preimage: r.preimage, paymentHash: inv.paymentHash, feesPaidMsat: r.fees_paid } });
      return r.preimage;
    } catch (e: any) {
      if (e.code === 'TIMEOUT') { const l = await this.wallets.ava?.lookupInvoice(inv.paymentHash).catch(() => null); if (l?.preimage) { this.preimage = l.preimage; this.ledger[inv.paymentHash] = { status: 'paid', preimage: l.preimage }; return l.preimage; } }
      this.ledger[inv.paymentHash] = { status: 'failed' }; throw e; }
  }
  bundle(): LicenceBundle { if (!this.offer || !this.binding || !this.request || !this.invoice || !this.preimage) throw new Error('The licence is not complete: it needs an offer, request, invoice and the preimage from paying.');
    return { version: 1, offer: this.offer, binding: this.binding, consents: this.consents, request: this.request, invoice: this.invoice, preimage: this.preimage }; }
  // ---------- 5. Verify with the real library ----------
  async verify(): Promise<{ strict: Verdict; facts: { label: string; ok: boolean; how: string }[] }> {
    const b = this.bundle(); const t0 = performance.now(); const result = await verifyLicence(structuredClone(b), undefined, { link: this.link }); const checks = mapChecks(result, false);
    const strict: Verdict = { result, checks, ms: performance.now() - t0, passed: checks.filter(c => c.status === 'pass').length };
    const inv = decodeInvoice(b.invoice); const dh = requestHash(httpBinding('POST', tagv(b.offer, 'pay-link')!, requestBytes(b.request), { 'content-type': 'application/json' }));
    let cc = true; try { clientCheck(this.reqs!, dh, tagv(b.binding, 'node')!, Math.floor(Date.now() / 1000), 3600, tagv(b.request, 'amount')); } catch { cc = false; }
    const facts = [
      { label: 'Invoice comes from the node named in the binding', ok: inv.payee === tagv(b.binding, 'node'), how: 'decodeInvoice: payee recovered from the invoice signature' },
      { label: 'Invoice description_hash = hash of the exact request', ok: inv.descriptionHash === dh, how: 'requestHash(httpBinding(...requestBytes(request)))' },
      { label: 'Amount = the amount the buyer signed', ok: String(inv.amountMsat) === tagv(b.request, 'amount'), how: 'request "amount" tag vs invoice amount' },
      { label: 'Preimage matches the payment hash (it was paid)', ok: bytesToHex(sha256(hexToBytes(b.preimage))) === inv.paymentHash, how: 'sha256(preimage)' },
      { label: 'Buyer-side pre-pay check (clientCheck) passes', ok: cc, how: 'the library\'s clientCheck, as used before paying' },
      { label: 'Node co-signed the binding (check 2)', ok: false, how: 'impossible on the faucet: sign_message is RESTRICTED for faucet wallets; and the node is shared by every faucet wallet' },
    ];
    this.log({ from: 'mia', text: `verifyLicence on the real preimage: ${result.ok ? 'valid' : `rejected at ${result.code} (${result.reason})`}. ${facts.filter(f => f.ok).length}/${facts.length} payment facts proven separately.`, badge: result.ok ? 'real' : 'open', ok: true, data: { result, facts } });
    return { strict, facts };
  }
  // ---------- 6. Ava pays the co-owners for real ----------
  async payout() {
    if (!this.preimage || !this.offer) throw new Error('Nothing has been sold yet, so there is nothing to split.');
    const ava = this.need('ava', 'She pays the shares.'); const lines: string[] = [];
    for (const [p, bps] of Object.entries(SHARES) as [LiveParty, number][]) { const share = Math.floor(this.priceSat * bps / 10000); const w = this.wallets[p];
      if (!w) { lines.push(`${cap(p)}: no wallet, share held`); continue; }
      const inv = await w.makeInvoice(share, { description: `Rain payout ${p} ${bps / 100}%` }); const d = decodeInvoice(inv.invoice);
      if (d.payee !== this.faucetNode) throw new Error('Refused: payout invoice is not from the faucet node.');
      await ava.payInvoice(inv.invoice); await this.refresh(p); lines.push(`${cap(p)} ${share} sats`); }
    await this.refresh('ava'); this.snapshot('payout');
    this.log({ from: 'ava', text: `Paid the co-owners for real: ${lines.join(', ')}.`, badge: 'real' }); return lines;
  }
  close() { Object.values(this.wallets).forEach(w => w?.close()); }
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
