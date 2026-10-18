# Project overview

- [nostr-powered-music-project-v3.pdf](nostr-powered-music-project-v3.pdf) ([.docx](nostr-powered-music-project-v3.docx)): the current project overview, "Nostr Powered Music". Also on Nostr: https://nostr.download/7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401.pdf
- [nostr-powered-music-project-v2.pdf](nostr-powered-music-project-v2.pdf) ([.docx](nostr-powered-music-project-v2.docx)): the earlier version, 5 pages.

It explains the idea, how a sale works and where the project stands. The live demo is at https://welliv.github.io/licence-lab/. Supporting documents are in [`../references/`](../references/). All payments described used test coins on test networks.

| File | SHA-256 |
|---|---|
| nostr-powered-music-project-v3.pdf | `7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401` |
| nostr-powered-music-project-v2.pdf | `01230d99fdf77eec99a9efc3c7e6bf5ee3cf0b0c8362ba67b43085f17d0bf1e5` |

## On Bitcoin (v3)

The v3 PDF is anchored by an OP_RETURN in Bitcoin transaction [e583…810d](https://mempool.space/tx/e583615fcdf1c604d74bac81ebdf3104cc83fe7348bdfedace4f6393bf41810d), confirmed in block [971984](https://mempool.space/block/000000000000000000018afcad81ac70dc8cb1c38a05fd22abca5fcb8941d319) on 18 October 2026 at 14:08 UTC+3 (11:08 UTC). The OP_RETURN reads exactly:

```
Artists license music. Agents buy it. Bitcoin proves it. nostr.download/7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401.pdf
```

The file name in that link is the SHA-256 of the v3 PDF, so the transaction shows that this exact file existed by block 971984. To check it:

```
sha256sum nostr-powered-music-project-v3.pdf
# should print 7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401,
# the same hash as in the OP_RETURN of tx e583615fcdf1c604d74bac81ebdf3104cc83fe7348bdfedace4f6393bf41810d
```

## Timestamp of v2 (OpenTimestamps)

The v2 PDF has an OpenTimestamps proof next to it (`.ots`). It shows that this exact file existed by a given Bitcoin block. It was stamped on 18 October 2026 through the free public calendars; no funds were spent. The proof is confirmed in Bitcoin blocks 971918 and 971922 (two calendars stamped it).

To check the file:

```
pip install opentimestamps-client
sha256sum nostr-powered-music-project-v2.pdf      # should match the table
ots verify nostr-powered-music-project-v2.pdf.ots
```

A full check needs a Bitcoin node; without one, compare the named blocks with a public explorer.
