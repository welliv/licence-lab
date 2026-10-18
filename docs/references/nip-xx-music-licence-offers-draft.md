NIP-XX
======

Music Licence Offers
--------------------

`draft` `optional`

This NIP lets a rights holder publish a signed offer to licence a recording, and lets anyone buy that licence over Lightning without an intermediary. The licence is complete when the buyer holds the Lightning payment preimage for an invoice that commits to their signed request. Nothing else needs to be signed after payment.

It builds on [NIP-99](99.md) (classified listings), [NIP-03](03.md) (OpenTimestamps) and [NIP-94](94.md) (file metadata). Payment uses HTTP 402 with the x402 `exact` scheme on the `lnbtc` network.

> Kind numbers `3410` to `3413` are placeholders. They were not in the kind table of the NIPs README on 12 Oct 2026. They must be confirmed with maintainers before use.

## Terms

- **Artist key** `K_a`: the rights holder's Nostr key. It should stay in a remote signer ([NIP-46](46.md)) and never be given to a server or agent.
- **Node key** `K_n`: the public key of the Lightning node that will sign the invoices. It must be the seller's own node. A shared custodial wallet can buy licences but cannot sell them.
- **Buyer key** `K_b`: a fresh Nostr key the buyer makes for one licence.

## Events

### Offer (`kind:30402`)

A NIP-99 listing signed by `K_a`, with these extra tags:

| Tag | Value |
|---|---|
| `d` | `<track>:<use>` |
| `x` | SHA-256 of the master file |
| `use` | use, territory, term, `non-exclusive`, then any required scope fields |
| `terms` | SHA-256 of the exact UTF-8 licence text |
| `terms-text` | the licence text itself |
| `price` | amount and unit, as in NIP-99 |
| `pay-link` | URL, `x402:exact:lnbtc`, `http:1` |
| `binding` | id of the binding event (below) |
| `valid-until` | Bitcoin block height after which the offer lapses |
| `p` | one per co-owner: pubkey, role, share in basis points |
| `price-key` | optional: a separate pricing key `K_p` that may quote prices (see Quote) |
| `price-max` | with `price-key`: the highest price in sats a quote may ask. `price` is then the lowest |

The licence text must contain the grant rule:

> I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in binding B, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance.

The wording of the grant rule and licence text is not legal advice and should be reviewed by a lawyer in each case.

### Binding (`kind:3411`, regular)

Signed by `K_a`. Links the artist key to the node that may sell for it. It is a regular event, not a replaceable one, so an old binding cannot be silently swapped for a new one.

| Tag | Value |
|---|---|
| `node` | `K_n`, 66 hex characters |
| `scope` | `*`, or the `d` tags of the offers it covers |
| `node-sig` | `K_n`'s signature over `"MLL-BIND:" ‖ K_a`, in the node's own message-signing format; optional third value `lnd-signmessage` or `nwc-sign_message` says how it was made |
| `revoke-via` | `opreturn` |
| `next` | optional, at most one: SHA-256 of the next artist key `K_a'` (its 32-byte Nostr public key). A pre-rotation commitment |

`K_n` must be a node the artist alone controls: one node per artist. On a shared or custodial node the operator or another tenant can issue invoices "from" `K_n` and take the money while every check passes. A per-user node can make `node-sig` over [NIP-47](47.md) with `sign_message` (Alby Hub with its own node, a self-hosted LND or CLN). Shared faucets and custodial wallets refuse or cannot give a meaningful `node-sig`.

`next` is `hex(SHA-256(K_a'))` over the 32 bytes of the key. Once the binding is dated on Bitcoin with a title timestamp (`MLT1`, below), only `K_a'` itself can retire `K_a` (see Pre-rotation).

### Consent (`kind:3413`)

Signed by each co-owner listed in a `p` tag of the offer.

| Tag | Value |
|---|---|
| `e` | offer id |
| `terms` | the offer's `terms` hash |
| `share` | share in basis points |
| `payout` | Lightning address for the co-owner's share |

An offer with a `p` tag that has no matching consent is not valid. One Lightning payment cannot pay several people at once, so the artist collects and pays each share as a separate payment, then sends each co-owner a signed statement of sales and payouts.

### Quote (`kind:3416`, optional)

For a price set in another currency. The main key `K_a` stays offline and signs the offer once with a `price` floor, a `price-max` ceiling and a `price-key` `K_p`. The online pricing key signs short-lived quotes:

| Tag | Value |
|---|---|
| `e` | offer id |
| `price` | sats, `SATS`; must be between the offer's `price` and `price-max` |
| `expires` | Bitcoin block height after which the quote lapses |

The content may explain the rate (for example "USD 0.10 at 1 USD = 1,230 sats"); it is not checked. The request names the quote (`quote` tag) and its `amount` must equal the quote price. A stolen pricing key can only move the price inside the band the artist signed.

### Owner vouch (`kind:1985`, NIP-32 label)

A party the verifier trusts (a distributor, a collecting society, a label) says which key owns a recording. Tags: `L` = `mll.owner`, `l` = `owner` with namespace `mll.owner`, `p` = owner key, `x` = master SHA-256. The content may hold a registry reference (for example an ISRC). The protocol does not decide who made a song: the verifier chooses which vouchers it trusts.

### Request (`kind:3410`, never published)

Signed by `K_b` and sent only to the seller, as the POST body to the `pay-link`.

| Tag | Value |
|---|---|
| `e` | offer id |
| `terms`, `x` | copied from the offer |
| `use` | use and scope values (must fall within the offer) |
| `licensor` | `K_a` |
| `node` | `K_n` |
| `amount` | millisatoshis |
| `network` | `lnbtc:000000000019d6689c085ae165831e93` |
| `nonce` | 32 random bytes, hex |
| `not-before` | hash of a recent Bitcoin block |

### Revocation (`kind:3412`)

Signed by `K_a`. Tags: `e` (binding or offer id) and `reason` (`compromise` or `retire`). The artist also writes `"MLR1" ‖ revocation id` (36 bytes), or the 80-byte `MLR2` form, in an OP_RETURN output, so the revocation has a date nobody can move.

- **Offer withdrawn (`retire`):** a licence stays valid if its invoice timestamp is earlier than the time of the revocation block, and the licence was dated on Bitcoin no more than 144 blocks (about 24 hours) after that invoice timestamp. There is no extra safety margin. A licence left undated for longer is void, because nothing then shows the invoice came first.
- **Binding revoked (`compromise`, stolen key):** strict. Only licences dated on Bitcoin before the revocation block count.

## Payment flow

1. The buyer finds an offer, fetches the binding and consents, and checks them.
2. The buyer builds the request, serialises it with JCS ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) to `R_bytes`, and POSTs `R_bytes` byte for byte to the `pay-link`.
3. The seller answers `402` with a BOLT 11 invoice signed by `K_n`. The invoice has exactly one `h` (description hash) and no `d`, where:

```
binding = {
  "domain": "x402:exact:lnbtc:bolt11:http:1",
  "method": "POST",
  "url": <pay-link URL>,
  "bodyHash": hex(SHA-256(R_bytes)),
  "headers": [{"name": "content-type", "valueHash": hex(SHA-256(0x01 ‖ "application/json"))}]
}
h = SHA-256(UTF8(JCS(binding)))
```

4. The buyer decodes the invoice strictly, checks it (below), and pays.
5. The preimage `s` completes the licence. The buyer computes the grant digest and timestamps it with OpenTimestamps, using at least two calendars:

```
D = SHA-256(UTF8(JCS({"offer": O.id, "binding": B.id, "request": R.id, "invoice": I, "preimage": s})))
```

The licence the buyer keeps is: offer, binding, consents, request, invoice, preimage and the OTS proof of `D`.

## Verification

Anyone can check a licence without asking the seller:

1. The offer is signed by `K_a`, and SHA-256 of `terms-text` equals `terms`.
2. Every co-owner `p` tag has a valid consent naming the offer.
3. The binding is signed by `K_a`, names `K_n`, covers the offer, and its `node-sig` is valid.
4. The request is signed by `K_b` and matches the offer (id, terms, `x`, use within scope, licensor, node, amount, network).
5. Rebuilding `R_bytes` and the binding object gives the invoice's `h`.
6. The invoice recovers to `K_n`, has exactly one `h`, no `d`, and the right amount.
7. SHA-256(`s`) equals the invoice's payment hash.
8. The OTS proof commits `D` to a block at or after `not-before` and no later than `valid-until` plus 144 blocks.
9. No revocation record (`MLR1`/`MLR2`) for the binding or offer was mined from the binding's `not-before` block up to that block, except an offer withdrawal the licence came before (see Revocation).
10. **Ownership.** Checks 1–9 prove that `K_a` sold this licence and was paid. They do not prove that `K_a` owns the recording. Check 10 reports one of:
   - `verified`: a voucher the verifier trusts signed an owner vouch for `K_a` and `x`, or the chain of title (below), starting from a key such a voucher named, says `K_a` held the rights at the licence's block.
   - `unverified`: no trusted vouch and no title. The licence may still be reported as paid and dated, but never as "owned".
   - `disputed`: a trusted vouch or the chain of title names another key. The licence is refused (`rights_not_holder`, `rights_transferred` or `rights_key_retired`).

A verifier must show the check 10 result next to any "valid". A verifier that needs ownership (a video site, for example) treats `unverified` as a failure.

Check 9 is an absence check. It needs a full node, or trust in one or more independent indexes. A verifier must say which method it used and must not report a licence as valid if check 9 was not done.

## Notes for wallets and sellers

- Some node software drops the description hash if a description is also sent. Sellers should send the hash with an empty description. Buyers must always decode the invoice and check `h` (step 6), which catches this.
- To make the binding's `node-sig` over NIP-47, the seller's app sends `get_info` (for `K_n` and the list of methods) and `sign_message` with `"MLL-BIND:" ‖ K_a`, then checks that the signature recovers to `K_n` before publishing. Status (17 Oct 2026): faucet.nwc.dev refuses `sign_message` (observed; a shared node anyway); Alby Hub lists `sign_message` in its NIP-47 methods (documented, not yet tried with this NIP); the Breez SDK signs messages in its SDK, but its NWC service is not confirmed to offer `sign_message`; phoenixd untested.
- Agents buying over [NIP-47](47.md) should use a connection limited to `pay_invoice` and `lookup_invoice`, with a budget and expiry enforced by the wallet. On a timeout the agent looks the payment up by payment hash and never pays twice.

## Rights transfer, succession and key rotation (draft, optional)

*Status: draft. Implemented and tested in the reference library (`mll-audit` branch `v2`, `src/rights.ts` and `src/verify.ts`, check 10) and in Licence Lab (scenarios S25–S27, attacks A12c, A12d and A20–A23). The kind numbers are placeholders.*

A work is named by its master hash `x`. A key can hand its rights in `x` to another key. `x` = `*` means every work the key holds; this is how a key rotation works. Rights move only by **title records**. A verifier walks them from a key it already accepts as the original owner. That acceptance comes from vouching; the protocol does not decide who made a song.

### Transfer (`kind:3417`)

| tag | value |
|---|---|
| `x` | master SHA-256, or `*` |
| `from` | the key that holds the rights now |
| `to` | the new key |
| `reason` | `sale`, `rotation`, `succession` or `court` |
| `plan` | id of the succession plan (only for `succession`) |
| `p` | each co-owner: key, role, share in basis points (as in the offer) |
| `court` | an optional reference to a court order (only for `court`) |

- `sale` and `rotation` are signed by `from`.
- `succession` is signed by one key named in the plan, and the other plan keys co-sign.
- `court` is signed by the estate's new key.

### Succession plan (`kind:3418`)

Signed by the holder. Tags:

- `x` (or `*`).
- `threshold`: how many plan keys must sign a takeover (1–9).
- `owner-needs`: how many plan keys must co-sign any `sale` or `rotation` the holder signs. The default is 0. With 1 or more, a thief holding the owner's key cannot sell or rotate.
- One `p` per plan key: key and role (`heir`, `executor`, `guardian`).

### Co-signature (`kind:3419`)

Tags: `e` = transfer id, and `role` = `co-owner` or `plan-key`.

### Timestamp

A record counts only once it is dated on Bitcoin:

```
T = SHA-256(UTF8(JCS({"record": <record id>, "cosigns": [sorted co-signature ids]})))
OP_RETURN "MLT1" ‖ T        (36 bytes)
```

An OpenTimestamps proof of `T` is also accepted. `T` commits to the co-signatures collected so far, so a co-signature added after the date does not count. To add one, timestamp the same record again with the larger set. A plan is timestamped with `cosigns: []`.

### Chain of title (part of check 10)

Sort the records for `x` by timestamp height, earliest first. Start with `holder` = the accepted original key. For each record:

1. It must be validly signed and well formed, and its `from` must equal the current `holder`. Otherwise it is void. If `from` held the rights earlier, it is a double sale or a stolen old key.
2. **`sale` or `rotation`:** signed by `from`. If a plan by `from` was timestamped before it and has `owner-needs` = n, then n plan keys must have co-signed. **Pre-rotation:** if a binding by `from` with a `next` tag was dated (MLT1 of the binding id) before this record, a `rotation` must be signed by the next key itself, its `to` must be that key, and SHA-256 of `to` must equal `next`. Any other rotation of `from` is void.
3. **`succession`:** the named plan must be by `from`, cover `x`, and be timestamped before the takeover. At least `threshold` distinct plan keys must sign: the signer plus co-signers.
4. **`court`:** the protocol cannot decide. The record counts only for a verifier that trusts a voucher which signed a NIP-32 label (`l` = `court-order`, `e` = transfer id). The verifier must say that the result rests on that voucher.
5. **`sale` and `court`:** every co-owner `p` in the record must have co-signed.
6. If all of this holds, `holder` = `to`.

**Check 10 for a licence anchored at height H**, with the offer signed by `K`:

- **Valid:** `K` is the holder at H, counting records mined at or before H.
- **Refused:**
  - `rights_transferred`: `K` handed the rights on at a height ≤ H.
  - `rights_key_retired`: as above, but the hand-over was a rotation.
  - `rights_not_holder`: `K` never held the rights, or not yet.
- **Grace:** as for offer withdrawals, a licence whose invoice timestamp is earlier than the transfer block's time, and which was dated within 144 blocks of that invoice, stays the old holder's. This does not apply to `rotation`, because a thief could backdate the invoice.
- **No records:** if a verifier has no title records for `x`, it behaves exactly as before. It must say that it did not check the title.

**Results:**

- The first timestamped transfer wins, so a second sale of the same rights is void.
- Licences sold before a transfer stay valid. After it, only the new key can sell.
- A key rotation after a theft makes every later sale by the stolen key fail, even under a new binding. This closes the gap in which a binding revocation alone does not stop a new binding signed by the stolen key.

### Limits

- A verifier sees only the title records it can fetch. Publish them to several relays, as with revocations.
- Without pre-rotation, a thief who rotates before the owner wins the race, unless an earlier plan set `owner-needs` of 1 or more. With a dated `next` commitment, the thief cannot rotate at all; the owner must keep the next key offline.
- Pre-rotation and title checks need the binding and title records; a verifier that cannot fetch them reports check 10 as `unverified`.
- The protocol cannot see a death. The plan trusts the people it names, and the owner chooses the threshold.
- With no plan, inheritance is decided by a court. Verifiers may disagree, depending on which registries they trust.

## Future extensions (not part of this NIP)

Exclusive licences (on-chain reservations with a time-lock cap), a signed daily status record for light verifiers, and a `max_total_cltv` field for NIP-47 are sketched in the design write-up, which is being revised. They are left out here until they have running code and outside review. Exclusivity and the status record are not in the reference library.

## Reference implementation

`nostr-commerce-skill` (link once the licence branch matches this document). Local reference library: `mll-audit` branch `v2` (checks 1–10, quotes, owner vouch, pre-rotation, NWC binding), 289 tests; live test on Mutinynet on 17 Oct 2026 (see the Mutinynet report).
