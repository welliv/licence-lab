// Live probe: an Alby Hub (LDK backend, Mutinynet) as a Licence Lab seller node, over NWC. Reads the NWC URI from ALBY_NWC_FILE; prints no secrets.
import WebSocket from 'ws'; (globalThis as any).WebSocket = WebSocket;
import fs from 'node:fs';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { Nwc } from '../src/live/nwc';
import { bindingViaNwc } from '../src/lib/mll/nodebind';
import { recoverLnMessage } from '../src/lib/mll/lnmsg';
import { bindMessage, tagv, verifyEvent } from '../src/lib/mll/events';
import { decodeInvoice } from '../src/lib/mll/bolt11';
import { sha256 } from '@noble/hashes/sha256'; import { bytesToHex } from '@noble/hashes/utils';
const nwc = new Nwc(fs.readFileSync(process.env.ALBY_NWC_FILE!, 'utf8').trim()); nwc.enc = (process.env.NWC_ENC as any) ?? 'nip44_v2';
const out: Record<string, unknown> = {};
const info = await nwc.getInfo(); out.get_info = { alias: info.alias, pubkey: info.pubkey, network: info.network, methods: info.methods };
const artist = generateSecretKey(); const artistPub = getPublicKey(artist);
const raw = await nwc.signMessage(bindMessage(artistPub)); out.sign_message = { signatureLength: raw.signature.length, prefix: raw.signature.slice(0, 6), recoversTo: recoverLnMessage(bindMessage(artistPub), raw.signature) };
const { binding, node } = await bindingViaNwc(nwc, artist);
out.binding = { ok: verifyEvent(binding), node, method: binding.tags.find(t => t[0] === 'node-sig')?.[2], nodeSigRecovers: recoverLnMessage(bindMessage(binding.pubkey), tagv(binding, 'node-sig')!) === node };
const dh = bytesToHex(sha256(new TextEncoder().encode('licence request ' + binding.id)));
try { const inv = await nwc.makeInvoice(100, { descriptionHash: dh }); const d = decodeInvoice(inv.invoice);
  out.make_invoice = { prefix: inv.invoice.slice(0, 10), payeeIsNode: d.payee === node, descriptionHashMatches: d.descriptionHash === dh, amountMsat: (d as any).amountMsat ?? (d as any).msat };
} catch (e: any) { out.make_invoice = { error: e.code, message: e.message }; }
console.log(JSON.stringify(out, (_k, v) => typeof v === "bigint" ? String(v) : v, 2)); nwc.close(); process.exit(0);
