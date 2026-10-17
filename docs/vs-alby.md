# Licence Lab compared with Alby Sandbox

Date: 17 Oct 2026. Compared: Licence Lab (local build, commit below) and the public Alby Sandbox (sandbox.albylabs.com).
Method: both apps opened in headless Chrome at 1440×900. Alby screenshots are read-only: we only navigated and opened tabs, and created no wallets. Shots showing Alby with connected wallets come from an earlier research session (`/workspace/sandbox-research/screenshots`). No Alby source code was copied. Their repository has no licence, so we matched the look and behaviour only.

Side-by-side images are in `docs/compare/side-by-side/` (Alby on the left, Licence Lab on the right):

| # | View | File |
|---|---|---|
| 1 | Getting started | `side-by-side/1-getting-started.png` |
| 2 | Gating banner and party cards | `side-by-side/2-gating-and-parties.png` |
| 3 | Step cards after a run | `side-by-side/3-steps-after-run.png` |
| 4 | Flow diagram | `side-by-side/4-flow-diagram.png` |
| 5 | Balance chart | `side-by-side/5-balance-chart.png` |
| 6 | Code tab | `side-by-side/6-code-tab.png` |
| 7 | Production tab | `side-by-side/7-production-tab.png` |

## Feature by feature (scores out of 10)

| Area | Alby Sandbox | Licence Lab | Alby | Lab |
|---|---|---|---|---|
| Layout and navigation | Left sidebar with emoji items, grouped (402, Bitcoin Connect), links out | Same pattern. Five scenario groups, a red-team group, library, paper and help. Hash routes; works offline | 9 | 9 |
| Scenario breadth | 18 scenarios: payments, invoices, LNURL, 402 protocols, UI kits | 24 scenarios across 5 parts, plus 19 attacks | 8 | 9 |
| Header | Title, black complexity pill, 💡 popover, `<>` link to code | Same, plus a scenario and status pill and a "how it works" popover | 9 | 9 |
| Gating banner | Yellow "Connect all required wallets" | Yellow "Set up all the parties", with a one-click "Set up all (n)" | 9 | 9 |
| Party cards | Real NWC test wallet from a faucet, live balance, ≈ $ (live), lud16, ⋮ menu, "or paste connection secret" | Real Nostr key per party, simulated sats balance, ≈ $ at a fixed Lab rate (labelled), lud16, ⋮ menu, NWC budget bar for agents | 9 | 7 |
| Per-party action panels | Free-form inputs (amount, description, paste an invoice), separate panel per party | Guided step cards (2-column grid) with inputs where they matter, mono copy fields, traces, a mini 9-check strip and "sent to …" lines | 8 | 8 |
| Free play | Any order; paste any invoice | Steps run in order; inputs change outcomes (for example seconds > 240 fails check 5). The attack editor is the free-form part | 8 | 6 |
| Transaction log | Time, parties, amount, text, Clear | Same, plus a real/simulated badge per row and an expandable "code and data" per entry | 8 | 9 |
| Flow diagram | Lifelines with labelled arrows | Lifelines, coloured arrows by type (event, invoice, payment, preimage, anchor), failed arrows dashed red, balances under the avatars | 8 | 8 |
| Balance chart | Lines per wallet | Lines per party; "change since setup" or absolute; hover values | 8 | 8 |
| Code tab | Sub-nav (This Scenario, Getting Started, REPL, Basics, Payments …), snippet cards with Copy, syntax colours | Sub-nav with icons; "This scenario" shows the exact code that ran, with this run's values; 15 library snippets; Copy; syntax colours | 9 | 8 |
| REPL | In-app REPL | In-page REPL with `w` (the scenario world), `verify` and `events`, plus `window.lab` in the console | 8 | 8 |
| Example prompts | Prompts per scenario | Prompts per scenario, each ending with a test and screenshot instruction | 8 | 7 |
| Production tab | Test vs production wallets, recommended wallets | Real-vs-simulated table, empty Mutinynet recorded-proof slots, known open issues (A18, A12b, fiat lock), wallets to try | 8 | 8 |
| Getting started | 3 clean slides ("Meet Alice & Bob") | 3 slides with cover art and a playable demo of "Rain", the cast and a list of all scenarios | 9 | 8 |
| Real network | Real Lightning payments between faucet wallets | Real cryptography (signatures, BOLT11, OTS, verifyLicence); money, relays and blocks simulated, and labelled on every row | 10 | 5 |
| Verification and attacks | None | 9-check panel on every verification, a "Verify a bundle" page, and 19 attacks with a tamper editor, "re-sign as Mallory" and a score | — | 9 |
| Replay and sharing | None seen | Timeline scrubber and replay over log, flow, balance and inspect; share link that replays to step N | — | 8 |
| Inspect | None | JSON of every artefact, bundle tray with 7 slots, download bundle | — | 8 |
| Honesty labels | Test vs production explained | Every step and log row badged REAL CRYPTO / SIMULATED / HONEST LIMIT / OPEN ISSUE | 7 | 9 |
| Links out (skill, faucet, source, feedback) | Builder skill, NWC faucet, source, feedback, help | Library, paper and help (local). Skill planned | 9 | 5 |
| Mobile | Responsive | Hamburger sidebar, single-column cards (`screenshots/13-mobile-s3.png`) | 8 | 8 |
| Tests | Not visible | 53 unit and headless tests, plus a browser check that runs all 24 scenarios to the end | — | 9 |

Average over the shared areas (the rows where both have a score): Alby 8.5, Licence Lab 7.8. The lower Lab scores come from the deliberate Instant-mode choice (simulated money), guided steps, and no outside links yet. Licence Lab adds four areas Alby does not have: verification and attacks, replay, inspect, and tests.

## Gaps found and fixed in this pass

1. No ≈ $ line on party cards. Added, at a fixed Lab rate (1 BTC = $80,000), with a label saying it is not live.
2. Code had no syntax colours. Added a small highlighter with no dependencies.
3. No in-page REPL (console only). Added a REPL panel in Code → REPL.
4. Code sub-nav had no icons. Added icons.
5. The balance chart was unreadable when a large party (StreamCo, 2M sats) sat next to a small one. Added a "change since setup" mode, now the default.
6. Flow diagram showed "•" for the timestamp calendar. Added an "OTS calendar" party.
7. "Try A1 →" links wrapped in narrow columns. Fixed.

## Gaps still open

1. **Real money (Tier 1).** Alby runs real Lightning payments between faucet wallets. The Lab simulates money. Next: a Mutinynet tier with recorded runs filling the empty slots on the Production tab.
2. **Bring your own wallet or key.** Alby lets you paste an NWC secret. The Lab does not, on purpose (test keys only). It could take a test NWC string later, when Tier 1 exists.
3. **Free play between cards.** Alby lets you paste any invoice into any panel. Lab steps run in order; the free-form part is the attack editor and the Verify page.
4. **Outside links.** There is no agent skill, faucet, feedback link or public source yet. These come when the repo is pushed, which the user has not approved.
5. **Getting-started polish.** Alby's slides are cleaner and more centred. Ours are denser.
6. **Bundle size.** The build is about 660 kB (217 kB gzipped) in one chunk. It could be split per part.
7. **Protocol open issues found by the Lab** (not UI gaps): A18 shared hosted node; A12b new binding with a stolen key after a revocation; S21 fiat price lock.
