// x402 v2 `exact` scheme on `lnbtc`, HTTP profile http:1. Written from the spec.
import { sha256hex, jcs, concatBytes, utf8ToBytes, sha256, bytesToHex } from './util.js';
import { decodeInvoice, type Invoice } from './bolt11.js';
export const NETWORKS: Record<string, { id: string; currency: string[] }> = {
  mainnet: { id: 'lnbtc:000000000019d6689c085ae165831e93', currency: ['bc'] },
  testnet: { id: 'lnbtc:000000000933ea01ad0ee984209779ba', currency: ['tb'] },
  signet: { id: 'lnbtc:00000008819873e925422c1ff0f99f7c', currency: ['tbs'] } /* AUDIT F-13: no testnet 'tb' invoices on signet */,
  regtest: { id: 'lnbtc:0f9188f13cb7b2c71f2a335e3a4fc328', currency: ['bcrt'] },
};
export const networkById = (id: string) => Object.values(NETWORKS).find(n => n.id === id);
export const BOUND_HEADERS = ['content-type'];
export const headerValueHash = (v: string | undefined) => v === undefined ? bytesToHex(sha256(Uint8Array.of(0))) : bytesToHex(sha256(concatBytes(Uint8Array.of(1), utf8ToBytes(v.trim()))));
export function httpBinding(method: string, url: string, body: Uint8Array, headers: Record<string, string | undefined>, bound = BOUND_HEADERS) {
  return { domain: 'x402:exact:lnbtc:bolt11:http:1', method, url, bodyHash: sha256hex(body),
    headers: bound.map(name => ({ name, valueHash: headerValueHash(headers[name]) })) };
}
export const requestHash = (b: ReturnType<typeof httpBinding>) => sha256hex(jcs(b));
export interface Requirements { scheme: 'exact'; network: string; amount: string; asset: 'BTC'; payTo: string; maxTimeoutSeconds: number;
  extra: { assetTransferMethod?: 'bolt11'; paymentFlow: 'upfront'; requestHash: string; requestBindingProfile: 'http:1'; requestBindingParams: { headers: string[] }; invoice: string } }
export const b64json = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64');
export const unb64json = (s: string) => JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
/** Client-side checks before paying (spec "Client Payment Construction"). Throws with a stable reason. */
export function clientCheck(req: Requirements, expectedHash: string, expectedPayTo: string | null, nowSec = Math.floor(Date.now() / 1000), skew = 60, expectedAmountMsat?: string): Invoice {
  const fail = (r: string) => { throw new Error(r); };
  if (req.scheme !== 'exact') fail('unsupported_scheme');
  const net = networkById(req.network); if (!net) fail('unsupported_network');
  if (req.asset !== 'BTC') fail('invalid_exact_lnbtc_asset');
  if (!/^[1-9]\d*$/.test(req.amount)) fail('invalid_exact_lnbtc_amount');
  if (!/^0[23][0-9a-f]{64}$/.test(req.payTo)) fail('invalid_exact_lnbtc_pay_to_malformed');
  if (req.extra?.paymentFlow !== 'upfront') fail('invalid_exact_lnbtc_payment_flow');
  if ((req.extra.assetTransferMethod ?? 'bolt11') !== 'bolt11') fail('invalid_exact_lnbtc_asset_transfer_method');
  if (req.extra.requestBindingProfile !== 'http:1') fail('invalid_exact_lnbtc_request_binding');
  let inv: Invoice; try { inv = decodeInvoice(req.extra.invoice); } catch { return fail('invalid_exact_lnbtc_invoice_decode_failed') as never; }
  if (!inv.descriptionHash || inv.description !== undefined) fail('invalid_exact_lnbtc_invoice_description');
  if (inv.descriptionHash !== expectedHash || req.extra.requestHash !== expectedHash) fail('invalid_exact_lnbtc_invoice_request_mismatch');
  if (inv.payee !== req.payTo) fail('invalid_exact_lnbtc_invoice_payee_mismatch');
  if (expectedPayTo && req.payTo !== expectedPayTo) fail('invalid_exact_lnbtc_invoice_payee_mismatch');
  if (!net!.currency.includes(inv.currency)) fail('invalid_exact_lnbtc_invoice_currency_mismatch');
  if (inv.amountMsat === null || inv.amountMsat.toString() !== req.amount) fail('invalid_exact_lnbtc_invoice_amount_mismatch');
  // AUDIT F-01: the amount must be the one the buyer signed in its request, not whatever the 402 says
  if (expectedAmountMsat !== undefined && (req.amount !== expectedAmountMsat || inv.amountMsat?.toString() !== expectedAmountMsat)) fail('invalid_exact_lnbtc_amount_not_offer_price');
  if (inv.expiry !== req.maxTimeoutSeconds) fail('invalid_exact_lnbtc_invoice_expiry_mismatch');
  if (inv.timestamp > nowSec + skew) fail('invalid_exact_lnbtc_invoice_created_in_future');
  if (nowSec > inv.timestamp + inv.expiry) fail('invalid_exact_lnbtc_invoice_expired');
  return inv;
}
