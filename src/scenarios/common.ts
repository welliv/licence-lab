import { Lab, short, type Verdict, type LicenceBundle } from '../engine/lab';
import { onboardAlice, releaseRain, vouch, purchase, F, type Out } from '../engine/actions';
export { F, short };
/** Quiet setup used by scenarios that start after S1 and S2. */
export function baseWorld(lab: Lab, o: { kinds?: Parameters<typeof releaseRain>[1] } = {}) {
  lab.setUpAll(['alice', 'distributor']); onboardAlice(lab, 'alice', { quiet: true }); vouch(lab, 'distributor', 'alice'); releaseRain(lab, o.kinds);
  lab.stamp(lab.a['offer.creator'].id, 'proof of release'); lab.anchorBatch('Proof of release');
  lab.log({ from: 'echo', text: 'Setup: Alice onboarded (S1) and released "Rain" with Carol, Dave and Erin (S2)', badge: 'real' });
}
export function verdictOut(v: Verdict, what = 'Licence', okText?: string): Out {
  const fail = v.checks.find(c => c.status === 'fail');
  return { ok: v.result.ok, badge: v.result.ok ? 'real' : 'fail', verdict: v,
    summary: v.result.ok ? (okText ?? `${what} verified: ${v.passed}/9 checks pass, recomputed from scratch in ${v.ms.toFixed(0)} ms`) : `${what} rejected by check ${fail?.n}: ${v.result.reason}`,
    fields: [F('result', v.result.ok ? 'valid' : `invalid (${v.result.code})`), F('checks passed', `${v.passed}/9`, false), ...(v.result.anchoredHeight ? [F('anchored at block', v.result.anchoredHeight)] : []), ...(v.result.revocationMethod ? [F('revocation scan', v.result.revocationMethod, false)] : [])],
    code: `const result = await verifyLicence(bundle, chain)\n// → ${JSON.stringify({ ok: v.result.ok, code: v.result.code, anchoredHeight: v.result.anchoredHeight })}`, proves: v.checks.filter(c => c.status === 'pass').map(c => c.n) };
}
export async function anchorAndVerify(lab: Lab, b: LicenceBundle, label: string) {
  lab.stamp(lab.lib.grantDigest(b), label); lab.advance(1800); lab.anchorBatch(); lab.attachProof(b); return lab.verify(b);
}
export const seconds = (n: number) => ({ key: 'seconds', label: 'Seconds of "Rain" in the video', type: 'number' as const, default: n, hint: 'The offer allows up to 240. Try 300.' });
export { purchase };
