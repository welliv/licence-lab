# Project overview

"Nostr Powered Music": what the protocol is, how a sale works and where the project stands (5 pages).

- [PDF](nostr-powered-music-project-v3.pdf) · [DOCX](nostr-powered-music-project-v3.docx) · [PDF on Nostr](https://nostr.download/7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401.pdf)
- SHA-256 of the PDF: `7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401`

## On Bitcoin

The PDF is anchored by an OP_RETURN in transaction [e583…810d](https://mempool.space/tx/e583615fcdf1c604d74bac81ebdf3104cc83fe7348bdfedace4f6393bf41810d), in block [971984](https://mempool.space/block/000000000000000000018afcad81ac70dc8cb1c38a05fd22abca5fcb8941d319) (18 Oct 2026, 11:08 UTC). It reads:

```
Artists license music. Agents buy it. Bitcoin proves it. nostr.download/7a439d28172db856b974a776685944f59f397200c192606b890b1f9add2f9401.pdf
```

The file name in that link is the SHA-256 of the PDF, so the transaction shows this exact file existed by block 971984. To check:

```
sha256sum nostr-powered-music-project-v3.pdf
# compare with the hash in the OP_RETURN above
```
