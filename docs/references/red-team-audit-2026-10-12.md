> Published copy for reference. Findings are listed in full in red-team-findings-2026-10-12.md.

# Audit summary: music licence protocol

**Auditor:** independent red team (Grok Bot), 12 October 2026. **Code:** `mll-build` commit `ffe4cdd`. **Fixed copy:** a separate local copy (branch `audit`) (nothing pushed; no pull requests touched). **Network:** local regtest only; no real money.

## Verdict
**The core design is sound, and after the fixes it is safe enough for a public test network pilot. It is not yet safe or practical for real money at scale.**

The central idea holds up under attack: a licence is a signed request, plus an invoice from the artist's bound node that commits to that request, plus the payment preimage. I could not forge a licence, re-use a payment for another licence, replay a request at another seller or offer, or get an unbound node's invoice accepted. A seller who takes the money and refuses to deliver cannot stop the buyer from proving the licence.

The code around that idea had real holes. The worst three:
1. **Overpayment (HIGH).** The buyer's agent would pay whatever the seller's 402 asked. On regtest the original agent paid **4,500 sats for a 50-sat licence** and the licence then failed verification.
2. **One co-owner could crash the artist's shop (HIGH).** A failed payout to Carol (node offline, or a 0% share) killed the seller process.
3. **The artist could void licences she had already been paid for (HIGH).** She could revoke the offer before a slow (OpenTimestamps) anchor confirmed.

All three are fixed, with regression tests.

## Numbers
| | |
|---|---|
| Findings | **27**: 0 critical, **3 high**, **11 medium**, **12 low**, 1 info |
| Fixed in code | 24 (each with a regression test) |
| Still open | 3 design or spec items: OTS verification (F-18), buyer privacy (F-21), binding expiry (F-22); plus partial items F-19 (check 9 at scale) and F-24 (hash reuse is a seller duty) |
| New adversarial tests | **185** (121 protocol and verification, 64 seller, agent and NWC), including 11 fast-check property and fuzz tests |
| Against the original code | 109 pass, **76 fail** (each failure is a finding or part of one) |
| Against the fixed code | **224 / 224 pass** (185 new + the builder's 39) |
| Live regtest steps | **16 / 16 pass** (exploits, load, recovery) |
| Ben's `x402-ln check` | **44 passed, 0 failed**, 1 expected warning (regtest network id) |
| Load | **1,000 sequential sales: 1,000 ok, 5.1 sales/s, p50 195 ms, p95 231 ms, p99 265 ms**. 50 concurrent: 50 ok in 6.0 s (p95 5.1 s). 1,050 co-owner payouts, 0 failed |
| Cost per sale | Lightning fee only (0 sats on a direct channel). Anchoring: OTS free but slow; own OP_RETURN 338–3,380 sats; OP_RETURN-Bot 2,981 sats |
| Artist publishing | About 150 ms of machine time; 3 signatures from 2 people plus one node signature |
| Integrating `verifyLicence` | 8 lines |

## What is still unsafe or impractical
1. **OpenTimestamps, the design's default anchor, cannot be verified by this code.** It fails safe (the licence shows as "pending"), but the default path never completes. Implement OTS verification or make OP_RETURN, ideally batched, an equal option.
2. **Revocation check at mainnet scale.** Check 9 scans every block. That is fine on regtest but impossible on mainnet without an OP_RETURN index or the signed status record, which means trusting someone.
3. **A 2-hour revocation window remains.** An artist can still void a licence whose invoice is less than 2 hours older than her revocation block. Buyers should anchor immediately.
4. **Buyer privacy.** Every licence names the buyer's long-term key, so purchases can be linked. Use a fresh key per licence.
5. **Bindings never expire.** A sold or rotated node stays bound until an on-chain revocation.
6. **Running a node is the real barrier.** Artists need an always-on Lightning node with inbound liquidity and a public HTTPS endpoint. Hosted nodes bring back a trusted party.
7. **Out of scope by nature:** whether Alice really owns "Rain" (vouching and law), and exclusive licences, which are not implemented and must stay out of v1.
8. **An LLM must never pick the amount or the use from offer text.** The agent code is structural and resisted injection, but a model wrapped around it could undo that.

## Where to look
- [`red-team-threat-model-2026-10-12.md`](red-team-threat-model-2026-10-12.md): assets, actors, trust boundaries, STRIDE and attack classes
- [`red-team-findings-2026-10-12.md`](red-team-findings-2026-10-12.md): every finding with severity, repro, fix and test IDs
- [`red-team-practicality-report-2026-10-12.md`](red-team-practicality-report-2026-10-12.md): timings, costs, load, recovery, developer experience
- [`red-team-spec-changes-2026-10-12.md`](red-team-spec-changes-2026-10-12.md): 20 changes the NIP and the design spec need
- Test code and raw results (`tests/audit/`, `scripts/audit/live.mts`, live and before/after test results, the x402 check output) were kept with the audited copy and are not included here.
