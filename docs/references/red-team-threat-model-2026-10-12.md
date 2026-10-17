# Threat model: music licence protocol (MLL), independent audit

Scope: code at `mll-build` commit `ffe4cdd` (copied to a separate local copy, branch `audit`), the NIP draft and both white-paper texts. Regtest only. Neutral cast: artist **Ava**, track **Rain**, co-owner **Jay**, buyer **Sam**.

## 1. What the system does (one paragraph)
Ava signs a **binding** (her Nostr key says "this Lightning node is mine", and the node co-signs), an **offer** (a parameterised replaceable event, kind 30402, holding the track hash, use, price, terms hash and text, pay-link, binding and valid-until) and lists co-owners, each of whom signs a **consent**. Sam (or his agent) signs a **request** naming the offer, use, amount, network, a nonce and a recent block hash (`not-before`). He POSTs it to the HTTP 402 pay-link. The seller returns a BOLT11 invoice from the bound node whose `description_hash` commits to the request bytes and URL. Sam pays it over NWC, and the **preimage** completes the licence. The **bundle** (offer, binding, consents, request, invoice, preimage) is digested and timestamped on Bitcoin (OP_RETURN, OP_RETURN-Bot or OTS). `verifyLicence` runs 9 checks. Revocations are self-authenticating `MLR1` OP_RETURNs.

## 2. Assets
| # | Asset | Why it matters |
|---|---|---|
| A1 | Artist Nostr key | Signs offers, bindings and revocations, so it is the root of rights |
| A2 | Artist Lightning node key and macaroons | Signs invoices and receives the money; the node-sig ties it to A1 |
| A3 | Co-owner keys and payout destinations | Consent and income |
| A4 | Buyer Nostr key | The licence is granted to the holder of this key |
| A5 | Buyer funds, NWC connection secret, agent budget ledger | Money at risk from overpayment, drain or leaks |
| A6 | Licence bundle and preimage | The proof of licence |
| A7 | Timestamp anchor (OP_RETURN, OTS proof) | Proves "when", for revocation ordering and lapse |
| A8 | Seller availability (HTTP endpoint, LND invoice database) | Revenue |
| A9 | Co-owner sales statements | Split auditing |
| A10 | Buyer privacy (what was licensed, by whom, when) | Commercial confidentiality |
| A11 | Licence meaning (use, territory, term, seconds) | What a court or platform will honour |

## 3. Actors and their powers
| Actor | Trusted for | Can do if malicious |
|---|---|---|
| Artist (Ava) | Her own offers | Overcharge, refuse delivery, revoke after selling (rug), reuse payment hashes, under-report splits, omit a real co-owner, sell a song she does not own |
| Co-owner (Jay) | His consent | Withhold consent (blocks sales), consent to a different version |
| Buyer (Sam) | Nothing | Forge or tamper bundles, replay requests, widen use, race settlement, flood the seller |
| Buyer agent (software) | Spending within budget | Overspend on bugs, follow injected instructions, SSRF via pay-link |
| Platform / verifier app | Running verifyLicence correctly | Misread ambiguous tags; use a cached "verified" flag |
| Relay | Nothing (transport only) | Withhold, censor, reorder, serve stale or forged events, rewrite plaintext NWC tags, replay events |
| Artist's Lightning node | Signing invoices for A1 | If stolen: sign invoices that look like Ava's |
| Routing nodes | Forwarding | Learn payment hash and amount, steal HTLCs when a payment hash is reused, delay or fail payments |
| OTS calendar | Aggregating digests | Withhold or delay the upgrade; cannot forge a completed proof |
| OP_RETURN service (OP-RETURN-Bot) | Broadcasting | Take payment and not broadcast; delay one party's anchor (critical for any first-come rule) |
| Miner | Ordering | Reorder or censor anchor and revocation transactions; skew block time by up to about 2 hours |
| Key thief | Nothing | With A1: new offers, revocations, bindings. With A2: invoices. With the NWC secret: spend up to the wallet budget |
| Malicious app or agent | Nothing | Show a forged statement, a forged offer, or phish keys |
| LLM prompt injection | n/a | Free-text fields (title, terms-text, seller error bodies) try to steer an LLM agent into overpaying or the wrong use |

## 4. Trust boundaries
1. **Relay to client**: every event is untrusted until `verifyEvent` (strict) passes.
2. **Seller HTTP to buyer agent**: the 402 body and headers are untrusted. The buyer must check the payee against the binding and the amount against its **own signed request** before paying.
3. **Buyer HTTP to seller**: the body is untrusted (size, JSON shape, JCS bytes, signature).
4. **Agent to wallet (NWC over a relay)**: wallet responses must be signed by the wallet key and match the method.
5. **Node to chain**: anchors and revocations come only from a full node or chain oracle you trust.
6. **Free text to LLM**: `title`, `terms-text` and seller error text are data, never instructions.
7. **Process to disk**: the buyer ledger and seller store are shared state between processes.

## 5. STRIDE
| | Threat | Where | Control after the audit |
|---|---|---|---|
| **S**poofing | Forged offer, consent or binding; Eve binds Ava's node; forged NWC response; forged statement | events, binding, NWC, statement | Strict sig + canonical hex (F-14); node-sig over the artist key; NWC sig + author + result_type (F-05); statement sig (F-11) |
| **T**ampering | Edited spread copy passes the cached verify; duplicate tags; tampered x402 fields; invoice HRP edits | verify, seller | Own verifyEvent; unique-tag rule (F-08); exact field compare; signature recovery |
| **R**epudiation | Artist denies the sale; seller refuses delivery | settlement | Preimage + node-signed invoice is the proof, with no seller cooperation needed (H30) |
| **I**nformation disclosure | Buyer key in every bundle; LND errors echoed; NWC secret on disk | bundle, seller 500, ledger | Generic 500 (F-12); ledger 0600; per-licence buyer keys recommended (F-21) |
| **D**enial of service | Huge body or tags, slowloris, request floods minting invoices, payout crash, revocation scan cost, null payload crash | seller, verify | Body/header/timeouts, rate limit, one payable invoice per request (F-07/F-03); payout never throws (F-02); scan cache (F-19); payload shape (F-25) |
| **E**levation | Request widens use (`seconds=abc`); agent SSRF; budget bypass across processes or by a relay | useWithin, buyer | Strict integers (F-09); SSRF guard (F-06); ledger lock (F-15); NWC auth (F-05) |

## 6. Protocol-specific attack classes considered
1. Signature malleability and verify-cache bypass. 2. Serialisation and canonicalisation (unicode NFC/NFD, key order, duplicate tags and keys, huge tags, non-integer fields). 3. Replaceable-offer versioning (consent or request for another version). 4. Co-owner impersonation, self-consent, duplicate co-owners. 5. Split arithmetic (0%, over 100%, negative, fractional, rounding, dust). 6. Node binding (stolen, rotated, replayed node-sig). 7. BOLT11 tricks (wrong description hash or URL, zero or any amount, expiry, network, route hints, payee/n mismatch, duplicate fields, high-S, recovery id). 8. Preimage and payment-hash reuse. 9. Cross-seller and cross-offer request replay. 10. Seller takes payment and does not deliver. 11. Duplicate request and settlement races. 12. Time (not-before, clock skew, block-height lies, OTS pending vs complete, fake OTS, third-party OP_RETURN). 13. Revocation races, backdating, spam. 14. NWC budget (concurrency, fees, amount above price, secret leakage, relay-forged responses). 15. x402 header and body tampering. 16. Seller DoS (body, slowloris, floods). 17. Relay censorship, withholding, forgery. 18. LLM prompt injection via offer text. 19. Privacy of buyer identity.

## 7. Out of scope / assumed
- Bitcoin consensus and LND correctness. Lightning routing privacy beyond what the payer chooses.
- Whether Ava actually owns Rain. Cryptography proves what her key signed and when; ownership is a vouching and legal matter.
- Exclusive licences (not implemented; must stay out until designed and reviewed).
- NIP-46 remote signing (not implemented in this code).
