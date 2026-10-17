# Licence Lab

A live demo of the open music-licence protocol (Nostr, Lightning and Bitcoin): artists license their music directly, any agent can buy it in seconds and prove it on Bitcoin. Test coins only.

**Live app:** https://welliv.github.io/licence-lab/

## What the live app shows

- **Home:** one headline and one choice: "I make music", "I buy music" or "I build". The choice sets the order of the stops.
- **Stop 1, Hear it, license it:** pick a song from the playlist, choose a Personal, Creator or Business licence, and let Bob's agent buy it. The money is shared out at once to the artist and co-owners.
- **Stop 2, Companies buy at scale:** ClipAI's agent licenses songs for 500 user videos inside a monthly budget a person sets, then subscribes to the Harbour Music catalogue (a draft).
- **Stop 3, Anyone can check:** anyone can check a licence alone, in seconds, with a link to a real licence on Mutinynet.
- **Extra, rights change hands:** a sale of the rights, a planned succession and a stolen phone, with older licences staying valid.

Prices are shown in dollars at a fixed demo rate (1 test sat = $0.05). Stop 1's sales and the first month of the subscription are real Lightning payments with test sats from faucet.nwc.dev; the rest uses practice money in the browser. Signatures, bills and checks are always real. Dark mode is the default.

Useful links: `?fresh=1` starts again from a first visit, `?classic=1` shows the earlier Stop 1, and `?test=1` shows a local-only timer for user tests (no analytics).

## For developers

- **Code:** the app is in `src/` (React and Vite). `src/lib/mll` is a byte-for-byte copy of the reference library, plus the rights extension in `src/lib/mll/rights.ts`. The scenarios are in `src/scenarios` and the attacks in `src/engine/attacks.ts`.
- **References:** the draft NIP, the audits and the questions for legal review are in [`docs/references/`](docs/references/).
- **Tests:** `npm test` runs 124 tests; `LIVE=1 npm test` adds a real faucet run.

```
npm install
npm run dev                        # http://localhost:5180
npm test                           # the test suite
npm run scenarios                  # run every scenario headless
npm run build && npm run preview   # http://localhost:4180
```

## Music

Put audio files in `public/music/` (.mp3 .m4a .aac .ogg .oga .opus .wav .flac .webm; any file names), then run `npm run music`. This also runs before `dev` and `build`. It writes 30 s previews to `public/music/previews/`, plus `tracks.json` and `CREDITS.md`. Edit titles, artists and licences in `public/music/music.json`. The offer's `x` tag is the SHA-256 of the full file. Audio files are gitignored.
