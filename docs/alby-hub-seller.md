# Alby Hub as a seller node (tested 18 October 2026)

**Question:** can an artist who runs Alby Hub be a Licence Lab seller node? That needs two things from her node:
1. Sign the binding message `MLL-BIND:<artist pubkey>` with the Lightning node key (check 3).
2. Make invoices whose `description_hash` commits to the exact licence request (check 5).

**Answer: yes, with Alby Hub's own node (LDK, LND or CLN backend) and a normal app connection. Not with a sub-wallet.**

## What was run
- Alby Hub v1.24.3 server build (sha256 of the release archive matches the signed manifest), LDK backend, on Mutinynet (`NETWORK=signet`, `LDK_ESPLORA_SERVER=https://mutinynet.com/api`). Set up, started and unlocked over its HTTP API, no GUI.
- One NWC app connection with the scopes `get_info, make_invoice, lookup_invoice, sign_message, get_balance`.
- `scripts/alby-hub-probe.mts`: `get_info` reports the node key and `sign_message`; the signature recovers to the node key with the existing `recoverLnMessage` (LND/CLN zbase32 format; LDK uses the same `Lightning Signed Message:` scheme). `bindingViaNwc` makes a binding that passes check 3 unchanged. `make_invoice` with only `description_hash` gives an `lntbs` invoice whose payee is the bound node and whose description hash matches.
- `scripts/alby-hub-sale.mts`: a full sale for 100 test sats. A Mutinynet LND node (test coins) opened a 30,000 sat channel to the Hub, then paid the Hub's invoice. Result: `clientCheck` passed, payment SUCCEEDED, the Hub's `lookup_invoice` shows it settled, and `verifyLicence` passed checks 0 to 7. A wrong preimage is refused (`preimage`). Checks 8 and 9 (Bitcoin anchor, revocation scan) were not run here; they do not depend on the seller's wallet.
- `tests/alby-hub-binding.test.ts`: a real Alby Hub signature as a fixture, plus refusal cases.

## Limits found
- **Sub-wallets can't bind.** Alby Hub refuses to create an isolated (sub-wallet) connection with `sign_message` ("Sub-wallet app connection cannot have sign_message scope"). faucet.nwc.dev is built on such sub-wallets: its `get_info` omits `sign_message` and a call returns `RESTRICTED`. This matches the protocol's rule that a shared node proves nothing.
- **Inbound liquidity is needed to get paid.** With no channel, `make_invoice` failed: `LiquidityRequestFailed` (the JIT LSP is not available on Mutinynet). With JIT turned off, the invoice was made but was unpayable until a channel was opened to the Hub. On mainnet, Alby's LSP opens a JIT channel on the first payment and takes a fee.
- **Send `description_hash` without `description`.** On the LDK backend, a non-empty `description` wins and the hash is ignored. Licence Lab's client already sends the hash alone.
- **Phoenixd and Bark backends don't implement `sign_message`**, so a Hub on those backends can't bind.
- **No OP_RETURN over NWC.** Anchoring and revocation (MLA1/MLR2) need an on-chain wallet or a timestamp service; Alby Hub's NWC interface does not offer that.
