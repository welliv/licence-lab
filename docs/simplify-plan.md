# Licence Lab: simplify plan (branch `simple`)

**Headline:** "Artists license their music directly. Any agent can buy it in seconds and prove it on Bitcoin."
**Short form:** "Music rights, sold directly, bought by any agent, proven on Bitcoin."

**Who it is for:** agents are the main users. Platforms buy at scale, artists sell at scale and creators work through AI. People set the rules and agents do the work across Nostr's global network. The first screen is for a person who has never heard of any of this and has 60 seconds.

## The rules we applied

**Musk's algorithm, in order:**

1. **Make the requirements less dumb.** For every screen, tab and word we asked who needs it on the first visit. The answer for almost everything was: a developer, a reviewer or an auditor, and not on the first visit.
2. **Delete.** We removed the parts nobody needs on the main path, then added back about 10% (the story chapters and one verdict).
3. **Optimise.** The rest has fewer words, one button per screen and plain verdicts.
4. **Accelerate.** The whole flow (hear → license → proven → full track) takes one minute and two taps.
5. **Automate.** Party set-up, the steps and the anchoring all happen behind one button. Run-all, replay and the tests still drive every scenario.

**Jobs' design rules:**

- **No manual needed.** Every screen has one sentence of why and one obvious button.
- **Start from the experience.** The listener hears "Rain" first and sees the technology only if they ask.
- **The technology is invisible.** Preimage, NWC, OP_RETURN and x402 appear only under "Under the hood", each with a one-line plain meaning.
- **Say no to 1,000 things.** The main path has 3 chapters plus 1 short one. Everything else is one tap away, not deleted.
- **Perfect the details.** Big type, generous spacing, a progress indicator, mobile first, dark by default.
- **Prototype and iterate.** The browser check drives the new path end to end, and screenshots are taken every run.

## Audit of every current element

Verdict key:

- **keep:** stays where it is.
- **merge:** folded into another element.
- **hood:** moves under "Under the hood" and stays fully working.
- **delete:** removed.

| # | Element (where) | Verdict | Why |
|---|---|---|---|
| 1 | Getting Started: 3-slide carousel | delete | It was a manual before the product. It is replaced by one screen you can act on (hear → license). |
| 2 | Getting Started: "Next →" button and slide dots | delete | No slides left. |
| 3 | Getting Started: "Try the first scenario" | delete | Scenario 1 (onboarding) is not where a newcomer should start. The story starts with the song. |
| 4 | Getting Started: "six signed parts" slide | hood | True but technical. It moves to the glossary. |
| 5 | Sidebar on every page | hood | Fifty links is a manual. The story pages have a slim top bar; the sidebar stays under the hood. |
| 6 | Sidebar logo and subtitle "Explore music licensing scenarios" | merge | The top bar logo returns you to the story. |
| 7 | Sidebar "Getting Started" link | merge | It becomes "← Back to the story". |
| 8 | Sidebar "Live test wallets" plus the REAL pill | hood | For developers. The pill is deleted; the page says what is real. |
| 9 | Sidebar "Verify a bundle" | hood | The main path has "Anyone verifies" (chapter 3). The JSON tool stays under the hood. |
| 10 | Sidebar part headings (5) and 24 scenario links | hood | Kept, grouped and folded. Only the open part expands. |
| 11 | Sidebar "Red team" heading and "All attacks and score" | merge | Becomes one link: "Try to break it". |
| 12 | Sidebar list of 19 individual attack links | delete | The red-team page lists them all, with score. Nineteen links in a menu add nothing. |
| 13 | Sidebar Protocol library, White paper, Help | hood | Kept under the hood. |
| 14 | Sidebar theme toggle | keep | Dark stays the default; light stays optional. Also in the story's top bar. |
| 15 | Sidebar "Reset everything" | hood | Kept. |
| 16 | Sidebar note "Test keys only…" | keep | A safety line. Shown once under the hood and in the story footer. |
| 17 | Scenario: emoji, title, summary | keep | |
| 18 | Scenario: complexity pill (simplest…expert) | delete | Nobody chooses a scenario by difficulty. Part grouping already orders them. |
| 19 | Scenario: status pill ("S3 · v1") | keep | Useful to spec readers; it is small. |
| 20 | Scenario: lightbulb "How it works" | keep | Optional depth, one tap. |
| 21 | Scenario: header "Play Rain" chip | delete | Duplicates the always-present music player. |
| 22 | Scenario: "Jump to code" button | delete | The Code tab is right there. |
| 23 | Scenario: "⚡ Instant mode" banner | delete | One sentence in Help and the glossary says what is real and simulated. Badges on each line still say it. |
| 24 | Scenario: tier legend (4 badges) | delete | Each badge already has its own tooltip. Duplicated in the glossary. |
| 25 | Scenario: "Set up all the parties" warning and button | keep | The Alby-style flow under the hood. |
| 26 | Party card: name, Ready pill, options menu, blurb, balance, key line | keep | |
| 27 | Party card: compact play button (Ava) | delete | Duplicates the music player. |
| 28 | Party card: "≈ $ … Lab rate" line | delete | An invented exchange rate is noise, and close to fake data. |
| 29 | Party card: NWC budget bar | keep | Shows the agent's limits, which is the point of agents. |
| 30 | Steps header: done count | keep | |
| 31 | Steps header: "free play: any party can act at any time" text | delete | The behaviour stays (guards still explain). The sentence was a manual. |
| 32 | Steps: Run all, Reset scenario, Share this run (replay) | keep | Automation and replay are kept. |
| 33 | Step cards (narration, inputs, button, result, trace, checks, fields) | keep | |
| 34 | Outcome card (proven / can go wrong / honest limits) | keep | The honesty layer. |
| 35 | Tab: Log | hood | |
| 36 | Tab: Flow Diagram | hood | |
| 37 | Tab: Balance Chart | hood | |
| 38 | Tab: Nine Checks | merge | The story shows one verdict; the nine checks are one tap behind it. The tab stays under the hood. |
| 39 | Tab: Code | hood | |
| 40 | Tab: Inspect | hood | |
| 41 | Tab: Example Prompts | hood | |
| 42 | Tab: Production (real Mutinynet proofs) | hood | Also reachable as "Real runs on Bitcoin's test network". Its tx link feeds the home page. |
| 43 | REPL (Code tab) and `window.lab` | hood | |
| 44 | Live test wallets page | hood | |
| 45 | Verify page (JSON paste, open file, audio hash) | hood | |
| 46 | Red team index and score | hood | |
| 47 | 19 attack pages (tamper editor) | hood | Plus 5 new rights attacks. |
| 48 | 24 scenarios | hood | Plus 3 new rights scenarios (25–27). |
| 49 | Protocol library page | hood | Now also lists the rights extension. |
| 50 | White paper page | hood | |
| 51 | Help page | merge | Merged with the new glossary under the hood. |
| 52 | Music player (bottom bar) | keep | The experience starts with listening. |
| 53 | Player: "Real recording: <file>" line | keep | Honesty about demo names. |
| 54 | Player: track picker, Credits | keep | |
| 55 | Footer: long technical sentence | delete | Replaced by one short line. |
| 56 | Mobile menu bar | merge | The story's top bar works on mobile; the hood keeps its menu. |

**Added back** (Musk's ~10%):

| New element | Why |
|---|---|
| Home: headline, song, **one** button that changes ("Hear" → "License for 100 sats" → "Licensed ✓ Proven on Bitcoin") | The 60-second first experience. |
| Progress indicator (Listen · 1 · 2 · 3 · 4) | You always know where you are. |
| Chapter 1 "Artist sells" | One why, one action, one result. |
| Chapter 2 "Agent buys" | |
| Chapter 3 "Anyone verifies" | |
| Chapter 4 "Rights change hands" | |
| One verdict ("This licence is real" / "Not valid: <plain reason>"), with the 9 checks behind a tap | |
| Under the hood index, with a glossary of one-line plain meanings | |

**Counts:**

- 56 elements audited.
- 13 deleted: 1, 2, 3, 12, 18, 21, 22, 23, 24, 27, 28, 31, 55.
- 22 moved under the hood: 4, 5, 8, 9, 10, 13, 15, 35–37, 39–50. Element 10 alone covers 24 scenario links, and element 47 covers 19 attack pages.
- 6 merged: 6, 7, 11, 38, 51, 56.
- 15 kept: 14, 16, 17, 19, 20, 25, 26, 29, 30, 32, 33, 34, 52, 53, 54.
- 8 added back (above).

On the main path the count drops:

- **Before**, a newcomer saw about 60 controls and links: a 50-link sidebar, banners, party cards and steps.
- **After**, the home page has 1 primary button, a play button and 1 link ("Under the hood").

## Words: plain on the path, precise under the hood

| Under the hood term | Plain words on the path |
|---|---|
| preimage | proof it was paid |
| NWC (Nostr Wallet Connect) | the agent's wallet, with a spending limit |
| OP_RETURN / OpenTimestamps | a date fixed on Bitcoin |
| x402 / HTTP 402 | "pay to continue" for apps and agents |
| binding (kind 3411) | Ava's own wallet, linked to her account |
| consent (kind 3413) | Jay agreed to his share |
| verifyLicence, 9 checks | "This licence is real" |
| transfer record (kind 3417) | Ava sold her rights to … |
| succession plan (kind 3418) | who takes over, and how many must agree |

## Part B: rights change hands

These are specified in `/workspace/submission/nip-draft/NIP-XX-music-licence.md` ("Rights transfer (draft)") and implemented in `src/lib/mll/rights.ts`. That file is a Lab extension; mll-audit is unchanged.

- **S25 Sale of rights:**
  - Ava signs a transfer, and Jay, Nova and Lena co-sign it.
  - It is timestamped with an "MLT1" OP_RETURN that commits to the record and its co-signatures.
  - After it, only Harbour's key can sell. Licences from before stay valid.
- **S26 Planned succession:**
  - The plan names 3 keys and needs 2 of them, and is timestamped while Ava is alive.
  - 2 of the 3 sign the takeover. Ava's old key is then frozen and the new key sells.
- **S27 Estate with no plan:** shown honestly as a limit. The protocol cannot decide. A court registry vouches, and each verifier chooses whom it trusts.
- **Attacks:**
  - A20 fake heir (1 key).
  - A21 stolen old key signs a sale after rotation.
  - A22 double sale.
  - A23 old key sells after a transfer.
  - A12c stolen key after a key rotation. This closes the A12b gap whenever Ava rotates.
