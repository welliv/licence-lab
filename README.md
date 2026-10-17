# Licence Lab

An interactive sandbox for the open music-licence protocol (Nostr + Lightning + Bitcoin). The look and layout follow Alby's sandbox; all the code is our own.

- 24 scenarios, all interactive. 19 red-team attacks with a tamper editor. Tabs: Log, Flow Diagram, Balance Chart, Nine Checks, Code (with REPL), Inspect, Example Prompts, Production.
- Instant mode: real signatures, BOLT11 invoices with description_hash, OpenTimestamps proofs and verifyLicence, run in the browser by a byte-for-byte copy of the audited library (`src/lib/mll`, from mll-audit b268e79). Money, relays and Bitcoin blocks are simulated, and every step says which is which.
- Instant mode (default): no server, no analytics, no relays. Live test wallets (opt-in page): real NWC payments on the public faucet (faucet-only sats) via public Alby relays; Mutinynet read via mutinynet.com.
- Dark theme by default; light toggle in the sidebar.

```
npm install
npm run dev        # http://localhost:5180
npm test           # 55 tests (LIVE=1 adds a real faucet run)
npx tsx scripts/live-run.mts       # real faucet run, writes docs/live-evidence.json
node scripts/mutinynet-status.mjs  # Mutinynet status (needs login for writes)
npm run build && npm run preview   # http://localhost:4180
node scripts/ui-check.mjs          # browser run of all 24 scenarios
npm run shots                      # screenshots/
```

See `docs/vs-alby.md` for the comparison.

## Music

Put audio files in `public/music/` (.mp3 .m4a .aac .ogg .oga .opus .wav .flac .webm; any file names), then run `npm run music`. This also runs before `dev` and `build`. It writes 30 s previews to `public/music/previews/`, plus `tracks.json` and `CREDITS.md`. Edit titles, artists and licences in `public/music/music.json`. The offer's `x` tag is the SHA-256 of the full file. Audio files are gitignored.
