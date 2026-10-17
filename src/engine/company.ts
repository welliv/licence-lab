// Stop 2: a company's agent buys inside a budget a person set. ClipAI's agent licenses songs for its users' videos (Creator licences,
// one per video, at each song's price) and subscribes to the Harbour Music catalogue ($99 a month, DRAFT: a one-month catalogue
// licence that the agent renews each month inside its budget). Signatures, invoices, budget checks and verifyLicence are real; money is simulated.
import type { Lab, LicenceBundle } from './lab';
import { sha256hex } from './lab';
import { onboardAlice, signOffer, consent, payout } from './actions-story';
import { tagNet } from './actions';
import { CATALOGUE, ensureOffer, toSats, type CatalogueTrack } from './catalogue';
export const AGENT = 'clipagent';
export const VIDEOS = 500; // user videos that each need a licence this month
export const BUDGET_DEFAULT_CENTS = 300_000, BUDGET_MIN_CENTS = 50_000, BUDGET_MAX_CENTS = 500_000, BUDGET_STEP_CENTS = 10_000; // $3,000 a month; slider $500–$5,000
export const PLAN = { title: 'Harbour Music catalogue', priceCents: 9_900, period: '1 month', seller: 'harbour',
  shares: [{ who: 'harbour', role: 'publisher', bps: 3000 }, { who: 'dave', role: 'artist', bps: 2500 }, { who: 'erin', role: 'artist', bps: 2500 }, { who: 'frank', role: 'artist', bps: 2000 }] };
export const MAX_PER_PAYMENT_CENTS = 10_000; // ClipAI's rule: at most $100 for any one payment
const DAY = 86_400;
/** Set (or change) ClipAI's monthly budget. The agent's wallet connection enforces it on every payment. */
export function setBudget(lab: Lab, monthlyCents: number) {
  lab.setUpAll(['clipai', AGENT]); const cap = toSats(monthlyCents); const w = lab.nwc[AGENT];
  if (!w) lab.setNwc(AGENT, { maxPerPaymentSat: toSats(MAX_PER_PAYMENT_CENTS), dailyCapSat: cap, monthlyCapSat: cap });
  else { w.dailyCapSat = cap; w.monthlyCapSat = cap; }
  return lab.nwc[AGENT];
}
export const budgetLeftCents = (lab: Lab) => { const w = lab.nwc[AGENT]; return w ? (w.monthlyCapSat - w.spentMonthSat) * 5 : 0; };
/** Move each co-owner's share from the seller to them (the same split the payout statements record). */
function split(lab: Lab, offerName: string, seller: string, amt: number, credits: Record<string, number>) {
  const offer = lab.a[offerName]; let left = amt;
  for (const p of offer.tags.filter((t: string[]) => t[0] === 'p')) { const who = [...lab.ready].find(id => lab.pub(id) === p[1])!; const s = Math.floor(amt * Number(p[3]) / 10_000);
    lab.balances[seller] -= s; lab.balances[who] = (lab.balances[who] ?? 0) + s; credits[who] = (credits[who] ?? 0) + s; left -= s; }
  credits[seller] = (credits[seller] ?? 0) + left;
}
/** ClipAI's agent licenses one song per user video, in order, until the videos are done or the monthly budget says stop. */
export async function videoLicences(lab: Lab, shas: Record<string, string>, monthlyCents: number, n = VIDEOS, onProgress?: (k: number) => void) {
  setBudget(lab, monthlyCents); const tracks = CATALOGUE.filter(t => shas[t.cast]); const names = tracks.map(t => ensureOffer(lab, t, shas[t.cast], 'creator', t.priceCents));
  const credits: Record<string, number> = {}; const bundles: LicenceBundle[] = []; let refused = 0, stoppedAt = -1, reason = ''; const t0 = performance.now(); const spent0 = lab.nwc[AGENT].spentMonthSat; const first = new Set<string>();
  for (let k = 0; k < n; k++) {
    const i = k % tracks.length; const t = tracks[i]; const name = names[i]; const offer = lab.a[name]; const binding = lab.a[`binding.${t.seller}`]; const consents = lab.a[`${name}.consents`] ?? [];
    const use = [...offer.tags.find((x: string[]) => x[0] === 'use')!.slice(1, 5), 'seconds=60'];
    const request = lab.lib.makeRequest(lab.key(AGENT), { offer, binding, use, network: tagNet(), notBefore: lab.notBefore() });
    const { reqs, rec } = lab.issueInvoice({ nodeId: lab.a[`node.${t.seller}`], creditTo: t.seller, offer, binding, consents, request, label: `video ${k + 1}`, skipDealCheck: first.has(name) }); first.add(name);
    const p = lab.agentPay(AGENT, reqs, request, offer, binding);
    if (!p.ok) { refused = n - k; stoppedAt = k; reason = p.error ?? ''; break; }
    split(lab, name, t.seller, Number(reqs.amount) / 1000, credits); bundles.push({ version: 1, offer, binding, consents, request, invoice: rec.bolt11, preimage: p.preimage! });
    if (k % 25 === 24) { onProgress?.(k + 1); await new Promise(r => setTimeout(r, 0)); } }
  lab.flows.splice(Math.max(0, lab.flows.length - 2 * Math.max(0, bundles.length - 1))); onProgress?.(bundles.length);
  bundles.forEach((b, k) => lab.stamp(lab.lib.grantDigest(b), `video licence ${k + 1}`)); lab.advance(1800); if (bundles.length) { lab.anchorBatch(`${bundles.length} video licences`); bundles.forEach(b => lab.attachProof(b)); }
  const sample = bundles.filter((_, k) => k % Math.max(1, Math.floor(bundles.length / 20)) === 0).slice(0, 20); let ok = 0; for (const b of sample) if ((await lab.verify(b)).result.ok) ok++;
  lab.a['clip.bundles'] = bundles;
  return { bought: bundles.length, refused, stoppedAt, reason, spentSats: lab.nwc[AGENT].spentMonthSat - spent0, credits, sample: sample.length, sampleOk: ok, ms: performance.now() - t0, budgetLeftCents: budgetLeftCents(lab) };
}
/** The catalogue fingerprint: a hash of the sorted file hashes of the recordings in Harbour Music's catalogue. */
export const catalogueHash = (shas: string[]) => sha256hex([...shas].sort().join('\n'));
export type PlanShare = { who: string; role: string; bps: number };
function planOffer(lab: Lab, x: string, shares: PlanShare[] = PLAN.shares) {
  if (lab.a['offer.plan']) return 'offer.plan';
  lab.setUpAll(['harbour', ...shares.map(s => s.who).filter(w => w !== 'harbour'), 'distributor']); if (!lab.a['binding.harbour']) onboardAlice(lab, 'harbour', { quiet: true });
  lab.ownerVouch('distributor', 'harbour', 'catalogue record: Harbour Music publishes these recordings', x);
  const co = shares.filter(s => s.who !== 'harbour').map(s => ({ pubkey: lab.pub(s.who), role: s.role, bps: s.bps }));
  signOffer(lab, 'harbour', 'catalogue', { name: 'offer.plan', price: toSats(PLAN.priceCents), coOwners: co, masterSha256: x, title: PLAN.title, track: 'harbour-catalogue',
    termsText: 'Catalogue licence (DRAFT subscription) for the Harbour Music catalogue: use any recording in it in online creator videos, worldwide, for one month from payment, non-exclusive. Renewed by paying again for the next month. I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in my binding, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.' });
  for (const s of shares) if (s.who !== 'harbour') consent(lab, s.who, 'offer.plan');
  lab.stamp(lab.a['offer.plan'].id, 'catalogue plan'); lab.anchorBatch('Catalogue plan'); return 'offer.plan';
}
/** One month of the catalogue: the agent pays inside its budget and gets a one-month licence. Used for the first month and each renewal. */
export async function subscribe(lab: Lab, x: string, monthlyCents: number, shares: PlanShare[] = PLAN.shares) {
  setBudget(lab, monthlyCents); const name = planOffer(lab, x, shares); const offer = lab.a[name]; const binding = lab.a['binding.harbour']; const consents = lab.a['offer.plan.consents'] ?? [];
  const months = (lab.a['plan.months'] as number[] | undefined) ?? []; const use = [...offer.tags.find((t: string[]) => t[0] === 'use')!.slice(1, 5), 'seconds=240'];
  const request = lab.lib.makePrivateRequest(lab.key(AGENT), { offer, binding, use, network: tagNet(), notBefore: lab.notBefore() }).request;
  const { reqs, rec } = lab.issueInvoice({ nodeId: lab.a['node.harbour'], creditTo: 'harbour', offer, binding, consents, request, label: `catalogue month ${months.length + 1}` });
  const before = Object.fromEntries(shares.map(s => [s.who, lab.balances[s.who] ?? 0])); const p = lab.agentPay(AGENT, reqs, request, offer, binding);
  if (!p.ok) return { ok: false as const, month: months.length + 1, reason: p.error ?? 'refused', budgetLeftCents: budgetLeftCents(lab) };
  const b = lab.bundle(`bundle.plan.${months.length + 1}`, { offer, binding, consents, request, invoice: rec.bolt11, preimage: p.preimage! });
  lab.stamp(lab.lib.grantDigest(b), `catalogue month ${months.length + 1}`); lab.advance(1800); lab.anchorBatch(); lab.attachProof(b); const verdict = await lab.verify(b);
  const pay = payout(lab, name, b, 'harbour'); const paidAt = lab.now; const from = Math.max(paidAt, months[months.length - 1] ?? 0); const until = from + 30 * DAY; lab.a['plan.months'] = [...months, until]; // a renewal starts the day the old month ends, so the dates line up
  const split = shares.map(s => ({ id: s.who, who: lab.name(s.who), sats: (lab.balances[s.who] ?? 0) - before[s.who] }));
  return { ok: true as const, month: months.length + 1, verdict, bundle: b, split, statements: pay.statements.length, paidAt, from, until, budgetLeftCents: budgetLeftCents(lab) };
}
/** A month passes: the budget starts again, and the agent renews the catalogue before the old month runs out (DRAFT renewal rule). */
export async function renew(lab: Lab, x: string, monthlyCents: number, shares: PlanShare[] = PLAN.shares) {
  const w = lab.nwc[AGENT]; lab.advance(29 * DAY); if (w) { w.spentMonthSat = 0; w.spentTodaySat = 0; w.expiresAt = lab.now + 30 * DAY; }
  return subscribe(lab, x, monthlyCents, shares);
}
export type { CatalogueTrack };
