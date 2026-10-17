# Jobs audit: all 27 scenarios and the attacks

Branch `simple` (commit 741303a). Audit only: nothing in the app was changed.

> Names: the cast was later renamed to the usual crypto-example names (Ava → Alice, Mia → Bob, Jay → Carol, Nova → Dave, Lena → Erin, Kai → Frank, Sam → Grace, Scout → Bob's agent, Iris/Leo/Rosa → Heidi/Ivan/Judy, the observer → Eve). The text below uses the new names; the screenshots in `screenshots/jobs-audit/` still show the old ones.
Walked on 17 Oct 2026, about 16:00–17:00 EAT, on the preview at http://localhost:4180/ with headless Chrome, as a first-time user (fresh storage, "Set up all", "Run all steps", every scenario). Then read against the scenario and attack definitions in `src/scenarios/` and `src/engine/attacks.ts`.

## Headline verdict

The front door now works. Home and the four chapters tell one story in about a minute: hear "Rain", license it for 100 sats, see it proven, hear the full track. Behind that door, the 27 scenarios are still a laboratory, not a product. Every scenario page opens the same way: a "Set up all" gate, four to seven party cards that say "Nostr key + test wallet", eight tabs and an empty log. After a run, a page carries 600–1,300 words and 21–92 jargon terms. So the technology is real, but it is not invisible. The best ideas (a "License this" button, agents buying at scale, proof of AI training data, a remix that pays the original, rights that pass to heirs) are spread over 27 pages, when they should be five or six moments. Average score: **3.4 / 5**. The real crypto is strong (prototype quality 4.3); the hiding of jargon is weakest (invisible technology 2.7). The fix is not more features. Merge the 27 pages into 6 stops on one path, run the set-up for the user, give each stop one magic moment and one verdict, and put the rest under the hood.

## How it was walked

- Every scenario was opened cold and the first view was screenshotted. Then "Set up all" and "Run all steps" were clicked and the result was screenshotted (`screenshots/jobs-audit/sN-first-view.png`, `sN-after-run.png`).
- Counts were taken from the visible text: words, buttons, and jargon terms (`402`, `preimage`, `NWC`, `binding`, `OP_RETURN`, `kind`, `relay`, `node`, `NIP-`, `hash`, `invoice` and so on).
- Mobile was checked at 390 × 844 for S3, S11 and S24. There were 0 page errors on any page.

| Measure (first-time user) | Main path (Home + chapters) | Scenario pages (27) |
|---|---|---|
| Clicks before something happens | 1 | 2 (set up, then run) or 6+ (one card at a time) |
| People on screen | 1–3 | 4–7 cards |
| Words after the run | ~150–300 | 511–1,326 |
| Jargon terms after the run | ~0 on screen (all behind "Under the hood") | 21–92 (worst S3 92, S4 89, S11 68, S1 64) |
| Real vs simulated badges | one honest note | often more SIMULATED than REAL (S5 15:5, S14 16:3, S16 13:3, S23 12:3) |
| One verdict at the end | yes | no; it is spread over each step |

## Scorecard

Lenses, each scored 1–5:

- **Sim**: Simplicity
- **Q**: Question everything (does it need to exist?)
- **Exp**: Experience first
- **Inv**: Invisible technology
- **Del**: Delight or magic moment
- **Det**: Details
- **Fut**: Show the future
- **Int**: Integration with the main story
- **No**: Say no (how well it earns its place)
- **Proto**: Prototype quality (real or a drawing)

Overall is the plain mean.

| # | Scenario | Sim | Q | Exp | Inv | Del | Det | Fut | Int | No | Proto | Overall | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Alice onboards with Echo | 2 | 3 | 2 | 1 | 2 | 2 | 3 | 3 | 3 | 4 | **2.5** | MERGE into Artist sells (setup runs silently) |
| S2 | Release "Rain" with Carol, Dave, Erin | 3 | 4 | 3 | 2 | 3 | 3 | 3 | 4 | 4 | 5 | **3.4** | KEEP (core of Artist sells) |
| S3 | Bob licenses by hand | 3 | 5 | 4 | 1 | 4 | 3 | 3 | 4 | 5 | 5 | **3.7** | KEEP (it is the Home flow) |
| S4 | Bob's agent buys automatically | 3 | 5 | 4 | 1 | 4 | 2 | 5 | 4 | 5 | 5 | **3.8** | KEEP (core of Agents buy) |
| S5 | StreamCo licenses at scale | 3 | 4 | 4 | 3 | 4 | 3 | 5 | 4 | 4 | 4 | **3.8** | MERGE into Agents buy (scale beat) |
| S6 | ModelCo trains, a regulator checks | 4 | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 5 | 5 | **4.4** | KEEP (core of Anyone verifies) |
| S7 | Grace the fan | 4 | 2 | 4 | 2 | 3 | 3 | 3 | 2 | 2 | 3 | **2.8** | UNDER THE HOOD (fans, not licensing) |
| S8 | Frank's remix pays the original | 4 | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 5 | **4.2** | KEEP (core of Everyone gets paid) |
| S9 | Sync for a game | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | **3.1** | UNDER THE HOOD (custom deals) |
| S10 | A price change | 4 | 3 | 3 | 3 | 2 | 4 | 2 | 4 | 3 | 5 | **3.3** | MERGE with S23 under the hood ("Change your offer") |
| S11 | Revocation and a stolen key | 2 | 5 | 3 | 2 | 4 | 2 | 3 | 4 | 4 | 5 | **3.4** | MERGE: stolen-key half into Rights change hands; revocation half under the hood |
| S12 | A thief, "Alice Official" | 4 | 5 | 5 | 3 | 4 | 4 | 4 | 4 | 4 | 5 | **4.2** | MERGE into Anyone verifies (fake-copy beat) |
| S13 | Carol finds under-reporting | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 4 | **3.3** | MERGE into Everyone gets paid |
| S14 | Four payment worries | 2 | 4 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 4 | **3.0** | MERGE with S16 + S17 under the hood ("When things go wrong") |
| S15 | Prompt injection | 4 | 5 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | 5 | **4.3** | MERGE into Agents buy (safety beat) |
| S16 | Relay or node down | 3 | 3 | 2 | 1 | 2 | 3 | 2 | 3 | 2 | 3 | **2.4** | UNDER THE HOOD (When things go wrong) |
| S17 | Refund | 4 | 3 | 4 | 4 | 2 | 3 | 2 | 3 | 2 | 3 | **3.0** | UNDER THE HOOD (When things go wrong) |
| S18 | A label with "Dawn" | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 4 | **2.9** | MERGE into Artist sells as one line ("labels work the same way") |
| S19 | A "License this" button | 4 | 5 | 5 | 4 | 4 | 4 | 4 | 5 | 5 | 5 | **4.5** | KEEP (opens Anyone verifies) |
| S20 | Privacy with fresh keys | 3 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 5 | **3.5** | UNDER THE HOOD |
| S21 | Fiat pricing | 3 | 3 | 4 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | **2.8** | UNDER THE HOOD (open question) |
| S22 | A cross-border sale | 4 | 2 | 3 | 4 | 1 | 3 | 2 | 3 | 1 | 4 | **2.7** | CUT (one territory line in Artist sells) |
| S23 | An exclusive request | 3 | 2 | 3 | 4 | 2 | 3 | 2 | 3 | 2 | 3 | **2.7** | UNDER THE HOOD (not in v1; merge with S10) |
| S24 | Infrastructure operators | 2 | 3 | 1 | 1 | 2 | 3 | 3 | 3 | 3 | 4 | **2.5** | UNDER THE HOOD (for operators) |
| S25 | Rights are sold | 4 | 5 | 4 | 3 | 4 | 4 | 5 | 5 | 5 | 5 | **4.4** | KEEP (core of Rights change hands) |
| S26 | Planned succession | 4 | 5 | 5 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | **4.5** | MERGE into Rights change hands (second beat) |
| S27 | Estate with no plan | 4 | 4 | 4 | 4 | 2 | 4 | 3 | 4 | 3 | 4 | **3.6** | UNDER THE HOOD (honest limit, linked from Rights change hands) |
| — | Red team (24 attacks) | 3 | 4 | 3 | 2 | 4 | 3 | 3 | 3 | 4 | 5 | **3.4** | UNDER THE HOOD; 3 attacks surface on the main path |
| | **Average (27)** | 3.3 | 3.8 | 3.5 | 2.7 | 3.1 | 3.3 | 3.4 | 3.6 | 3.3 | 4.3 | **3.43** | |

**Summary**

- **Average: 3.43.** By lens:
  - Simplicity 3.3
  - Question 3.8
  - Experience 3.5
  - Invisible technology **2.7** (lowest)
  - Delight 3.1
  - Details 3.3
  - Future 3.4
  - Integration 3.6
  - Say no 3.3
  - Prototype **4.3** (highest)
- **Best 3:**
  - S19 "License this" button (4.5)
  - S26 planned succession (4.5)
  - S6 AI training proof (4.4); S25 rights sale is level with it at 4.4
- **Worst 3:**
  - S16 relay or node down (2.4)
  - S24 infrastructure operators (2.5)
  - S1 onboarding (2.5)
- **Verdicts:**
  - 7 KEEP: S2, S3, S4, S6, S8, S19, S25
  - 10 MERGE: S1, S5, S11, S12, S13, S14, S15, S18, S26, and S10 (merged with S23 under the hood)
  - 9 UNDER THE HOOD
  - 1 CUT: S22

### Notes behind the scores (short)

- **S3, S4: the right idea, the wrong words.** They are the two core purchases, and the jargon is worst here.
  - S3 has 92 jargon terms. A step is titled "402 with invoice", and the page shows `preimage` seven times, "description hash" and an `lntbs…` invoice.
  - S4 has 89. It shows raw field keys (`max_amount`, `renewal`, `request_methods`), "wrapper kind 1059" and "HTTP 402 / x402".
  - A buyer needs only "Bob's agent asked, Alice's shop sent a bill, Bob's agent checked it and paid".
- **S1 says one thing and shows another.** The subtitle says "She never sees the word 'Nostr'". The same page shows "Nostr key + test wallet" on every card and "Nostr key inside a remote signer (NIP-46)" in step 2. It also opens with keys, nodes, a binding and a vouch, which is set-up, not story.
- **S11 has two kinds of detail bug.**
  - Its step labels "A1., A2., B1." clash with the attack ids A1, A2 on the red-team page.
  - Step 1 says "Live Mutinynet anchor: recorded-proof slot, not yet filled", but real Mutinynet proofs now exist (`public/mutinynet-status.json`). S2's timestamp step has the same stale line.
- **S5 is scale without wow.** It is the best "future" idea, an agent licensing at volume with one Bitcoin timestamp, but it ends as a CSV and a sample table. There is no counter and no "1,000 licences, one proof" moment.
- **S6, S19, S25, S26 already feel like products.**
  - S6: a regulator checks training data in one go.
  - S19: one button on a video site.
  - S25: the buyer of the rights is paid from the next sale.
  - S26: two of three heirs sign and the music keeps paying.
  - These are the moments that make the idea land.
- **S8 is the hidden delight.** One payment fans out 70/30 to the original. The split should be shown as money moving, not only as text.
- **S7, S21, S22, S23 fail "say no".**
  - S7: zaps and badges are about fans, not licences.
  - S21: fiat is an open question.
  - S22: territory is one field.
  - S23: exclusives are not in v1.
  - They make the list longer without making the idea clearer.
- **S14, S16, S17 are plumbing.** They matter to engineers, but each is mostly SIMULATED, and S16 says "relay" 13 times and "node" 12 times. Together they make one honest "When things go wrong" page under the hood.
- **S24 is for operators only.** It has 44 jargon terms, and its first step is "Pay an OP_RETURN service".
- **Money and cast do not line up.**
  - The story uses 100 sats; the scenarios use 2,000 sats per licence.
  - The cast changes between pages: Bob buys on Home, Bob's agent in chapter 2, and StreamCo, ModelCo, Frank and Grace in the scenarios.
  - "Dave" is the featured singer in "Rain" and also the label artist with "Dawn" in S18.
  - A newcomer cannot tell it is one world.

### The attacks (red-team page)

Scored as one row above (3.4). The engine is honest. Every one of the 24 attacks runs against the real verifier, and 3 open issues and 4 limits are shown openly (A12b, A18; A13, A14, A16, plus the S27 and court limits). The page still reads like a test report:

- The list is ordered by id, with gaps that look like errors (no A19, then A12b and A12c).
- Each card shows "level N" and gives the answer before you try ("Expected: blocked by check 6").
- Titles use words such as preimage, NWC cap and binding.
- "0/24 tried" frames it as homework.

**Verdict:** keep it under the hood. Group the attacks by what they protect (your money, your song, your agent, your rights). Hide the expected result until after the run. Surface only three on the main path:

- the forged price (A1/A3) in Anyone verifies;
- the prompt injection (A7) in Agents buy;
- the old-key offer (A23) in Rights change hands.

## Top 10 fixes, ranked by impact on "the idea hits home"

1. **Turn 27 pages into 6 stops on one path** (see the final set below). Each chapter becomes the one merged scenario behind it, with a "Next" at the end. The scenario list moves under the hood. *Lenses: Int, No, Sim.*
2. **Delete the set-up gate.** Parties set themselves up when a page opens, steps come first, and the 4–7 cards shrink to a one-line cast strip. Today a newcomer meets a yellow "Set up all (5)" bar and up to six "Create test party" buttons before any story. On mobile the first step is two screens down. *Exp, Sim.*
3. **Plain words on every step title, result line and button.** Kind numbers, raw field keys, MLR2 payloads, "402", "NWC", "preimage", "binding" and "OP_RETURN" move into each step's code drawer. Target: under 10 jargon terms per page after the run (today 21–92). *Inv.*
4. **One verdict and one magic moment per stop.** End every stop with a single card ("Licensed ✓ Proven", "Paid ✓ Split to 4 people", "Fake ✗ Caught", "Rights passed ✓ Still paying"). Each stop gets one moment you can feel: the full track unlocks, money visibly fans out, a counter runs to 1,000 licences under one proof, the heirs' signatures click in. *Del, Exp.*
5. **Show the future on the main path.** Chapter 2 buys one licence. It should end with S5's scale ("Bob's agent licensed 1,000 tracks in X seconds; one Bitcoin timestamp proves them all"), and chapter 3 should include S6's regulator check. This is what makes it "any agent", not "one shopper". *Fut.*
6. **Fix honesty and stale copy.**
   - Remove "recorded-proof slot, not yet filled" from S2 and S11 and link the real Mutinynet run.
   - Fix S1's "never sees the word Nostr" claim, or hide the word.
   - Use one price (100 sats) everywhere.
   - Put the "practice chain" note right beside "Proven on Bitcoin", not further down.

   *Det, Proto.*
7. **One world, one cast.** Alice, Rain, Bob (person), Bob's agent, the co-owners, and Harbour and the heirs for rights. Rename the S18 label artist so there are not two Daves. Drop casts the main path does not need: Grace, Echo as a separate onboarding agent, HostCo, Indexes, Relays. *Int, Sim.*
8. **Calm the scenario page.** Cut eight tabs to three (What happened, Nine checks, Code). Open on "What happened", not on an empty "No entries yet" log. Remove the "Nostr key + test wallet" line from cards. Shrink the mini player on mobile; it takes about a fifth of the screen. *Det, Sim.*
9. **Say no to four scenarios and fold three.**
   - Cut S22 (one territory line in Artist sells).
   - Move S7, S21 and S23 under the hood.
   - Fold S14, S16 and S17 into one "When things go wrong" page.
   - Fold S10 into "Change your offer".
   - Fold S18 into one line ("labels work the same way").

   *No, Q.*
10. **Rewrite the red-team page for players.**
    - Group the attacks by what they protect.
    - Use plain titles ("Sell a fake copy of Rain").
    - Show the outcome only after the try.
    - Renumber so there are no gaps.
    - Lift A1, A7 and A23 into their chapters as "Try to cheat" buttons.

    *Del, Inv, Det.*

## Proposed final scenario set

**Main path: 6 stops, about 3 minutes in all.**

| Stop | Built from | Magic moment | One verdict |
|---|---|---|---|
| 0. Hear it, license it (Home) | S3 | Preview stops, 100 sats, full track plays | "Licensed ✓ Proven on Bitcoin" |
| 1. Artist sells | S2, with S1 run silently, plus one line each from S18 (labels) and S22 (territory) | Change one byte of the audio and the offer no longer matches | "On sale ✓ Signed by Alice and her co-owners" |
| 2. Agents buy | S4 + S5 + S15 | Bob's agent refuses a poisoned prompt, then a counter runs to 1,000 licences under one timestamp | "1,000 licences ✓ inside budget" |
| 3. Everyone gets paid | S8 + S13 (+ the split from S3) | One payment visibly fans out to Alice, Carol, Dave, Erin and the remix original | "Paid ✓ 4 people, at once" |
| 4. Anyone verifies | S19 + S6 + S12 | A "License this" button on a video, a regulator checks training data, "Alice Official" is caught | "Real ✓ / Fake ✗" |
| 5. Rights change hands | S25 + S26 + the stolen-key half of S11 (S27 as a linked limit) | Two of three heirs sign; an old stolen key's offer fails | "Rights passed ✓ Still paying" |

**Under the hood (grouped, not numbered 1–27):**

- *Getting set up:* S1 in full.
- *Changing your offer:* S10, S23, and the revocation half of S11.
- *When things go wrong:* S14, S16, S17.
- *Deals and money:* S9, S21.
- *Privacy:* S20.
- *Fans:* S7.
- *Running the network:* S24.
- *Honest limits:* S27, plus the open and limit attacks.
- *Try to break it:* all 24 attacks.

**Cut:** S22, as a page (it becomes one line).

This keeps all 27 behaviours and all tests. It removes 21 entries from the main path and leaves 6.

## Worst offenders (screenshots)

All files are under `screenshots/jobs-audit/`.

| Problem | Screenshot |
|---|---|
| The set-up gate: a yellow bar, 5 cards, "Create test party", an empty log, 8 tabs before any story | `s3-first-view.png` |
| The same on mobile: no step visible in the first screen | `worst-mobile-s3-gate.png`, `mobile-s3.png` |
| "402 with invoice", "HTTP 402 / x402", `lntbs…`, preimage, raw `max_amount`/`request_methods` keys | `worst-s4-402-and-raw-fields.png`, `s4-after-run.png` |
| The subtitle says "never sees the word Nostr" over cards and steps that say Nostr and NIP-46 | `worst-s1-never-sees-nostr.png` |
| Stale "recorded-proof slot, not yet filled"; the "A1." step label clashes with attack A1 | `worst-s11-stale-copy-and-A1-label.png`, `s11-after-run.png` |
| Scale shown as a table, not a moment | `worst-s5-scale-without-wow.png` |
| Plumbing on the surface: relays, nodes, outages, mostly simulated | `worst-s16-plumbing.png` |
| An operator's page in the main list: "Pay an OP_RETURN service" | `s24-first-view.png` |
| Red team as a test report: levels, "Expected: blocked by check N", 0/24 | `worst-redteam-index.png`, `redteam-index.png` |
| Mobile density on the long pages | `mobile-s11.png`, `mobile-s24.png` |

All 27 first views and after-run views are there as well, for side-by-side review (`s1-first-view.png` … `s27-after-run.png`).

---

# After: the rebuilt main path

Branch `simple`, after the rebuild (the commit after 8e92014). Walked on 17 Oct 2026, about 17:00–17:30 EAT. Headless Chrome on the box against `vite preview` at http://localhost:4180/. The "before" build (741303a) was served at :4190 and measured with the same script, `scripts/main-path-metrics.mjs`. The raw numbers are in `docs/metrics-before.json` and `docs/metrics-after.json`. Screenshots are in `screenshots/main-path/`.

## What changed

- **Home** has one headline and one tap: "I make music / I buy music / I build". The choice sets the order of the stops (artist 1-2-3, buyer 2-1-3, builder 3-1-2), is remembered, and can be changed ("Seen as" in the header, or Home).
- **Three stops plus one extra**, each with one magic moment, one verdict card, one "Try to cheat" and a "Next" button:
  - **Stop 1, Hear it, license it** (S3 + S2 + S8/S13): the preview stops, you license for 100 sats, the full track plays, and the 100 sats visibly split 65 / 20 / 15 to Alice, Carol and Dave. To cheat, change the price or one byte of the song, and the offer breaks.
  - **Stop 2, Agents buy at scale** (S4, S5, S15): Bob's agent buys inside ClipAI's budget, then refuses a poisoned offer asking for 500,000 sats. Then a live counter buys 1,000 licences under one Bitcoin timestamp, with 20 picked at random and re-checked from scratch, and the budget bar shown.
  - **Stop 3, Anyone verifies** (S19, S6, S12): a "License this" button on a video gives one verdict. Then the regulator's AI-training check, and the fake "Alice Official" caught. The real Mutinynet proof link sits next to "Proven on Bitcoin", with the practice-chain note beside it.
  - **Extra, Rights change hands** (S25, S26, the stolen-key half of S11): offered after stop 3, never forced. Old licences stay valid, the old account can't sell (the A23 cheat), 2 of 3 heirs sign, and a stolen key is retired. S27 is linked as the honest limit.
- **No set-up gate anywhere.** Scenario pages set everyone up silently. A cast strip replaces the party cards.
- **Calmer scenario pages:** 3 tabs (What happened, Nine checks, Code), opening on What happened. The diagram, balances, signed events, prompts and the real-vs-simulated list are folded inside them.
- **Under the hood** has 9 groups: Getting set up, Deals and money, Changing your offer, When things go wrong, Privacy, Fans, Running the network, Honest limits, Try to break it. Badges show which stop uses each scenario. S22 is one line with a "see it run" link. All 27 behaviours and their tests are kept.
- **Red team as a game:** grouped by what it protects (your song, your money, your agent, your rights, the record). Plain titles, numbered 1–24 with no gaps, the result shown only after you try, and a score.
- **One cast, one price:** 100 sats everywhere on the main path. Dave is one person (S18 now uses his song "Northern Lights"). Helper parties are off the main path.
- **Stale copy fixed:** the S1 "never sees the word Nostr" clash, the "not yet filled" Mutinynet lines in S2 and S11, and the "A1./B1." step labels. About 34 step titles were made plain.
- **Smaller mobile player.**
- **User-test kit:** `docs/user-test-script.md`, plus a local-only timer shown only with `?test=1`. It records time to first licence and stop times to localStorage, with an Export button. There are no analytics and no network calls.

## Scores: the same 10 lenses

Before: the old Home + chapters (741303a) were scored now with the same walk; they were not a row in the first audit. The source-scenario averages are from the scorecard above.

| Page | Sim | Q | Exp | Inv | Del | Det | Fut | Int | No | Proto | Overall | Before |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home (one tap, three personas) | 5 | 5 | 5 | 5 | 3 | 4 | 4 | 5 | 5 | 4 | **4.5** | old Home + chapters 3.6 |
| Stop 1 Hear it, license it | 4 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 4 | 5 | **4.5** | S3 3.7, S2 3.4, S8 4.2, S13 3.3 (mean 3.65) |
| Stop 2 Agents buy at scale | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 5 | 5 | 5 | **4.7** | S4 3.8, S5 3.8, S15 4.3 (mean 3.97) |
| Stop 3 Anyone verifies | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 4 | 5 | **4.5** | S19 4.5, S6 4.4, S12 4.2 (mean 4.37) |
| Extra Rights change hands | 4 | 4 | 4 | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.3** | S25 4.4, S26 4.5, S11 3.4 (mean 4.1) |
| **Main path average** | 4.4 | 4.8 | 4.6 | 4.4 | 4.2 | 4.0 | 4.6 | 4.8 | 4.4 | 4.8 | **4.50** | 3.43 (all 27) / 3.6 (old main path) |
| Under the hood (groups + calm pages) | 4 | 4 | 3 | 3 | 3 | 4 | 3 | 4 | 4 | 5 | **3.7** | — |
| Red-team game | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 5 | **3.8** | 3.4 |

Why not higher:

- Stop 2 still has three beats on one page, though it is now 148 words (it was 276).
- The rights extra has one "Show what happens" button that plays the three beats, plus the one cheat (at most 3 buttons on screen at once, 2 after the cheat). It is still three small worlds.
- Home's delight is only the choice itself.
- Attack pages still show the nine technical checks once you open them. That is fine under the hood, but it is not invisible.

## Measured, headless

Time to first licence is measured from navigation start to the verdict appearing, with scripted taps and no reading time. Same machine, same script.

| | Taps | Time to first licence |
|---|---|---|
| Before: Home (hear → license) | 2 | 1.84 s |
| After: artist (persona → hear → license) | 3 | 1.37 s (the in-app timer recorded 1.49–1.53 s) |
| After: buyer (persona → "Let Bob's agent buy") | 2 | 0.38 s |
| After: builder (persona → "Check the licence") | 2 | 0.45 s |

1,000 licences in stop 2 took 3.0 s in this run (2.3–3.2 s across runs) inside a 150,000-sat budget, and 20 of 20 random re-checks passed.

Jargon is counted case-insensitively on visible text, with the code drawer left out. The terms are Nostr, relay, node, NIP-n, kind n, 402, x402, preimage, NWC, binding, OP_RETURN, OpenTimestamps, invoice, hash, BOLT11, lntbs…, secp256k1, merkle, npub, Mutinynet, signature, verifyLicence, bundle, event id, description hash, SHA-256.

| Page, after every button is pressed | Words | Jargon | Terms left |
|---|---|---|---|
| Home | 77 | 0 | — |
| Stop 1 | 284 | 2 | Mutinynet, signature |
| Stop 2 | 148 | 0 | — |
| Stop 3 | 303 | 1 | Mutinynet (12 more inside the builder's open code drawer) |
| Extra: rights | 226 | 0 | — (2 buttons) |
| Before: old Home / c1 / c2 / c3 / c4 | 95 / 83 / 138 / 85 / 134 | 1 / 0 / 0 / 0 / 0 | Mutinynet |

So every main-path page is under the 10-term target. The stops carry more words than the old chapters, because each one now holds 3–4 scenarios' worth of story.

Scenario pages after "Run all steps", for all 27:

- Jargon fell from an average of **27.3 to 14.8** per page (worst page: S3, 61 → 50; S1 54 → 39; S4 53 → 37; S16 51 → 35).
- Words fell from 837 to 767.
- These counts use the term list above, which differs a little from the first audit's hand count, so compare before with after, not with the 21–92 range quoted earlier.

## Next

Run `docs/user-test-script.md` with 5 artists, 5 buyers and 5 builders. Machine timings show the path is fast; only people can show whether the idea lands.

### Update: names and the two weak spots

Done later on 17 Oct 2026 (about 17:40–18:00 EAT):

- The cast now uses the usual crypto-example names (see the note at the top).
- Stop 2 was cut from 276 to 148 words.
- The rights extra went from 9 buttons to at most 3 on screen; 2 remain after the cheat. A single "Show what happens" button plays the three beats; the extra's verdict cards no longer have their own "9 checks" toggles; the links are plain links.

The scores and measurements above already include this update; the screenshots in `screenshots/main-path/` were retaken.
