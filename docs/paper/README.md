# Paper and project overview

- [nostr-powered-music-paper-v4.pdf](nostr-powered-music-paper-v4.pdf) ([.docx](nostr-powered-music-paper-v4.docx)): the paper, "Nostr Powered Music", 14 pages.
- [nostr-powered-music-project-v2.pdf](nostr-powered-music-project-v2.pdf) ([.docx](nostr-powered-music-project-v2.docx)): the project overview, 5 pages.

The live demo is at https://welliv.github.io/licence-lab/. The documents the paper cites are in [`../references/`](../references/). All payments described used test coins on test networks.

## Timestamps (OpenTimestamps)

Each PDF has an OpenTimestamps proof next to it (`.ots`). It shows that this exact file existed by a given Bitcoin block. They were stamped on 18 October 2026 through the free public calendars; no funds were spent.

| File | SHA-256 |
|---|---|
| nostr-powered-music-paper-v4.pdf | `1d052b10936a30edeea1cac0498eb4a7cf071bcbba3fdda51ac82c714317e585` |
| nostr-powered-music-project-v2.pdf | `01230d99fdf77eec99a9efc3c7e6bf5ee3cf0b0c8362ba67b43085f17d0bf1e5` |

To check a file:

```
pip install opentimestamps-client
sha256sum nostr-powered-music-paper-v4.pdf      # should match the table
ots verify nostr-powered-music-paper-v4.pdf.ots
```

A new proof says "Pending confirmation" until a Bitcoin block includes it, usually within a few hours. After that, run `ots upgrade nostr-powered-music-paper-v4.pdf.ots` once to add the Bitcoin part to the proof, and `ots verify` then names the block. A full check needs a Bitcoin node; without one, compare the block with a public explorer.
