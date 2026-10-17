// Plain words for verdicts. The technical reason is kept for "Under the hood".
import type { Verdict } from '../engine/lab';
const PLAIN: [RegExp, string][] = [
  [/^offer_(signature|tags|terms)/, 'someone changed the offer after the artist signed it'], [/^offer_price/, 'the price in the offer is malformed'], [/^offer_/, 'the offer is malformed'],
  [/^consent_/, 'a co-owner did not agree to this sale'], [/^binding_/, 'the seller\'s wallet is not linked to the artist'],
  [/^request_use$/, 'this use is not covered by the offer'], [/^request_/, 'the licence names a different offer or buyer'], [/^link_invalid$/, 'the holder could not prove the licence is theirs'],
  [/^invoice_(decode|description|not_committed)$/, 'the payment was for something else'], [/^invoice_wrong_node$/, 'the money went to someone other than the artist'], [/^invoice_amount$/, 'the amount paid is not the price'], [/^invoice_network$/, 'the payment was on the wrong network'],
  [/^preimage$/, 'there is no proof it was paid'], [/^anchor_pending$/, 'its date is not on Bitcoin yet'], [/^anchor_|^not_before|^no_chain/, 'it has no valid date on Bitcoin'],
  [/^offer_lapsed$/, 'the offer had expired'], [/^revoked$/, 'the artist withdrew this offer before the sale'],
  [/^rights_transferred$/, 'the artist had already sold the rights to someone else'], [/^rights_key_retired$/, 'this account was retired after a theft'], [/^rights_not_holder$/, 'the seller did not own the rights at that time'],
];
export function plainReason(v: Verdict): string { const c = v.result.code ?? '';
  return PLAIN.find(([re]) => re.test(c))?.[1] ?? 'one of the checks failed'; }
export const verdictLine = (v: Verdict) => v.result.ok ? 'This licence is real' : `Not valid: ${plainReason(v)}`;
