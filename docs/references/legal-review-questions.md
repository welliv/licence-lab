# Questions for legal review: Music Licence Link

For: a copyright and contract lawyer in England and Wales, and one in the United States. Other countries can follow the same list.
From: welliv, 12 October 2026.
Read with: the project overview ([`../paper/nostr-powered-music-project-v3.pdf`](../paper/nostr-powered-music-project-v3.pdf)) and the draft NIP ([`nip-xx-music-licence-offers-draft.md`](nip-xx-music-licence-offers-draft.md)). Section numbers below refer to the design write-up these questions were first written against, which is being revised.

**What the system does, in two sentences.** An artist publishes a signed offer to license a recording for a stated use at a stated price. A buyer signs a request, pays a Lightning invoice that is tied to her request, and the payment's secret (the "preimage") is the proof that the licence was granted (design write-up §2–§3).

We are not asking whether the idea is good. We are asking whether the steps below have the legal effect we claim, and what we would need to change if they do not.

## A. Formation of the licence

1. **Offer and acceptance.** The offer text contains this grant rule: "I grant this licence to the holder of the key that signed any request naming this offer, when an invoice signed by the node in binding B, whose description hash commits to that request, is paid. The preimage of that invoice is the proof of acceptance." Does this create a binding licence (or contract) at the moment of payment, in England and Wales and in the US? If not, what wording would?
2. **Unilateral or bilateral.** Is this best analysed as a unilateral offer accepted by performance (payment), or as a contract formed when the seller's node issues the invoice? Does the answer change what the seller can withdraw, and when?
3. **Proof of acceptance.** The preimage is also known to the seller and to each node that forwarded the payment, so it proves that the payment was made, not who made it. The licensee is defined as "whoever controls the buyer's key". Is a licence to "the holder of a key" valid, and can the holder enforce it?
4. **Identity of the licensor.** The artist signs with a pseudonymous key. Attesters sign statements that "this key is this artist". If the key is in fact the artist's, is she bound even if the buyer did not know her legal name? What is the position of an attester whose statement is false?
5. **Terms by hash.** The licence text is fixed by its SHA-256 hash, and the full text is published with the offer. Is incorporation of terms in this way sufficient, including for consumer buyers?
6. **Software agents.** Where an AI agent signs the request and pays from a budget set by its principal, is the principal bound as the licensee? Does anything in the Electronic Commerce Directive regime (UK) or E-SIGN / UETA (US, including UETA §14 on electronic agents) affect this?

## B. Signatures and "writing"

7. **Exclusive licences.** CDPA 1988 s.92(1) requires an exclusive licence to be "in writing signed by or on behalf of the copyright owner". 17 U.S.C. §204(a) requires a transfer of ownership, including an exclusive licence, to be "in writing and signed by the owner of the rights conveyed or such owner's duly authorized agent". Do these together count as such writing and signature:
   (a) the artist's BIP-340 (Schnorr) signature on the offer, which fixes the licence text by hash;
   (b) each co-owner's signed consent naming the offer;
   (c) the invoice signed by the artist's Lightning node key, which is named in a binding signed by the artist's root key;
   (d) the reservation signature made by a reservation key named in that binding?
   If not, what is the minimum change (for example, a separate signed grant after payment)?
8. **Delegated keys.** The artist's root key signs a binding that authorises an online node key and a reservation key. Is a signature by a delegated key a signature "on behalf of" the owner for s.92(1), and by a "duly authorized agent" for §204(a)?
9. **Electronic signatures generally.** Is a cryptographic signature with no name attached an electronic signature under the Electronic Communications Act 2000 s.7 and UK eIDAS, and under E-SIGN / UETA?

## C. Co-owners and collection

10. **Joint ownership.** CDPA s.173(2) requires every joint owner to authorise. Is a signed consent by each co-owner, naming the offer and its terms hash, enough authorisation for the licence to bind all of them? Does the US rule (any co-owner may grant a non-exclusive licence, subject to a duty to account) mean the system can relax this for US non-exclusive licences?
11. **Artist as collector.** The buyer pays the artist alone, who then pays each co-owner's share and sends a signed statement (spec §G). Does this create a trust, an agency, or only a contractual duty to account? Does anything in it need a licence or registration (for example, as a payment service or a collecting body)?

## D. Order of grants and exclusivity

12. **Prior non-exclusive licences.** An exclusive offer commits to the list (Merkle root) of non-exclusive licences already sold for the same use, and the exclusive is stated to be subject to them. Is that effective against the exclusive licensee? What about a non-exclusive licence the artist grants **after** the exclusive (a breach by her)? Does its buyer keep any right to use, or only a claim against the artist?
13. **"First in the chain wins".** The exclusive belongs to the first valid reservation completed within the window, as recorded on the Bitcoin chain (design write-up §5). If the artist signs two exclusives for the same use, will a court follow that rule, or apply its own priority rules (for example, US recordation under 17 U.S.C. §205, or notice)?
14. **Deposit.** A buyer pays a 1% deposit to reserve an exclusive and loses it if she does not complete, or if an earlier reservation wins. Is this enforceable, or could it be a penalty, or a consumer-law problem?
15. **Revocation.** If the artist's node key is stolen, she publishes a revocation; grants timestamped after it are invalid under the rule. Is a buyer who paid the thief in good faith after the revocation protected in any way? And are grants made by the thief **before** revocation binding on the artist, as the paper says (spec §I)?

15a. **Withdrawing an offer (V2 rule).** A licence stays valid if the buyer's invoice came before the block that records the withdrawal, provided the licence was timestamped within about a day. Is a buyer who paid in that window, but whose timestamp came later than a day, left with only a refund claim? Is "timestamp within a day" a fair term to put in the offer text?
15b. **Pricing key.** The artist's main key signs a price range; a separate online key signs short-lived quotes inside it. If that pricing key is stolen and quotes the lowest price in the range, is the artist bound by sales at that price?

## E. Evidence and liability

16. **Evidence.** Will an English or US court admit and give weight to: signatures checked by software, an OpenTimestamps proof anchored in a Bitcoin block, and Bitcoin block heights as evidence of the time of a grant? What would an expert report need to show?
17. **Title risk.** The system proves what keys granted, not who owns the recording. If the grantor lacked the rights, the buyer is exposed to the true owner (US statutory damages of $750 to $150,000 per work, 17 U.S.C. §504(c)). Can the offer text usefully include a warranty of title and an indemnity? Does a buyer who relied on the signed record and on attestations have any "innocent infringer" or good-faith argument?
18. **Attesters.** What liability does an attester take on by signing "this key is this artist, who holds these recordings", if it is wrong? Can that liability be limited in the attestation itself? (Since V2 the software shows "owner verified" only on such an attestation, the "owner vouch", from an issuer the checker chose to trust.)
19. **Withholding and refusal.** A seller who refuses to issue an invoice makes no sale. Is there any duty to deal once an offer is published (for example, under consumer or competition law)?

## F. Regulatory

20. **Payments.** Does a seller who receives Lightning payments on her own node, or an artist who forwards co-owners' shares, need any authorisation in the UK (Payment Services Regulations 2017, money-laundering rules for cryptoasset businesses) or the US (money transmission)?
21. **Consumer law.** Where the buyer is a consumer, do the Consumer Contracts Regulations 2013 (pre-contract information, cancellation rights for digital content) require anything that the offer and request must carry?
22. **Data protection.** The request R, held by the seller, contains the buyer's key, the use and the project. Is any of this personal data under UK GDPR, and if so, what must the seller do?

## What we need back

For each question: the answer in one or two sentences for each country, the main authority, and, where the answer is "no" or "unclear", the smallest change to the protocol or the offer text that would make it "yes".
