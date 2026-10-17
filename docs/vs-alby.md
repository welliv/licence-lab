# Licence Lab compared with Alby Sandbox

Updated 17 Oct 2026 (second pass: live test wallets, free play, new Getting Started, dark theme).
Compared: Licence Lab (local build) and the public Alby Sandbox (sandbox.albylabs.com), both opened in headless Chrome at 1440×900.

**How Alby was observed:** read-only, except that one fact-check created the two faucet wallets Alby's "Simple Invoice Payment" needs (Alice and Bob). No Alby source code was copied; their repository has no licence.

**Theme:** Licence Lab is now **dark by default**, with a light toggle in the sidebar. Alby is shown in its default light theme.

## Side-by-side images

All are in `docs/compare/side-by-side/`, with Alby on the left and Licence Lab on the right.

| # | View | File |
|---|---|---|
| 1 | Getting started, first slide | `1-getting-started.png` |
| 1b | Getting started, last slide | `1b-getting-started-last-slide.png` |
| 2 | Gating banner and party cards | `2-gating-and-parties.png` |
| 3 | Step cards after a run | `3-steps-after-run.png` |
| 4 | Flow diagram | `4-flow-diagram.png` |
| 5 | Balance chart | `5-balance-chart.png` |
| 6 | Code tab | `6-code-tab.png` |
| 7 | Production tab | `7-production-tab.png` |
| 8 | Real faucet wallets after a real payment | `8-live-wallets-real-payment.png` |
| 9 | Acting out of order: Alby's wallet error vs our guard | `9-free-play-guards.png` |

## Fact-check of the two earlier claims

### (a) "Alby's free play is looser than our in-order steps": TRUE

Observed in `scripts/alby-factcheck.mjs`, with shots `docs/compare/alby/fc-*.png`:

- **Before wallets:** each party card offers only "Create Test Wallet" and a "Connect" button, which stays disabled until a connection string is pasted.
- **After both wallets exist:** both parties' panels are live at the same time: Alice's "Create Invoice" and Bob's "Pay Invoice". Nothing enforces the story's order.
- **What gates an action:** only its own input field. "Pay Invoice" is disabled while the invoice field is empty. Typing any text, even `lnbc1garbage`, enables it. Pressing it sends the request to the wallet, which answers: "failed: Failed to decode bolt11 invoice…".
- **Passing data between panels:** when Alice creates an invoice, it is filled into Bob's field automatically ("→ Invoice sent to Bob"). After paying, the field clears and "Pay Invoice" is disabled again.
- **Other scenarios:** Lightning Address and Hold Invoice behave the same way.

**Patch.** Licence Lab steps are no longer locked:

- Every step card can be pressed at any time once the parties are set up.
- If something it needs is missing, the card shows a guard message, for example "Not yet: this needs step 4 ("Mia pays") first." When the library itself refuses, it shows "Refused: <the library's own reason>".
- Done steps have a "Do it again" link, so you can pay twice and see the payment record stop you.
- "Run all steps" still plays the story in order.
- On the Live page, every party's actions are available all the time, as in Alby.

**Tested.** `scripts/ui-check.mjs` presses S3 step 5 first and expects a guard message rather than an error.

### (b) "Alby's Getting Started slides are cleaner": TRUE

Shots: `docs/compare/alby/gs-slide-1.png` and `gs-after-slides.png`.

- **Alby:** three centred slides, one idea each. A large heading, large emoji characters, one or two short lines, a black "Next →" button and three small dots. The last slide reads "Try the first scenario →". Nothing else is on the page.
- **Ours before:** a card with art and text side by side, plus the whole cast and all 24 scenarios on the same page. Busier.

**Redesign:** three centred slides in the same structure:

1. "Meet Ava and "Rain"": cover, Ava, and a row of the buyers who join later, plus a demo player.
2. "One licence, six signed parts": six tiles.
3. "Explore real-world scenarios": 🚀, then "Try the first scenario →".

## Feature by feature (scores out of 10)

| Area | Alby Sandbox | Licence Lab | Alby | Lab |
|---|---|---|---|---|
| Layout and navigation | Sidebar with emoji items, groups, links out | Same pattern; adds Live test wallets, red team, library, paper and help | 9 | 9 |
| Scenario breadth | 18 scenarios | 24 scenarios, 19 attacks and a live tier | 8 | 9 |
| Header | Title, complexity pill, 💡, `<>` | Same, plus status pill and "how it works" | 9 | 9 |
| Gating banner | "Connect all required wallets" | "Set up all the parties" / "Create all (n)" | 9 | 9 |
| Party cards | Real faucet NWC wallet, live balance, ≈ $, lud16, ⋮, paste a connection secret | **Live tier: real faucet NWC wallets, real balances, lud16, top-up, ⋮ forget.** Instant tier: simulated sats with a labelled Lab ≈ $ rate. No pasting of your own wallet (see gaps) | 9 | 8 |
| Action panels | Free-form inputs; invoice handed across | Step cards with inputs, copy fields, traces and a mini 9-check strip; Live page panels per party | 8 | 8 |
| Free play | Any panel any time, gated only by its own field | Any step any time with guard messages and "Do it again"; Live page fully free | 8 | 8 |
| Transaction log | Time, parties, amount, text | Same, plus a real/simulated badge and expandable code and data | 8 | 9 |
| Flow diagram | Lifelines and arrows | Lifelines, coloured by type, failures dashed, balances under the avatars | 8 | 8 |
| Balance chart | Lines per wallet | Lines per party, "change since setup" or absolute | 8 | 8 |
| Code tab | Sub-nav, snippet cards, syntax colours | Sub-nav with icons, code that ran with this run's values, 15 snippets, colours | 9 | 8 |
| REPL | In-app | In-page REPL (`w`, `verify`, `events`) plus `window.lab` | 8 | 8 |
| Example prompts | Per scenario | Per scenario | 8 | 7 |
| Production tab | Test vs production, recommended wallets | Real-vs-simulated table (now includes the Live tier and Mutinynet reads), recorded-proof slots, open issues, wallets | 8 | 9 |
| Getting started | 3 clean slides | 3 clean slides in the same structure | 9 | 9 |
| Real network | Real NWC payments between faucet wallets. **The faucet says its "balances are not real and exist only inside the NWC Faucet".** | Same faucet, with real payments and preimages. Invoices commit description_hash to the request, and verifyLicence runs on the real preimage. Mutinynet is read for real; writing needs a login | 9 | 8 |
| Verification and attacks | None | 9-check panel, Verify page, 19 attacks, tamper editor, score | — | 9 |
| Replay and sharing | None seen | Timeline replay and share link | — | 8 |
| Inspect | None | JSON, bundle tray, download | — | 8 |
| Honesty labels | Test vs production | Every row badged; the faucet's catches shown at the top of the Live page | 7 | 9 |
| Links out | Skill, faucet, source, feedback, help | Library, paper and help (local); skill planned | 9 | 5 |
| Mobile | Responsive | Responsive (`screenshots/13-mobile-s3.png`) | 8 | 8 |
| Theme and contrast | Light (no theme toggle seen) | Dark by default plus a light toggle; all main text pairs pass WCAG AA (table below) | 8 | 9 |
| Tests | Not visible | 55 tests (+1 live test with `LIVE=1`), plus a browser check of all 24 scenarios, free play, Getting Started and the Live page | — | 9 |

**Average over the 20 shared rows:** Alby 8.35, Licence Lab 8.25. Last pass it was Alby 8.5 and Lab 7.8.

- **Alby moves from 10 to 9 on "Real network".** The fact-check found that its money is the same faucet-only dummy sats.
- **The Lab rises on:** party cards (+1), free play (+2), real network (+3), Getting Started (+1) and Production (+1), plus the new theme row.
- **Rows only the Lab has:** attacks, replay, inspect and tests.

### Dark theme contrast (WCAG, `scripts/contrast.mjs`)

| Pair | Ratio | Level |
|---|---|---|
| Body text on card | 16.3:1 | AA |
| Secondary text on card | 9.7:1 | AA |
| Muted text on card | 7.4:1 | AA |
| Faint text on card / page | 5.5:1 / 5.9:1 | AA |
| Primary button text | 16.3:1 | AA |
| Green / red / amber / orange text on their tints | 10.0 / 9.2 / 12.8 / 12.2 :1 | AA |
| Links on page | 11.6:1 | AA |

## Live test wallets: what is real

Evidence: `docs/live-evidence.json`, run at 10:15 EAT on 17 Oct 2026 (`npx tsx scripts/live-run.mts`), and the browser run in `screenshots/14-17`.

- **Wallets:** six faucet wallets (Ava, Mia, Jay, Nova, Lena, Scout), all on node `03b6b08e…2b430c`, network "mainnet".
- **Top-up:** Mia +300 sats through the faucet top-up API.
- **Invoice:** Ava's wallet made `lnbc1u1p4dxgyy…`. Its description_hash `dcd878fd…` equals the hash of Mia's exact HTTP request.
- **Payment:** Mia paid it with a real NWC `pay_invoice`. Preimage `df054973…68d9` hashes to payment hash `42b0e2b3…0b1b`. Balances moved from Mia 2,300 → 2,200 and Ava 200 → 300.
- **Paying twice:** refused by the payment record.
- **verifyLicence on the real preimage:** checks 1 and 3 pass, then it stops at check 2 (`binding_node_sig`), as expected on the faucet. Five payment facts are proven separately with the library's own functions: invoice node = binding node, description_hash commits to the request, amount, preimage, and clientCheck.
- **Payouts:** Ava paid Jay 20, Nova 15 and Lena 15 sats, for real.
- **Scout:** paid 100 sats inside a Lab-enforced budget. Its second buy was refused by the Lab daily cap (150).

**The faucet's catches, all shown in the UI:**

1. **One shared node.** It is the same for every faucet wallet, so check 2 can't tell artists apart. This is A18 for real.
2. **`sign_message` is RESTRICTED.** The node cannot co-sign the binding, so check 2 can't pass at all.
3. **Mainnet-format invoices** (`lnbc`). The request uses the mainnet network id to match. The sats are faucet-only.
4. **No NWC budgets.** `get_budget` returns `{}`, so budgets are enforced by the Lab.

**Safety:** the Lab only pays invoices whose payee is the faucet node, and never more than 5,000 sats at once. It never pays an outside invoice.

## Mutinynet

- **Reading: real, no login.** `MutinynetChain` implements the library's ChainOracle over mutinynet.com's public Esplora API: tip, block lookup, merkle roots, block times, OP_RETURN lookup, and a bounded OP_RETURN scan (it refuses more than 300 blocks rather than pretend). The Live page shows the live tip.
- **Writing: needs login.** OP_RETURN and OpenTimestamps need Mutinynet coins, and the Mutinynet faucet needs a GitHub device login. Its other route is a mainnet L402 payment, which the Lab never makes. Public OpenTimestamps calendars only stamp Bitcoin mainnet, so the path uses mll-audit's own otsd and the real OP-RETURN-Bot.
- **The path is built:** `scripts/mutinynet-anchor.mts` stops with "NEEDS LOGIN" until `~/.mutinynet/token` exists. Then it runs mll-audit's Mutinynet suite and checks each txid on public Mutinynet before listing it.
- **Status file:** `scripts/mutinynet-status.mjs` writes `public/mutinynet-status.json`. Today it reads: login needed, the local node, otsd and OP-RETURN-Bot are not running, and nothing is recorded.
- **What still needs the user:** build `mutinynet-cli` (its binary is no longer on the box), log in, and approve the GitHub device code.

## Gaps fixed

- **First pass (7):** ≈ $ line, syntax colours, in-page REPL, code nav icons, balance "change since setup", OTS calendar party, link wrapping.
- **This pass:**
  - Live faucet tier
  - free play with guards
  - "Do it again"
  - Getting Started redesign
  - dark theme by default with a light toggle
  - real Mutinynet reads
  - Mutinynet write path with a clear "needs login" state

## Gaps still open

1. **Check 2 on the faucet** cannot pass (no `sign_message`, shared node). It needs a wallet or node the artist controls; Mutinynet LND is ready once logged in.
2. **Bring your own wallet** (paste an NWC string) is left out on purpose. A real mainnet wallet could pay faucet invoices with real sats.
3. **Mutinynet writes** need the user's GitHub login.
4. **Outside links** (skill, feedback, public source) wait until the user approves a push.
5. **Bundle size:** about 705 kB (231 kB gzipped) in one chunk.
6. **Protocol open issues:** A18, A12b, S21 fiat lock.

## Music and file-hash binding (added)

Alby's sandbox has no audio. Licence Lab now plays the owner-supplied recordings in `public/music/`. Before a purchase you hear a 30 s preview. Once a licence verifies 9/9, or after a Live faucet payment, the full file plays. Every offer's `x` tag is the SHA-256 of the full original file. An extra check, shown after the nine, re-hashes the file bytes and compares them with `x`. The Verify page can also hash any audio file you pick. This is a lab-only addition: on a static site the full file is still publicly reachable. A real shop would gate it behind the licence.
