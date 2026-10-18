# Project overview

- [nostr-powered-music-project-v2.pdf](nostr-powered-music-project-v2.pdf) ([.docx](nostr-powered-music-project-v2.docx)): the project overview, "Nostr Powered Music", 5 pages.

It explains the idea, how a sale works and where the project stands. The live demo is at https://welliv.github.io/licence-lab/. Supporting documents are in [`../references/`](../references/). All payments described used test coins on test networks.

## Timestamp (OpenTimestamps)

The PDF has an OpenTimestamps proof next to it (`.ots`). It shows that this exact file existed by a given Bitcoin block. It was stamped on 18 October 2026 through the free public calendars; no funds were spent. The proof is confirmed in Bitcoin blocks 971918 and 971922 (two calendars stamped it).

| File | SHA-256 |
|---|---|
| nostr-powered-music-project-v2.pdf | `01230d99fdf77eec99a9efc3c7e6bf5ee3cf0b0c8362ba67b43085f17d0bf1e5` |

To check the file:

```
pip install opentimestamps-client
sha256sum nostr-powered-music-project-v2.pdf      # should match the table
ots verify nostr-powered-music-project-v2.pdf.ots
```

A full check needs a Bitcoin node; without one, compare the named blocks with a public explorer.
