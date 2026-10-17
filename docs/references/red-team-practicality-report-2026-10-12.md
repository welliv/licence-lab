# Practicality report

All numbers come from a local **regtest** network: bitcoind 31.1, four LND 0.21.4 nodes (Ava, Sam, Jay, OP_RETURN-Bot stand-in), Ben's `nostr-wallet-connect-lnd` bridge and a local relay, all on one machine. Raw data: `live-results.json`, `net-audit/live.log`. Regtest has no real routing, mempool or block interval, so treat latency as a **lower bound** and fees as mainnet estimates.

## 1. Artist publishing
| Step | Who | Time (measured) |
|---|---|---|
| 1. Node signs the binding message (LND `signmessage`) | Ava's node | 67 ms |
| 2. Ava's key signs binding and offer | Ava | 14 ms |
| 3. Jay signs consent | Jay | 5 ms |
| 4. Self-check (`checkDeal`) | agent | 39 ms |
| 5. Publish 3 events to a relay | agent | 27 ms |
| **Total** | | **≈150 ms machine time; 3 signatures (2 people) + 1 node signature; 2.4 KB on relays** |

The real cost is human: Jay must be reachable to consent, and Ava must run, or rent, a Lightning node that is always online with inbound liquidity and a public HTTPS endpoint. That is the main practical barrier for independent artists, not the protocol.

## 2. Per-sale latency and cost
| Metric | Result |
|---|---|
| 1,000 sequential purchases (challenge → NWC pay → settle), real payments | **1,000/1,000 ok**, 196 s, **5.1 sales/s** |
| Latency per sale p50 / p95 / p99 / max | **195 / 231 / 265 / 360 ms** |
| 50 concurrent purchases | **50/50 ok**, 6.0 s wall, p50 3.7 s, p95 5.1 s (requests queue up, probably on LND invoice writes and NWC round trips; about 8 sales/s overall) |
| Co-owner payouts after load | 1,050 keysends to Jay, **0 failed**, 15,000 msat each (30% of 50 sats) |
| Lightning routing fee | 0 sats here (direct channel). On mainnet expect roughly 0–10 sats for a small payment over 1–3 hops; the agent now reserves max(1 sat, 1%) for it |
| Verify a bundle without the chain (checks 1–7) | 11 ms each |
| Full verify (9 checks) with bitcoind at height 263 | 496 ms cold, 200 ms cached. On mainnet a full-chain scan for check 9 is impractical without an index or the `status` record |

## 3. Anchoring cost per licence
| Route | Cost | Time to proof | Trust |
|---|---|---|---|
| OpenTimestamps (paper default) | **0 sats** | hours (calendar aggregation, then upgrade) | Calendars can delay but cannot forge; **this code cannot yet verify a completed OTS proof (F-18)** |
| Own OP_RETURN | 169 vB: **338 sats at 2 sat/vB, 3,380 at 20 sat/vB** | next block (~10 min mainnet) | None beyond the chain |
| OP_RETURN-Bot style (pay an invoice) | **2,981 sats** (bot's price formula at 2 sat/vB) | next block | Operator can delay or skip; the client checks the invoice commits to the message |

A 50-sat licence anchored on chain costs 7 to 60 times its price. So OTS, or batching many licence digests into one Merkle root per block, is the only viable default for small licences. OP_RETURN is for revocations and high-value licences.

## 4. Failure recovery (live)
| Scenario | Result |
|---|---|
| Seller dies after the buyer paid, before settlement | After restart, the agent settles with the **same** payment; 1 payment, status 200 (L10a; needed fix F-26) |
| Relay dies during `pay_invoice` | No double payment; after relay and bridge restart the agent recovers the licence (L10b). *In this run the wallet's reply beat the relay shutdown, so the "lost reply" branch was covered by unit test I13 and L10c rather than here.* |
| Artist LND killed mid-payment (SIGKILL) and restarted | The agent marked the payment unresolved, "will not pay again". After the node came back (≈20 s) the retry looked it up, found it settled and completed the licence: **1 invoice settled**, status 200 (L10c) |
| Relay offline | Existing licences still verify fully from chain data (L10d) |
| Stale keep-alive connection reset | Used to fail the purchase; now retried safely (F-27) |

## 5. Wallet-side budget under attack (Ben's NWC bridge)
40 concurrent 4,000-sat payments against a 100,000 sat/day limit: exactly 25 settled (100,000 sats), the rest got `QUOTA_EXCEEDED`. A 6,000-sat payment above the 5,000 per-payment cap was refused, and an any-amount invoice was refused. **The wallet budget is the real backstop and it held.**

## 6. Developer experience
- **Verify a licence in an app: 8 lines** (`examples/verify-in-app.ts`): import, chain client, `verifyLicence(bundle, chain, { requireAnchor: true })`, return ok or the reason.
- Selling: `new Seller({...}).add(listing).start(port)`, about 10 lines plus an LND macaroon.
- Buying: `new BuyerAgent(key, nwc, budget, dir, network).buy(listing, use, notBefore)`, about 6 lines plus an NWC URI.
- Library size: about 700 lines of TypeScript, 6 small dependencies. Ben's `x402-ln check` gives **44 passed, 0 failed** (one expected warning: regtest network id).
- Friction points: the caller must supply a recent block hash (`not-before`), so it needs chain access. Check 9 needs a full node. The use-scope grammar (`max-seconds=60`, positional fields) is easy to get wrong without presets.

## 7. Verdict on practicality
For a buyer and seller online at the same time, it is fast (≈0.2 s per sale), cheap (Lightning fee only) and recovers cleanly from crashes. It is **not yet practical** for (a) full verification on mainnet without an index (check 9), (b) OTS-anchored licences until OTS verification is implemented, and (c) artists who cannot run a node; that needs a hosted node or LSP model, which reintroduces a trusted party.
