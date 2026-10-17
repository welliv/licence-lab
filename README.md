# Licence Lab

An interactive sandbox for the open music-licence protocol (Nostr + Lightning + Bitcoin). The look and layout follow Alby's sandbox; all the code is our own.

- 27 scenarios, all interactive. 24 red-team attacks with a tamper editor. Tabs: What happened (with the flow diagram and balances), Nine checks, Code (with the REPL, signed events, example prompts and real vs simulated).
- Instant mode: real signatures, BOLT11 invoices with description_hash, OpenTimestamps proofs and verifyLicence, run in the browser by a byte-for-byte copy of the audited library (`src/lib/mll`, from mll-audit b268e79). Money, relays and Bitcoin blocks are simulated, and every step says which is which.
- Instant mode (default): no server, no analytics, no relays. Live test wallets (opt-in page): real NWC payments on the public faucet (faucet-only sats) via public Alby relays; Mutinynet read via mutinynet.com.
- Dark theme by default; light toggle in the sidebar.

```
npm install
npm run dev        # http://localhost:5180
npm test           # 92 tests (LIVE=1 adds a real faucet run)
npx tsx scripts/live-run.mts       # real faucet run, writes docs/live-evidence.json
node scripts/mutinynet-status.mjs  # Mutinynet status (needs login for writes)
npm run build && npm run preview   # http://localhost:4180
node scripts/ui-check.mjs          # browser run: main path, all 27 scenarios, red team, test kit
npm run shots                      # dark screenshots of the main path -> screenshots/main-path/
node scripts/main-path-metrics.mjs # headless time to first licence + jargon per page (URL=…, MODE=old|new, SCEN=1)
```

See `docs/vs-alby.md` for the comparison.

## Music

Put audio files in `public/music/` (.mp3 .m4a .aac .ogg .oga .opus .wav .flac .webm; any file names), then run `npm run music`. This also runs before `dev` and `build`. It writes 30 s previews to `public/music/previews/`, plus `tracks.json` and `CREDITS.md`. Edit titles, artists and licences in `public/music/music.json`. The offer's `x` tag is the SHA-256 of the full file. Audio files are gitignored.

## Branch `simple`: the main path and rights transfer

- **Home** (`#/`): one headline and one tap: "I make music / I buy music / I build". The choice sets the order of the stops, is remembered, and can be changed.
- **Three stops** `#/stop1` to `#/stop3`, plus the extra `#/rights`: Hear it, license it (100 sats, the payment split to Ava, Jay and Nova); Agents buy at scale (budget, a refused poisoned offer, 1,000 licences under one timestamp); Anyone verifies ("License this" on a video, the AI-training check, the fake caught, the real Mutinynet proof). Each stop has one verdict, one "Try to cheat" and a "Next" button. Technical terms are only in the code drawer, which is open by default for builders. Old links `#/c1`–`#/c4` still work.
- **User tests**: add `?test=1` to show a local-only timer (time to first licence, stop times; Export to JSON). There are no analytics. See `docs/user-test-script.md`.
- **Under the hood** (`#/hood`): every scenario (27) in 9 groups, no set-up gate, 3 tabs per page; the attacks (24) as a game grouped by what they protect, the Verify page, Live test wallets, the Mutinynet runs, the library and a one-line glossary. The audit of what was deleted, merged or moved is in `docs/simplify-plan.md`.
- **Rights extension** (`src/lib/mll/rights.ts`, Lab only; mll-audit is unchanged): transfers (3417), succession plans (3418), co-signatures (3419), the "MLT1" timestamp, and the chain of title folded into check 9. See scenarios S25–S27 and attacks A12c and A20–A23.
