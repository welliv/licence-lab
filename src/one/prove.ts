// The bridge to the real engine. Loaded on demand (dynamic import), so the first screen stays light.
// Every step that "proves" something runs the real protocol library here: signatures, fingerprints, checks.
import '../engine/polyfill';
import { Lab, type Verdict, type LicenceBundle } from '../engine/lab';
import { registerTrackFile, trackFile } from '../engine/track';
import { CATALOGUE, catalogueFor, ensureOffer, licenseTrack, type LicenceType } from '../engine/catalogue';
import { attackById, runAttack, meetsExpectation } from '../engine/attacks';
import { SCENARIOS } from '../scenarios';
import { prepare, runStep } from '../engine/runner';
import { videoLicences, subscribe, renew, setBudget, type PlanShare } from '../engine/company';
import { checkTitle } from '../lib/mll/rights';
import { sha256hex } from '../lib/mll/util';
import type { Track } from './music';

export interface CheckRow { n: number; label: string; ok: boolean | null; detail?: string }
export interface Proof { ok: boolean; lines: string[]; checks?: CheckRow[]; raw?: unknown; ms: number; real?: RealInfo; block?: number }
export interface RealInfo { sats: number; paymentHash: string; preimage: string; ms: number; facts: { label: string; ok: boolean; how: string }[]; sellerGot: number }

/** Plain names for the ten checks (Proof tab only). */
export const CHECK_NAMES = ['The sale is signed by the seller.', 'The seller\'s wallet is linked to their account.', 'Everyone with a share agreed, and the shares add up to 100%.', 'The buyer\'s request names this sale.',
  'The use, place and time are allowed.', 'The bill came from the seller\'s linked wallet and names the request.', 'The bill equals the price.', 'It was paid (the receipt matches).',
  'It is dated on Bitcoin, and nothing withdrew or handed it over before.', 'Who owns the song (see scenario 11).'];
const rows = (v: Verdict): CheckRow[] => [...v.checks, v.ownership].map(c => ({ n: c.n, label: CHECK_NAMES[c.n - 1] ?? c.label, ok: c.status === 'pass' ? true : c.status === 'fail' ? false : null, detail: c.detail }));
const bundleRaw = (b: LicenceBundle) => ({ offer: b.offer, consents: b.consents, request: b.request, invoice: b.invoice, preimage: b.preimage, proof: (b as any).proof });

let tracks: Track[] = [];
/** Register the real files by their published fingerprints (no download needed). */
export function useTracks(t: Track[]) { tracks = t; for (const x of t) { const role = x.cast === 'alice' ? 'rain' : x.cast === 'frank' ? 'remix' : x.cast === 'dave' ? 'dave' : `track:${x.cast}`; if (!trackFile(role)) registerTrackFile({ role, sha256: x.sha256, label: x.file }); if (x.cast === 'dave') registerTrackFile({ role: 'track:dave', sha256: x.sha256, label: x.file }); } }
const sha = (cast: string) => tracks.find(t => t.cast === cast)?.sha256 ?? sha256hex(new TextEncoder().encode('demo:' + cast));
const song = (cast: string) => catalogueFor(cast)!;

/** One engine world per scenario page; "Start again" clears them. */
const labs = new Map<string, Lab>(); const mem = new Map<string, any>();
const labFor = (sc: string) => { let l = labs.get(sc); if (!l) { l = new Lab('rain'); labs.set(sc, l); } return l; };
export function resetEngine() { labs.clear(); mem.clear(); }
const engineLab = async (key: string, sid: string) => { if (!labs.has(key)) labs.set(key, await prepare(SCENARIOS.find(s => s.id === sid)!)); return labs.get(key)!; };
async function engineStep(key: string, sid: string, stepIds: string[], input?: Record<string, any>) {
  const lab = await engineLab(key, sid); const sc = SCENARIOS.find(s => s.id === sid)!; let last: Awaited<ReturnType<typeof runStep>> | undefined;
  for (const id of stepIds) { const done = (mem.get(key + ':done') as Set<string>) ?? new Set(); if (done.has(id)) continue; last = await runStep(lab, sc.steps.find(s => s.id === id)!, input); done.add(id); mem.set(key + ':done', done); }
  return { lab, out: last?.out };
}
/** Engine output → proof. The engine's own wording stays in the raw record; the screen shows our plain lines. */
const fromOut = (o: any, t0: number, lines: string[] = [], invert = false): Proof => ({ ok: invert ? !o?.ok : !!o?.ok, lines, checks: o?.verdict ? rows(o.verdict) : undefined, raw: { engineNote: o?.summary, ...(o?.json ? { record: o.json } : {}), ...(o?.verdict ? { result: o.verdict.result } : {}), ...(o?.trace ? { trace: o.trace } : {}) }, ms: performance.now() - t0, block: o?.verdict?.result?.anchoredHeight });
async function cheat(id: string, t0: number): Promise<Proof> {
  const a = attackById(id)!; const o = await runAttack(a); const caught = meetsExpectation(a, o);
  return { ok: caught, lines: [caught ? `Caught${o.by ? ' by ' + plainBy(o.by) : ''}.` : 'Not stopped as expected.'], checks: o.verdict ? rows(o.verdict) : undefined, raw: { attack: a.id, title: a.title, outcome: o.outcome, by: o.by, engineNote: o.summary, trace: o.trace }, ms: performance.now() - t0 };
}
const BY: Record<string, string> = { 'NWC cap': 'the budget', 'agent rule': 'the agent\'s own rules', 'ownership': 'check 10 (who owns the recording)' };
const plainBy = (by: string) => { const m = /^check\s*(\d+)/i.exec(by); const c = m ? CHECK_NAMES[Number(m[1]) - 1] : ''; return m ? `check ${m[1]} (${c[0].toLowerCase() + c.slice(1, -1)})` : BY[by] ?? 'the rules'; };
async function sale(sc: string, cast: string, type: LicenceType, cents: number, t0: number): Promise<Proof> {
  const lab = labFor(sc); const r = await licenseTrack(lab, song(cast), sha(cast), { type, priceCents: cents }); mem.set(`${sc}:bundle:${cast}:${type}`, r.bundle); mem.set(`${sc}:lab`, lab);
  return { ok: r.verdict.result.ok, lines: [`${r.verdict.result.ok ? 'Licence checks out' : 'Licence refused'}: ${r.verdict.passed} of 9 checks pass${r.verdict.ownership.status === 'pass' ? ', and the owner is confirmed' : ''}.`, `Checked from scratch in ${r.verdict.ms.toFixed(0)} ms.`],
    checks: rows(r.verdict), raw: bundleRaw(r.bundle), ms: performance.now() - t0, block: r.block };
}
const PLAN_SHARES: PlanShare[] = [{ who: 'harbour', role: 'publisher', bps: 4200 }, { who: 'dave', role: 'artist', bps: 2500 }, { who: 'erin', role: 'artist', bps: 2500 }, { who: 'alice', role: 'original artist', bps: 800 }];
const catalogueX = () => sha256hex([sha('dave'), sha('erin'), sha('frank')].sort().join('\n'));

/** Run the real check behind one step. Keys are `<scenario>.<step>` or `<scenario>.cheat`. */
export async function prove(key: string, o: { cents?: number; cast?: string; onProgress?: (k: number) => void } = {}): Promise<Proof> {
  const t0 = performance.now();
  switch (key) {
    case 's1.list': { const lab = labFor('s1'); const n = ensureOffer(lab, song(o.cast ?? 'alice'), sha(o.cast ?? 'alice'), 'creator', o.cents ?? 500); const off = lab.a[n];
      return { ok: true, lines: [`Offer signed by ${lab.name(song(o.cast ?? 'alice').seller)}. It names the song by its fingerprint ${off.tags.find((t: string[]) => t[0] === 'x')[1].slice(0, 12)}…`], raw: off, ms: performance.now() - t0 }; }
    case 's1.buy': return sale('s1', o.cast ?? 'alice', 'creator', o.cents ?? 500, t0);
    case 's2.personal': return sale('s2', 'alice', 'personal', 100, t0);
    case 's2.business': return sale('s2', 'alice', 'business', 5000, t0);
    case 's2.cheat': return cheat('A4', t0);
    case 's3.upload': { const r = await sale('s3', 'alice', 'creator', 500, t0); return { ...r, lines: ['Bob\'s licence is attached to his video: the signed offer, his signed order and the receipt.', ...r.lines.slice(0, 1)] }; }
    case 's3.check': { const lab = labs.get('s3') ?? labFor('s3'); let b = mem.get('s3:bundle:alice:creator'); if (!b) { await sale('s3', 'alice', 'creator', 500, t0); b = mem.get('s3:bundle:alice:creator'); }
      const v = await lab.verify(b); return { ok: v.result.ok, lines: [`Victor checked it with nobody's help: ${v.passed} of 9 checks pass${v.ownership.status === 'pass' ? ' and Alice is the confirmed owner' : ''}.`, `It took ${v.ms.toFixed(0)} ms.`], checks: rows(v), raw: { result: v.result }, ms: performance.now() - t0, block: v.result.anchoredHeight }; }
    case 's3.edited': { const t = tracks.find(x => x.cast === 'alice'); let cut = t?.previewSha256 ?? ''; let how = 'published fingerprint of the 30-second cut';
      if (t) { try { const b = new Uint8Array(await (await fetch('./music/' + t.preview)).arrayBuffer()); cut = sha256hex(b); how = 'fingerprint worked out just now from the 30-second cut'; } catch {} }
      const want = sha('alice'); return { ok: cut !== want, lines: [`The licence names the song by its fingerprint ${want.slice(0, 12)}…`, `The edited copy (a 30-second cut) has the fingerprint ${cut.slice(0, 12)}… (${how}).`, cut !== want ? 'They differ, so the licence does not cover the edited copy.' : 'They match.'], raw: { licenceFingerprint: want, editedFingerprint: cut }, ms: performance.now() - t0 }; }
    case 's3.cheat': return cheat('A1', t0);
    case 's4.erin': { const lab = labFor('s4'); const n = ensureOffer(lab, song('carol'), sha('carol'), 'creator', 600); const c = lab.a[`${n}.consents`] ?? [];
      return { ok: c.length === 1, lines: [`Erin signed her agreement to 20% of "Night Shift". Carol's sale now carries ${c.length} agreement.`], raw: c[0], ms: performance.now() - t0 }; }
    case 's4.alice': { const lab = labFor('s4'); const n = ensureOffer(lab, song('frank'), sha('frank'), 'creator', 700); const c = lab.a[`${n}.consents`] ?? [];
      return { ok: c.length === 1, lines: [`Alice signed her agreement to 40% of Frank's remix.`, 'Without it, the remix could not be sold.'], raw: c[0], ms: performance.now() - t0 }; }
    case 's4.buy': return sale('s4', 'frank', 'creator', 700, t0);
    case 's4.cheat': return cheat('A3', t0);
    case 's5.stop': case 's5.try': case 's5.earlier': {
      let st = mem.get('s5:st'); if (!st) { const lab = labFor('s5'); await sale('s5', 'alice', 'business', 5000, t0); const bundle = mem.get('s5:bundle:alice:business'); const offer = bundle.offer;
        lab.advance(3600); const rv = lab.lib.makeRevocation(lab.key('alice'), offer.id, 'retire'); lab.publish(rv, 'alice', 'revocation'); const b = lab.opReturn(lab.lib.revocationPayloadCompact(offer.id, lab.key('alice')), 'stop selling Business');
        st = { lab, bundle, rv, block: b.height }; mem.set('s5:st', st); }
      if (key === 's5.stop') return { ok: true, lines: [`Alice signed "stop selling" for her Business licence. Dated on Bitcoin in block ${st.block} (practice record).`], raw: { stopSelling: st.rv }, ms: performance.now() - t0, block: st.block };
      if (key === 's5.try') return { ok: true, lines: ['Alice\'s wallet sends no new bills for a sale she has stopped, so nothing can be paid.'], ms: performance.now() - t0 };
      const v = await st.lab.verify(st.bundle); return { ok: v.result.ok, lines: [`ClipAI's earlier licence: ${v.passed} of 9 checks pass. Its bill came before Alice stopped selling, and it was dated on Bitcoin within 24 hours.`], checks: rows(v), raw: { result: v.result }, ms: performance.now() - t0, block: v.result.anchoredHeight }; }
    case 's5.cheat': return cheat('A12', t0);
    case 's6.hand': case 's6.check': {
      let st = mem.get('s6:st'); if (!st) { const lab = labFor('s6'); const t = song('frank'); const x = sha('frank'); const n = ensureOffer(lab, t, x, 'creator', 700); lab.setUp('bob');
        const r = await licenseTrack(lab, t, x); const boughtAt = lab.chain.tip.height; lab.setUpAll(['harbour']); lab.advance(86400);
        const tr = lab.addTransfer('frank', { x, from: lab.pub('frank'), to: lab.pub('harbour'), reason: 'sale', coOwners: [{ pubkey: lab.pub('alice'), role: 'original artist', bps: 4000 }], note: 'Frank hands his rights in the remix to Harbour Music. Alice keeps her 40%.' }, { anchor: false });
        const c = lab.cosign('alice', tr.event, 'co-owner'); const done = lab.anchorTitle(tr, 'rights transfer (remix to Harbour)'); st = { lab, x, boughtAt, tr, c, done, bundle: r.bundle, offer: n }; mem.set('s6:st', st); }
      const { lab, x } = st; const opts = { origin: lab.pub('frank'), trust: [] as string[] };
      if (key === 's6.hand') { const now = await checkTitle(x, lab.pub('harbour'), lab.chain.tip.height, lab.chain, lab.title, opts); const old = await checkTitle(x, lab.pub('frank'), lab.chain.tip.height, lab.chain, lab.title, opts);
        return { ok: now.ok && !old.ok, lines: [`Frank signed the handover; Alice signed that she agrees. It is timestamped on Bitcoin in block ${st.done.anchor.height}.`, `Rights holder now: ${now.ok ? 'Harbour Music' : '?'}. Frank can no longer sell new licences for the remix.`], raw: { transfer: st.tr.event, aliceAgrees: st.c }, ms: performance.now() - t0, block: st.done.anchor.height }; }
      const then = await checkTitle(x, lab.pub('frank'), st.boughtAt, lab.chain, lab.title, opts); const v = await lab.verify(st.bundle);
      return { ok: then.ok && v.result.ok, lines: [`When Bob bought it (block ${st.boughtAt}), Frank held the rights.`, `Bob's licence still counts: ${v.passed} of 9 checks pass.`], checks: rows(v), raw: { holderWhenBought: 'frank', title: then }, ms: performance.now() - t0 }; }
    case 's6.plan': { const r = await engineStep('s6p', 's26', ['plan'], { threshold: '2' }); return fromOut(r.out, t0, ['Alice signed a plan naming Heidi, Ivan and Judy. Any 2 of them together can take over. Nothing moves today.']); }
    case 's6.cheat': return cheat('A20', t0);
    case 's7.budget': return fromOut((await engineStep('s7', 's4', ['budget'])).out, t0, ['The agent\'s wallet connection allows paying bills only, with a cap per payment and per day.']);
    case 's7.shop': { const r = await engineStep('s7', 's4', ['budget', 'read', 'request', 'invoice', 'pay', 'verify']); const v = r.out?.verdict; return fromOut(r.out, t0, [`One of the agent's purchases, made on its own inside its budget and checked like any other licence: ${v?.passed ?? 0} of 9 checks pass.`]); }
    case 's7.cheat': return cheat('A8', t0);
    case 's8.budget': { const lab = labFor('s8'); setBudget(lab, o.cents ?? 300000); return { ok: true, lines: [`ClipAI's agent's wallet connection can spend up to $${((o.cents ?? 300000) / 100).toLocaleString('en-GB')} this month, at most $100 a payment, and only on bills.`], raw: lab.nwc['clipagent'] ? { budget: { monthlySats: (lab.nwc['clipagent'] as any).monthlyCapSat, maxPerPaymentSat: (lab.nwc['clipagent'] as any).maxPerPaymentSat } } : undefined, ms: performance.now() - t0 }; }
    case 's8.run': { const lab = labFor('s8'); if (!lab.nwc['clipagent']) setBudget(lab, o.cents ?? 300000); const r = await videoLicences(lab, { alice: sha('alice'), dave: sha('dave'), carol: sha('carol'), erin: sha('erin') }, o.cents ?? 300000, 500, o.onProgress);
      return { ok: r.bought === 500, lines: [`${r.bought} licences bought and signed${r.refused ? `, ${r.refused} refused` : ''}, in ${(r.ms / 1000).toFixed(1)} s.`, `All ${r.bought} share one timestamp on Bitcoin.`], raw: { bought: r.bought, spentSats: r.spentSats, credits: r.credits }, ms: performance.now() - t0, block: lab.chain.tip.height }; }
    case 's8.check': { const lab = labs.get('s8'); const all: LicenceBundle[] = lab?.a['clip.bundles'] ?? []; if (!lab || !all.length) return { ok: false, lines: ['Run step 2 first.'], ms: 0 };
      const pick = [...all].sort(() => Math.random() - 0.5).slice(0, 20); let ok = 0; let v: Verdict | undefined; for (const b of pick) { v = await lab.verify(b); if (v.result.ok) ok++; }
      return { ok: ok === 20, lines: [`Victor picked 20 of the 500 at random and checked each from scratch: ${ok} of 20 pass.`], checks: v ? rows(v) : undefined, raw: { checked: pick.length, passed: ok }, ms: performance.now() - t0 }; }
    case 's9.subscribe': case 's9.renew': case 's9.cut': { const lab = labFor('s9'); const x = catalogueX();
      const r = key === 's9.subscribe' ? await subscribe(lab, x, 300000, PLAN_SHARES) : key === 's9.renew' ? await renew(lab, x, 300000, PLAN_SHARES) : await renew(lab, x, 5000, PLAN_SHARES);
      if (!r.ok) return { ok: true, lines: ['The wallet refused the renewal: $99 is more than the budget allows. Nothing was paid.'], raw: { refused: r.reason, month: r.month }, ms: performance.now() - t0 };
      return { ok: r.verdict.result.ok, lines: [`Month ${r.month} licence checks out: ${r.verdict.passed} of 9 checks pass.`, `Covers ${new Date(r.from * 1000).toISOString().slice(0, 10)} to ${new Date(r.until * 1000).toISOString().slice(0, 10)} (test world dates).`], checks: rows(r.verdict), raw: bundleRaw(r.bundle), ms: performance.now() - t0, block: r.verdict.result.anchoredHeight }; }
    case 's10.buy': return fromOut((await engineStep('s10', 's6', ['buy'])).out, t0, ['ModelCo\'s signed order names the use "AI training" and the song\'s fingerprint.']);
    case 's10.train': return fromOut((await engineStep('s10', 's6', ['buy', 'stamp', 'train'])).out, t0, ['The licence was timestamped on Bitcoin first; ModelCo signed a "training starts" note after.']);
    case 's10.proof': return fromOut((await engineStep('s10', 's6', ['buy', 'stamp', 'train', 'reg'])).out, t0, ['The regulator checked the licence alone and compared its Bitcoin date with the start of training: the licence came first.']);
    case 's10.cheat': { const c = await cheat('A11', t0); const e = (await engineStep('s10', 's6', ['buy', 'stamp', 'train', 'reg', 'late'])).out; return { ...c, raw: { ...(c.raw as object), lateLicence: e?.summary } }; }
    case 's11.fake': return fromOut((await engineStep('s11', 's12', ['list'])).out, t0, ['Mallory\'s sale is validly signed, by Mallory. Maths alone can\'t say she doesn\'t own the song.']);
    case 's11.compare': { const a = await cheat('A14', t0); const s = (await engineStep('s11', 's12', ['list', 'spot'])).out; return { ...a, ok: true, lines: ['Two sales name the same song fingerprint.', 'Trent confirms Alice owns "Rain". Nobody confirms Mallory, so check 10 marks her sale "owner not confirmed".'], raw: { ...(a.raw as object), compare: s?.summary } }; }
    case 's11.cheat': { const c = await cheat('A7', t0); const e = (await engineStep('s11b', 's15', ['publish', 'read'])).out; return { ...c, raw: { ...(c.raw as object), agent: e?.summary } }; }
  }
  return { ok: false, lines: ['Unknown step'], ms: 0 };
}

/** A real test payment on Bitcoin's test network (Lightning), seller wallet only. Wallets are made ahead of time when we can. */
type WarmP = Promise<import('../live/realpay').Warm>; const warms = new Map<string, WarmP>();
export function warm(slot: string, fundSat: number) { if (!warms.has(slot)) { const p = import('../live/realpay').then(m => m.warmWallets({ buyer: 'bobagent', fundSat })); p.catch(() => warms.delete(slot)); warms.set(slot, p); } return warms.get(slot)!; }
export async function realPay(slot: string, sats: number, title: string, cast: string, onStep?: (s: string) => void): Promise<RealInfo> {
  const m = await import('../live/realpay'); const song = { title, sha256: sha(cast), termsText: `Creator licence for "${title}" (test).` };
  let w: Awaited<WarmP> | undefined; const pending = warms.get(slot); warms.delete(slot);
  if (pending) { onStep?.('Making test wallets…'); try { w = await pending; } catch { w = undefined; } }
  if (w && (Date.now() - w.at > 10 * 60_000 || w.fund < sats + 50)) w = undefined; // stale or too small: start fresh
  if (!w) { if (!(await m.faucetReachable(3000))) throw new Error('The free test wallets are not answering right now.'); onStep?.('Making test wallets…'); w = await m.warmWallets({ buyer: 'bobagent', fundSat: sats + 300 }); }
  const r = await m.finishLicence(w, { priceSat: sats, song, onStep });
  return { sats, paymentHash: r.paymentHash, preimage: r.preimage, ms: r.ms, facts: r.facts, sellerGot: r.aliceGot };
}

/** Check a file yourself: work out its fingerprint on this device and compare with the songs on sale. */
export async function fingerprint(file: File) { const b = new Uint8Array(await file.arrayBuffer()); const h = sha256hex(b); const t = tracks.find(x => x.sha256 === h) ?? tracks.find(x => x.previewSha256 === h); return { hash: h, match: t ? { cast: t.cast, preview: t.previewSha256 === h } : undefined }; }
/** End card: your own song, fingerprinted on this device, put on sale, bought by Bob's agent with test money, and checked. */
export async function ownSong(file: File, priceCents: number) { const { ownSongSale } = await import('../engine/catalogue'); const b = new Uint8Array(await file.arrayBuffer()); const h = sha256hex(b);
  const lab = new Lab('own'); const r = await ownSongSale(lab, { title: file.name.replace(/\.[^.]+$/, ''), sha256: h, type: 'creator', priceCents });
  return [`✓ Your song is on sale: a Creator licence for $${(priceCents / 100).toFixed(2)}. Its fingerprint is ${h.slice(0, 16)}…`, `✓ Bob's agent bought it with test money. The licence checks out: ${r.verdict.passed} of 9 checks.`, 'Who owns the song stays "not confirmed", because no one you trust has confirmed it yet (see scenario 11).']; }
export { CATALOGUE };
