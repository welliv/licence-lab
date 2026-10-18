# Spec changes needed (NIP-XX draft and the design spec)

Each item names the finding that forced it. "MUST" is used as in RFC 2119.

## Event format
1. **Canonical form (F-14).** `id`, `pubkey` and `sig` MUST be lowercase hex of exact length; `created_at` and `kind` MUST be integers; every tag element MUST be a string. Verifiers MUST reject anything else. They MUST re-verify signatures themselves and never trust a cached "verified" flag (builder's finding; keep it).
2. **Size limits (F-14/F-07).** At most 64 tags, 16 elements per tag, 32 KB per serialised event; sellers MAY cap request bodies at 32 KB.
3. **Single-valued tags (F-08).** In the offer, `d x use terms terms-text price pay-link binding valid-until` MUST each appear exactly once. In consent, `e terms share payout`. In binding, `node scope node-sig`. In request, `e terms x use licensor node amount network nonce not-before`. Duplicates make the event invalid.
4. **Field grammar (F-10).** `price`: positive integer sats, no leading zero or exponent. `valid-until`: block height (decimal integer); it is required. Co-owner `p`: 64-hex key, unique, not the artist's own key, share = integer basis points 0–10000, total ≤ 10000. A 0 bps share is credit-only and receives no payout. `pay-link`: an `https` URL (`http` only on regtest).
5. **Use scope (F-09).** Define the grammar: 4 positional fields, then `key=value` scopes with unique keys. `seconds` and `max-seconds` are positive integers with `seconds ≤ max-seconds`. **Every scope in the offer other than `max-seconds` MUST be restated with the same value in the request.** Publish standard presets so agents never compose these by hand.
6. **Free text is non-normative (F-23).** `title` and `terms-text` are for humans. The machine-readable `use`, `price` and `x` tags decide what was licensed. Agents MUST NOT derive amounts or uses from free text.

## Payment flow
7. **Buyer amount check (F-01).** Before paying, the buyer MUST check that `accepted.amount` and the invoice amount both equal the `amount` in its own signed request. (The draft's step 4 "checks it" must list this explicitly.)
8. **One payable invoice per request (F-03/F-26).** A seller MAY issue a fresh invoice per challenge, as x402 requires, but MUST cancel any earlier unpaid invoice for the same request id first, or return the earlier invoice if it is already paid. A seller MUST answer a repeat settlement that carries the valid preimage with the same success receipt.
9. **Fresh payment hashes (F-24).** Each invoice MUST use a fresh random preimage. Reusing a payment hash lets routing nodes steal HTLCs and makes two licences share one proof.
10. **Expiry does not void a paid invoice (F-17).** A valid preimage is proof of payment even after invoice expiry.
11. **Pay-link safety (F-06).** Clients MUST refuse non-https and private, loopback or link-local destinations and MUST NOT follow redirects.
12. **NWC (F-05/F-15/F-16).** Agents MUST verify that every NIP-47 response is signed by the wallet service key and that `result_type` matches the request. Budgets MUST include a routing-fee allowance. A local budget ledger shared by several workers MUST be updated atomically. The wallet-side budget remains mandatory.

## Timestamps and revocation
13. **Fix the MLR1 format in the NIP (code/spec drift).** The draft says `"MLR1" ‖ revocation id` (36 bytes). The code uses `"MLR1" ‖ target id ‖ BIP-340 sig(K_a, SHA-256("MLR1" ‖ target))` (100 bytes), which is self-authenticating without a relay. Adopt the 100-byte form.
14. **Revocation ordering (F-04).** Replace "Grants anchored before that block stay valid" with: *a revocation of an **offer** voids only licences whose invoice timestamp is later than (revocation block time − 7,200 s); a revocation of a **binding** voids every licence anchored at or after it.* The buyer MUST reject invoices dated more than 60 s in the future. Buyers SHOULD anchor at once.
15. **OTS must be verifiable (F-18). DONE in code (Mutinynet round):** `src/ots.ts` parses `.ots`, follows every op to Bitcoin block-header attestations, and checks the merkle root in internal byte order. A proof that has only pending (calendar) attestations returns `anchor_pending` and is NOT a valid licence. A proof with any Bitcoin attestation that does not match the chain returns `anchor_invalid`, even if it also has a pending one. The earliest matching height is the anchor height. Remaining spec work: name `type: "ots"` with `ots` = hex of a standard OpenTimestamps file whose file digest is D (SHA-256 op), and ship the test vectors in `tests/vectors/`. Original text: Until the reference implementation verifies completed OTS proofs, the NIP must not call OTS the only anchoring method. Specify the OTS proof encoding and test vectors, or allow OP_RETURN anchors (MLA1 ‖ D) as an equal option. Recommend batching many D values under one Merkle root to cut the cost.
16. **Check 9 at scale (F-19).** State plainly that a full-chain scan is impractical on mainnet. Require an OP_RETURN index or the signed `status` record, and require verifiers to report the method (already in the draft; keep it).
17. **Binding freshness (F-22).** The node-sig message should be `MLL-BIND:<artist pubkey>:<created_at>:<expiry height>` so that a sold or rotated node does not stay bound forever without an MLR1.

## Privacy
18. **Per-licence buyer keys (F-21).** Recommend that buyers sign each request with a fresh key derived from their main key (so they can later prove control), so sellers and verifiers cannot link all of a buyer's licences.

## Splits
19. **Statements (F-11/F-02).** Co-owner statements MUST be signature-checked. Sellers MUST record failed payouts and retry them. A payout failure MUST NOT stop sales.

## Keep out of v1
20. Exclusive licences and reservation keys (`K_r`, V10 in the design spec) are **not implemented and were not tested**. Keep them in "future extensions" until there is code, live tests and outside review.

## Added in the Mutinynet round (code first, then spec)
21. **Per-licence key derivation (F-21, done).** `k_l = HMAC-SHA256(k_main, "MLL-LICENCE-KEY/v1/<offer id>/<nonce>/<ctr>")`, first valid scalar. The request is signed by `k_l`; the nonce is already in the request, so nothing new is stored. The main key never appears in the bundle.
22. **Holder link (new event kind 3415, private).** Signed by the main key with tags `p` = licence key, `e` = request id, `licence-sig` = BIP-340 signature by the licence key over SHA-256("MLL-LINK/v1:<main>:<licence>:<request id>"). **Both signatures are required**: a link signed only by the main key would let anyone claim anyone's licence (test P6). Links are shown only to whoever needs to know; never published.
23. **Binding `not-before` (N-1).** Bindings SHOULD carry a `not-before` block hash. Check 9 then scans `[binding not-before, anchor]`; a revocation mined before the binding's own not-before is ignored (it cannot be a legitimate revocation of something that did not exist yet). Without it, a verifier must scan from genesis: on Mutinynet that is 3.5 million blocks.
24. **Compact revocation MLR2 (N-2).** `"MLR2" ‖ first 12 bytes of target id ‖ BIP-340 sig over SHA-256("MLR2" ‖ full target id)` = exactly 80 bytes. Nodes with the pre-v30 default (`datacarriersize` 83, i.e. 80 data bytes) do not relay the 100-byte MLR1. Verifiers accept both; writers SHOULD use MLR2. The signature covers the full id, so the short prefix cannot be ground to revoke another target.
25. **Text anchors (OP-RETURN-Bot).** The real bot writes UTF-8 text. A licence anchored through it is the 68-byte text `"MLA1" + lowercase hex(D)`; verifiers MUST treat it as equal to the binary `MLA1 ‖ D`. Before paying, the client MUST check that the bot's invoice description hash equals SHA-256(text).
26. **Windows measured in blocks are network-dependent (N-3).** `valid-until + 144`, the seller's 144-block `not-before` freshness window and the 7,200 s revocation margin assume 10-minute blocks. On Mutinynet (30 s blocks) 144 blocks are 72 minutes. The NIP should state these windows in seconds (checked against block time) or per network.
