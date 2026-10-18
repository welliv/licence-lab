> Published copy for reference. Scripts and screenshots this audit mentions were kept by the auditor and are not included.

# Independent audit: Music Licence Link (17 Oct 2026)

**Overall verdict: COMPETENT. It is a strong, honest, well-tested piece of work, with one near-magical moment and nothing yet that is exceptional.**

I did not build this, and I did not trust its own scores. Everything below is from things I ran on 17 Oct 2026. I changed no repo: all three are clean at the same HEADs (mll-audit `07cc2d4`, mll-build `ffe4cdd`, licence-lab `aa2d84f`). The auditor kept its scripts and screenshots.

## The bar

| Level | Means | Test I used |
|---|---|---|
| Competent | It works, it is sound, and a strong team could have built it | Tests pass, live proofs are real, and the design holds under attack |
| Magical | A first-time user feels something new within a minute | A cold user reaches a "wow" with no help, and it is real rather than staged |
| Exceptional | A genuine breakthrough that changes how a market works, with evidence | New capability + strangers using it + money moving that would not move otherwise |

## What I ran

- **Core tests:** `npm test` in mll-audit: **258/258 pass** (33 s). Coverage: **78.6% lines, 84.7% branches**. `tsc --noEmit` gives **15 errors**, all in scripts that import `../mll-build`.
- **Lab tests:** **92 pass, 1 skipped** (the live-faucet tier).
- **Live chain:** I fetched all five key txids from mutinynet.com. They are all confirmed (blocks 3,512,497–3,512,502) and carry the claimed `MLA1`/`MLR2` OP_RETURNs, plus the OTS commitment `d58dae9b…`.
- **Independent re-verify:** I wrote my own chain oracle on the public Esplora API, so it doesn't use the builders' node. The Mutinynet licence passes **9/9**. Its digest `9fffbbaf…` matches the bytes on chain. A tampered preimage and a wrong anchor tx are both refused.
- **Copycat test (mine):** I took two unrelated keys and nodes selling the *same* track hash. **Both pass the core `verifyLicence`.**
- **Cold walks:** headless Chrome, as an artist, a buyer and a builder, plus the Lab's "Verify a bundle" page with the real Mutinynet bundle.
- **Alby Sandbox:** walked read-only.
- **Web research:** Story, SourceAudio, Songtradr, x402/Block, Wavlake/Fountain.

## Area by area

### 1. The why: **real, but not sharp for most of the people named**
- The pain is real for **AI music and model companies**, which must show permission for their training data. It's also real for anyone who needs a licence that outlives the company that sold it.
- That market buys **in bulk, with indemnity**. SourceAudio offers 14M cleared tracks and has closed 8 contracts worth about $10M a year. It doesn't buy one licence at a time.
- Long-tail self-serve licensing keeps failing as a business. **Songtradr closed its marketplace on 30 Sep 2026** and moved to invite-only. Story Protocol moved away from music IP to AI-data provenance, with near-zero on-chain revenue.
- Small creators mostly don't feel the pain: blanket libraries (Epidemic, platform audio libraries) already solve it for them.
- Verdict: the problem exists. The sharpest buyer is AI companies, and what they want is *proof of permission at catalogue scale*, not 100-sat sales.

### 2. The breakthrough: **a clever new combination, not a new primitive**
- **Genuinely new**, as far as I can find: "payment is the grant". The invoice's description hash commits to the buyer's signed request, and the invoice must be signed by a node the artist's key has bound. The preimage then completes a self-contained licence that anyone can check.
- None of the others does this:
  - Wavlake and Fountain do tips and value-for-value, with no licences.
  - Story uses tokens on its own chain.
  - x402 is payment with no licence meaning, and Block added Lightning to it in Sep 2026.
  - L402 is access tokens.
- **Compared with Satoshi:** Bitcoin solved its *hardest* problem, double spending, without trust. Here the hardest problem is **who really owns the music**, and the design write-up rightly says it "stays an input". So this is not a Bitcoin-class breakthrough.
- **Compared with the iPhone:** Jobs won by putting known parts into one product people already wanted. There is no product yet with real users.
- Verdict: **Competent+**. It's an elegant protocol design that a strong Nostr/Lightning team could reach in a few months.

### 3. Protocol soundness and security: **Competent (strong), with known gaps**
- The red-team audit is real: 27 findings, 24 fixed, 185 adversarial tests. The verifier fails closed with coded reasons.
- **Ownership (new finding, the root issue):** a copycat with its own key and node selling Alice's track hash passes the core 9 checks. Only the Lab extension (`rights.ts`, `rights_not_holder`) catches it, and only by trusting a voucher such as a distributor. That reintroduces a trusted party at exactly the critical point.
- **A18 (shared node):** the rule is correct, because on a shared node others could sign invoices. But most artists use custodial or shared wallets, so most real artists fail check 6 today.
  - Fix: per-user nodes (Alby Hub, Phoenix, Breez SDK) that sign the binding over NWC `sign_message`, and mark shared nodes as "valid, payee not exclusive" rather than hiding them.
- **A12b (stolen key signs a new binding):** revoking the binding doesn't stop the thief making a new one. Key rotation fixes this only in the Lab.
  - Fix: **pre-rotation**. The first binding commits to the hash of the next key, and only that key can rotate or revoke for compromise. This goes into the core library, not the Lab.
- **Revocation 2-hour rule:** proven live (licence #4 was paid before the revocation and voided). It's worse than an edge case: on mainnet, OpenTimestamps (the default) takes about an hour or more to confirm. So *most* licences bought in the 2 hours before a retirement can be lost, and an artist can void a sale she was paid for.
  - Suggested fix (needs tests): for *retire* revocations, void only invoices dated after the revocation's block time, with no 2-hour margin.
  - Require the anchor within about 144 blocks of the invoice date.
  - Keep the strict rule only for *compromise* revocations, where backdating is a real threat.
- **S21 fiat:** the workaround means re-signing short-lived offers every day. That needs an online signer, which conflicts with the design write-up's "artist key kept offline".
  - Fix: the binding names a scoped price key with a price band signed by the main key.
- **Light verification is not as light as the copy says:** check 9 (no prior revocation) scans every OP_RETURN since the binding. The design write-up admits this needs a full node or trust, but the Lab says "without anyone being online".
- **In the design write-up, not in the code:** exclusivity (MLX1/MLX2 reservations) and the daily status record.

### 4. Code quality and tests: **Competent (strong)**
- It's small and focused: about 93 KB of TypeScript, with real BOLT11, OTS and BIP-340 handling.
- Tests are property-based, fuzz, concurrency and crash-recovery tests, not just happy paths.
- **Against it:**
  - Very dense one-line style that is hard for others to review.
  - The type-check is not clean (15 errors).
  - Rights transfer lives only in the Lab copy.
  - The Lab's copy of the library is kept "byte for byte" by hand.

### 5. Real-world proof: **Competent: it works on a real chain, not yet in the world**
- The Mutinynet transactions are real and I verified them independently. Credit is due for running the real OP-RETURN-Bot, a real otsd and Ben's x402 checker (44 passed).
- **But:**
  - One operator ran every party on one box: "Ava's own node", the buyer, the OTS calendar and the anchor wallet.
  - The licensed track is a placeholder hash (`0707…07`) at 50 sats on a localhost pay-link. It is not the "Rain" recording at 100 sats that the Lab shows next to the link.
  - No real artist, no real buyer, no mainnet, no stranger.

### 6. The design write-up against Satoshi's: **Competent+ (well written, honest)**
- It follows Satoshi's form closely: abstract, "Payment as Grant", timestamps, incentives, simple verification, calculations, limits. The prose is clear, and §10 is admirably honest.
- What makes Satoshi's paper great is not the form. It's that the system works *without* the trusted party. This one admits two trusted inputs (ownership, and absence of revocation for light verifiers) and describes an exclusivity scheme that isn't in the code.
- A cold reader will see that the core claim, "a peer-to-peer system for licensing music", depends on vouching.
- The NIP draft (2,083 words) is usable.
- The cast doesn't match: the design write-up, NIP, in-the-wild doc and Mutinynet report use Ava, Jay, Mia and Sam, while the Lab uses Alice and Bob.

### 7. Sandbox UX against Alby and Jobs: **near-magical for one persona, Competent overall**
- **Artist cold walk:** 3 clicks and about 6 s from home to "Licensed". The full track unlocks, and 100 sats visibly split into 65/20/15. Home is 155 words with no console errors. **That is the closest thing to a magic moment in the project.**
- **But:**
  - **It's staged.** No wallet, no real payment, and a "practice chain in your browser". Alby's sandbox, which is slower and wordier to start (three text slides), makes **real test-network payments with real faucet wallets**. Alby's is real; the Lab's is acted out.
  - **The artist plays the buyer.** "Your song" is Alice's song; you can't put up your own track and get paid. The emotional payoff for an artist ("I just got paid by a stranger's agent") is missing.
  - **The buyer stop** (1,000 licences, a poisoned offer blocked, budget held) is clear but feels like a counter, not a feeling.
  - **The builder stop states something false:** "verifyLicence … Check 9 also walks the chain of title" and `// copycat → { ok: false, code: 'rights_not_holder' }`. The core `verifyLicence` returns **ok: true** for the copycat (see §3). A builder who copies that snippet ships a verifier that accepts copycats.
  - **"Verify a bundle" rejects the real Mutinynet licence** ("anchor transaction does not commit…"), because it only checks the simulated chain, even though the Lab already has a Mutinynet Esplora oracle in `src/live/`. A sceptic who drops in the real proof sees **✗ Rejected**.
- Against Jobs, the main path is genuinely simple and quiet. The "Seen as / choose" selector plus persona cards is slightly redundant, and the button label on the builder stop differs from the Lab's own screenshot script ("License this" against "Check the licence").

### 8. Moat and go-to-market: **not yet competent (unproven)**
- The protocol is open, so the code is no moat, which is fine. But the claimed moats (network effects, a verified catalogue, "where agents go first") have **no users behind them**: 0 artists, 0 buyers, 0 third-party agents, 0 letters of intent.
- Block, Alby and Coinbase/x402 own the distribution for agent payments. Any of them could add "licence" semantics.
- A verified catalogue is the real potential moat, but it means doing the hard, unglamorous work of vouching for ownership.

### 9. Biggest risks, in order
1. **Ownership.** The system proves what a key granted, not who owns the music. Without a strong root (distributor, ISRC/ISWC, PRO or label vouching), serious buyers still need a middleman with indemnity.
2. **Demand.** The market evidence points to bulk, indemnified, curated deals, not open per-track sales.
3. **Spam and fake artists.** A file hash breaks on any re-encode, so copycats just re-encode. That needs audio fingerprinting plus reputation.
4. **Adoption friction.** An artist needs a Nostr key, a self-custodial node that can sign, and co-owners with keys.
5. **Legal.** Nobody has reviewed whether a preimage forms a licence, or whether an exclusive needs "writing". There are also tax and consumer law, and selling for bitcoin.

## Overall

| Area | Verdict |
|---|---|
| 1 Why | Real, not sharp for most named users |
| 2 Breakthrough | Competent+ (new combination) |
| 3 Soundness | Competent (strong) |
| 4 Code and tests | Competent (strong) |
| 5 Real-world proof | Competent (real chain, no real users) |
| 6 Design write-up | Competent+ |
| 7 Sandbox | Near-magical (artist), Competent overall |
| 8 Moat/GTM | Not yet competent |
| 9 Risks | High: ownership and demand |
| **Overall** | **COMPETENT** |

## The three things that most hold it back

1. **It proves "this key sold it", not "this person owns it".** My copycat test passes 9/9 in the core. Until ownership has a root that buyers accept, the project doesn't remove the middleman for the buyers who matter most.
2. **There's no evidence of demand.** Not one outside artist, buyer or agent has used it, and the market signals (Songtradr closing, Story moving away from music IP, SourceAudio's bulk deals) point away from per-track sales.
3. **The magic moment is staged, and the artist is a spectator.** No real wallet, no "put up your own song", plus two credibility bugs:
   - The builder snippet overclaims.
   - The verify page rejects the real proof.

## Shortest path to "exceptional"

1. **Fix the honesty bugs this week.** Make the Lab's verify page use its existing Mutinynet oracle. Correct the builder snippet: either move chain-of-title into the core library or say plainly that core `verifyLicence` doesn't check ownership. Re-run the live sale on the real "Rain" hash at the price the Lab shows. Use one cast across all documents.
2. **Make the first minute real.** On the main path, use one faucet wallet (as Alby does), make one real Mutinynet payment and anchor it, and verify it against mutinynet.com. Add "Put up your own song": the artist drops in an MP3, sets a price, and a stranger's agent pays her within 60 seconds.
3. **Close the core security gaps:** pre-rotation for A12b, the retire-revocation fix above, a scoped price key for S21 and per-user nodes for A18. Bring rights transfer into the core with tests.
4. **Give ownership a root.** Partner with one distributor (for example Symphonic or a DistroKid-type service) to sign "this ISRC belongs to this key" labels, and add audio fingerprinting so a re-encode can't dodge the check. That turns the verified catalogue into a real moat.
5. **Pick one wedge and get proof.** Take AI music/model companies that need *proof of permission*: one buyer, 20 to 50 real artists, real (small) mainnet licences, and one third party verifying licences with code it didn't write.
   - Exceptional would look like this: strangers moving money, and a verifier used by someone outside the team.
   - Also run the planned 5+5+5 cold-user test and time when each person "gets it".

Until steps 4 and 5 happen, the honest description is: **a well-engineered, well-written protocol that works on a real test chain, with a lovely demo, looking for its first real market.**
