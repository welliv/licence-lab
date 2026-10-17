> Published copy for reference. This audit was run on the /next/ build of Licence Lab as it stood on 17 October 2026. That build is now the demo at https://welliv.github.io/licence-lab/, and /next/ links redirect there. Scripts, raw results and screenshots it mentions were kept by the auditor and are not included. Times are UTC+3.

# Licence Lab /next/ — vision audit (17 Oct 2026, ~20:25–20:35 UTC+3)

Live site: https://welliv.github.io/licence-lab/next/ (main = local `simple` 33c2cc6). Audit only: no code changed, nothing pushed, no PRs touched.
Method: headless Playwright (Chrome) on the live site, fresh (`?fresh=1`, cleared storage, dark mode), 1440px and 390px. Raw numbers in `results.json` and `alby.json`; scripts `audit.mjs`, `own.mjs`, `v.mjs`, `alby.mjs`, `alby2.mjs`. No console errors on any page.

## Verdict: competent. Stop 1 is close to magical. Not exceptional yet.

| | Score | Why |
|---|---|---|
| Vision coverage | **2/5** | No personal-use licence and no subscriptions anywhere. Companies and seller agents only appear under the hood. |
| Simplicity | **4/5** on Stop 1, **3/5** across the path | 2 taps, about 9 s, dollars, no jargon on Stop 1. Stops 2 and 3 add cheats, a regulator, a placeholder video and more text. |
| Understandability | **3/5** | Money moving is clear. What the licence lets you do, who the agent is and what "proof on Bitcoin" means are not. |
| Usefulness | **2/5** | No one leaves with a next step: no "list your song", no "connect your agent", no GitHub or SDK link. |

## 1. Coverage matrix (strict: text alone does not count)

Key: **MAIN** = Stops 1–3 or Extra · **HOOD** = scenarios or red team only · **NONE** = not covered. LIVE = run on the live site.

| Need → / Party ↓ | Personal licence | Enterprise licence | Subscription | Selling | Verifying |
|---|---|---|---|---|---|
| **Individual** (fan, YouTuber/TikToker, indie game dev) | **NONE.** No personal-use type exists (offer uses: creator-video, advert, ai-training, podcast, sync, remix). Grace the fan (S7) only tips. | Creator: **MAIN**, Stop 1 "Hear it, license it". LIVE with **real test money**: Rain 100 test sats reached Alice's test wallet in 2.7 s; Night Shift 120 test sats reached Carol's. The screen never says what the licence allows ("$5.00 a licence"). Game dev: **HOOD**, S9 "Sync for a game" (status "later", money simulated). | **NONE.** S7 says "Subscriptions… later". | **HOOD-ish.** "Put up your own song" sits inside Stop 1's "See the proof" panel. It works LIVE (real 100 test sats) but is shown in sats and jargon, the money goes to "Alice" rather than you, the song stays in the browser, ownership is unverified, and you can't set the price. On the main path the artist never sets a price, a share or an allowed use. | **MAIN**, Stop 3 "Anyone verifies" (practice chain). **HOOD**, Verify page: the real Mutinynet licence verifies LIVE, 10/10 with owner verified, in 1.5 s (shot 21). |
| **Company** (StreamCo, ClipAI, ModelCo, Harbour Music) | n/a | **HOOD**: S5 "StreamCo licenses at scale" and S6 "ModelCo trains, a regulator checks" (both run, money simulated). **MAIN (secondary)**: Stop 3 "Check ModelCo's proof" button. ClipAI appears only in Stop 2's code drawer. Stop 2's $7,500/day buyer is "Bob's agent", not a company. | **NONE.** No catalogue plan, blanket licence or monthly plan. StreamCo pays per post. | **HOOD**: S18 "A label joins with its artists" ("later"). **MAIN, Extra**: Harbour Music buys the *rights* to Rain, which is not a catalogue sale or subscription. | **MAIN**, Stop 3 (video site). **HOOD**: S19 "License this button", S6 regulator. |
| **Agent** (buyer, seller, small creator agent) | NONE (no personal type) | Buyer agent: **MAIN**, Stop 2 "Agents buy at scale" (1,000 licences in about 2.4 s, budget bar, poisoned-offer cheat; money simulated). Stop 1 "Let Bob's agent buy it" uses real test money. | **NONE.** S7's monthly cap is for tips. | Seller agent (Echo): **HOOD only** (S1, S9, S21, S23). The main path only has the line "Your agent can do this thousands of times while you sleep". No small creator agent appears. | **MAIN**: Stop 2 agent checks every bill. **HOOD**: S4. |
| **Humans set the rules** | – | Budget is fixed text ($25 a payment, $7,500 a day) with no control. **HOOD**: S4 NWC budget, S21 fiat pricing. | – | Price, shares and allowed uses can't be set on any main screen. | – |

Scenarios run headless with "Run all steps" and no failures: s3, s4, s5, s6, s7, s9, s18, s19, s20, s21, s22, s23. Each scenario page has 535–1,110 words and 25–131 jargon hits.

## 2. Simplicity test (fresh first-timer)

| Persona | Taps to aha | Time | Words at aha | Jargon on the main screen |
|---|---|---|---|---|
| I make music | 2 (persona, "Let Bob's agent buy it") | 9.0 s including the real faucet payment | 127 | none (only "agent") ✅ |
| I buy music | 2 (persona, "Let Bob's agent buy a licence") | 0.8 s | 79 | none ✅, but the aha is "Licensed for $5.00. No one clicked." The scale moment needs a third tap. |
| I build | 2 (persona, "Check the licence") | 0.9 s | 380 (drawer opens by default) | verifyLicence, bundle, node, preimage, binding, OpenTimestamps, Mutinynet, block. Fine for builders. |

Jargon that leaks where non-technical users land:
- **Own-song card** (the artist's most useful action): "sats", "node", "preimage", "faucet.nwc.dev", "description_hash", "SHA-256", "fingerprint", "check 3 cannot pass", "check 10". It also says "100 sats reached **Alice**" for *your* song (shot 20).
- **Stop 2 / Stop 3**: "practice chain", "Mutinynet", "block 3,513,267".
- **"See the proof"** panel: 478 words, including sats, NWC, faucet, preimage, binding, node, hash, Mutinynet. Acceptable behind a tap, but that is where "Put up your own song" is buried.

Confusing or broken:
1. The Help page says "Is any money real? No… Does it talk to the internet? No, no server". This is false now that real faucet payments run by default.
2. The Verify page says "Valid licence (9/9…)" but lists 10 checks.
3. The own-song card names "check 3" for the node issue, but in the spec the node binding is check 2.
4. Stop 3 opens with a large empty video placeholder. Its "♪ Rain · Alice" label is unreadable in dark mode, and the verdict sits below the fold, on mobile too (shots 07, 22, 23).
5. Stop 2: Bob buying 1,000 licences of one song is illogical for a newcomer. It reads as a company buying for 1,000 user posts, which is ClipAI or StreamCo.
6. Artist persona: the heading says "Your song sells itself", but you press the *buyer's* button and never set anything.
7. Dead end: Extra → "Explore under the hood" (1,362 words, 27 scenarios). There is no call to action anywhere: 0 hits for GitHub, SDK, npm, "list your", "get started" or waitlist.

Mobile at 390px: no horizontal overflow on any stop. The playlist scrolls sideways and the payoff stacks well (shot 15). The progress nav shows only numbers and "Seen as" is hidden. Stop 3's placeholder fills the first screen.

## 3. Usefulness: what each person walks away with

- **Artist**: sees that money splits instantly, in dollars. Can't list a real song for real buyers: "Put up your own song" is a browser-only demo with no price, no shares, no publish and no account. Next step offered: "Next: agents buy at scale". Nothing to *do*.
- **Company buyer**: sees a budget and an agent that won't overspend. Can't see how to plug in its agent (no endpoint, no x402 or MCP snippet on the main path; Stop 2's drawer has an agent trace, not a how-to). Can't see a catalogue or subscription deal. Next step: none.
- **Builder**: gets a 3-line `verifyLicence` snippet and per-scenario AI prompts (under Code → "Example prompts"). There is no link to the public repo welliv/licence-lab, no package, and no SDK install line. Next step: "Try to break it".

## 4. 1:1 understandability: Alby Sandbox vs ours (both walked fresh)

| | Alby: Getting Started → "Simple Invoice Payment" | Ours: /next/ Home → Stop 1 (artist) |
|---|---|---|
| Ideas per screen | **1**: "Alice creates an invoice, Bob pays it." | **6**: pick a song, price, co-owner splits, an agent buys, proof on Bitcoin, "while you sleep". |
| Words per screen | intro 48 / 59 / 72; scenario 90 → 128 | home 77; Stop 1 91 → 127; Stop 2 44 → 138; Stop 3 245 |
| Jargon on screen | sats, NWC, BOLT-11, invoice, preimage, wallet | none on Stop 1 (dollars) ✅ |
| Taps / time to first payment | 4 + 2 wallet creations, about 21 s | 2, about 9 s ✅ |
| Cause and effect | **Persistent** balance cards visible *before* you act (10,000 / 10,000), then 11,000 / 9,000 sats and they stay. Every panel names the actor ("Alice: Create Invoice", "Bob: Pay Invoice"). A one-line log reads "Bob → Alice 1,000 sats". | Balances appear only *after* the tap, as a 1.9 s count-up ($5.00 → $0.00; +$3.25 / +$1.00 / +$0.75). There are no "before" numbers, no actor panels, no log, and no balances on Stops 2 and 3. "Proof saved on Bitcoin ✓" is a claim you can't see. |
| Who you are | You play Alice, then Bob, one step each. | Told "Your song sells itself" as the artist, then you press Bob's button. Alice's side (making the offer) is invisible. |
| What a newcomer can explain afterwards | "Alice asked for 1,000 sats, Bob paid, her balance went up by 1,000." Complete and correct. | "Bob's agent paid $5 and it split three ways." They can't say what Bob may do with the song, who the agent is, what the proof is, or why Stop 2 is 1,000 licences. |

**Why Alby is easier**, even with more jargon: it teaches one cause and one effect per screen and keeps both on screen. The balances are there before, during and after, and every action is labelled with the person doing it. Ours tells a bigger story in one go and shows the effect as a brief animation with no before state. The visitor watches a result rather than *doing* each side.

**Exact deletes and changes to be at least as easy, keeping the bigger story:**
1. **Add a persistent wallet strip** to every stop, always visible and in dollars: `Bob $50.00 · Alice $0.00 · Carol $0.00 · Dave $0.00`. The numbers tick when money moves and carry across stops, so Stop 2 shows ClipAI's balance falling and Alice's rising. This is Alby's main trick.
2. **Split Stop 1 into two actor panels**, as Alby does. Left: "Alice: put it on sale", with a price stepper ($1–$50), the shares and one button. Right: "Bob's agent: buy it". That is two taps, each by a named person. It also delivers "humans set the rules".
3. **Add a plain log line** under the panels: `Bob's agent → Alice $3.25 · Carol $1.00 · Dave $0.75 · licence: use in online videos, forever`.
4. **Say what the licence allows** on the card in 5–6 words ("Use in your videos, forever").
5. **Delete from Stop 1's first view**: the "while you sleep" line (move it to Stop 2, where it's shown). Move the playlist below the payoff as "Try another song". The user asked for the playlist, so keep it; just move it.
6. **Make the proof visible, or say less**: replace the "Proof saved on Bitcoin ✓" badge with a small receipt ("Receipt #9d7e… · anyone can check it · saved on Bitcoin").
7. **Delete from the main path**: the "Try to cheat" boxes on Stops 2 and 3 (keep them under "I build" and in the red team), the Stop 3 video placeholder, and the ModelCo regulator panel (move it to a company path). One idea per stop.
8. **Stop 2**: have *ClipAI's agent* buy for 1,000 user videos rather than Bob buying 1,000 of the same song, and show it on the wallet strip.

## 5. Top 5 gaps, ranked by impact, with the smallest fix

1. **Personal vs enterprise licences and subscriptions are missing**, which is the commercial core of the vision. *Smallest fix:* on the Stop 1 song card, add a 3-way switch: **Personal $1 · Creator $5 · Business $50**, each a real offer with its own `use` tag. Add one **"Harbour Music catalogue: $99/month"** card on Stop 2 that ClipAI's agent buys inside a monthly budget, with one signed plan offer and a simulated renewal. The protocol has no `personal` use or subscription offer yet, so label both as draft spec.
2. **Cause and effect isn't persistent, so it's harder to understand than Alby.** *Fix:* the wallet strip plus two actor panels (§4, items 1–3).
3. **Humans set no rule on the main path.** *Fix:* a price stepper for Alice (Stop 1) and a daily-budget slider for the buyer (Stop 2). Both already exist in the engine (S21, S4).
4. **No next step for any persona.** *Fix:* the finale shows three buttons. "Put up your song" (the existing own-song flow, moved out of the proof panel, in dollars, paying "you"). "Connect your agent" (a 10-line x402 + NWC snippet and the existing buyer-agent prompt). "Code on GitHub" (welliv/licence-lab is already public).
5. **Copy bugs and leaks erode trust.** *Fix (all one-line edits):* Help page "no real money / no internet"; Verify "9/9" with 10 checks; own-song "check 3" (should be check 2) and "reached Alice"; sats and jargon on the own-song card; the unreadable Stop 3 label; companies unnamed on the main path (use ClipAI, StreamCo and Harbour Music by name).

## Key screenshots (shots/)
- 01-home-fresh · 02-artist-stop1-before · **03-artist-payoff** · 04-artist-see-proof · 05/06-stop2 · **07-stop3-after** · 08-finale
- 09/10-buyer · 11/12-builder · 13–16 mobile (**15-m-payoff**) · 22/23 mobile builder · 17-hood · 18-scenario-s5/s6/s7/s18 · 19/21-verify (21 = live Mutinynet 10/10) · **20-own-song-sold** (jargon and "Alice")
- Alby: 30–33 intro · 37 before wallets · 38 connected · **39-alby-paid** · 40-alby-subscriptions (Alby has a "Subscription Payments" scenario; we have none)
