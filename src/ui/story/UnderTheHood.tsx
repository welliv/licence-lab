// "Under the hood": everything the story hides, skimmable. Nothing was deleted from the Lab; it moved here.
import { SCENARIOS, PARTS } from '../../scenarios';
import { ATTACKS } from '../../engine/attacks';
import { go } from '../store';
import { TierBadge } from '../bits';
import { ShieldCheck, Swords, Globe, Radio, Library, FileText, HelpCircle, ArrowLeft } from 'lucide-react';
export const GLOSSARY: [string, string][] = [
  ['Nostr', 'An open network of relays that pass on signed notes. Anyone can read them; nobody owns it.'],
  ['Key and signature', 'A secret only Ava holds signs her notes; anyone can check the signature with her public key.'],
  ['Relay', 'A server that stores and passes on Nostr notes. Use several, so none can hide one.'],
  ['Offer (kind 30402)', 'Ava\'s signed price, use and licence text for one track.'],
  ['Consent (kind 3413)', 'A co-owner\'s signed "yes" to an offer and their share.'],
  ['Binding (kind 3411)', 'Ava\'s key and her Lightning node sign each other, so payments go only to her.'],
  ['Lightning', 'Bitcoin payments that settle in seconds for a fraction of a cent.'],
  ['sats', 'The smallest unit of bitcoin (100 million to one bitcoin). Here they are test sats.'],
  ['Invoice (BOLT 11)', 'A payment request signed by the seller\'s node. Its description hash commits to the buyer\'s exact request.'],
  ['Preimage', 'The secret released when an invoice is paid: the proof it was paid.'],
  ['x402', '"402 Payment Required" for apps and agents: ask for a resource, get an invoice, pay, get it.'],
  ['NWC (Nostr Wallet Connect)', 'A wallet connection an agent can use only within limits a person set (per payment, per day, expiry).'],
  ['OP_RETURN', 'A tiny note inside a Bitcoin transaction. It fixes a date nobody can move.'],
  ['OpenTimestamps', 'Many fingerprints batched into one Bitcoin transaction, with a small proof for each.'],
  ['Mutinynet', 'A public Bitcoin test network with 30-second blocks. Our live runs use it; nothing costs real money.'],
  ['verifyLicence', 'The one function that runs the nine checks. It trusts no server and needs no one online.'],
  ['Transfer record (kind 3417, draft)', 'Signed note that moves the rights in a track to a new key. Co-owners co-sign; the first dated one wins.'],
  ['Succession plan (kind 3418, draft)', 'Names who may take over, and how many must agree (for example 2 of 3).'],
  ['Key rotation', 'A transfer to your own new key, after a theft. The old key can no longer sell.'],
  ['Track fingerprint (x)', 'The SHA-256 of the audio file. The offer names it, so the licence is for that exact file.'],
];
const Card = ({ icon, title, body, to, right }: { icon: React.ReactNode; title: string; body: string; to: string; right?: React.ReactNode }) =>
  <button onClick={() => go(to)} className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-neutral-400"><span className="mt-0.5 text-neutral-500">{icon}</span><span className="flex-1"><span className="flex items-center gap-2 font-semibold">{title}{right}</span><span className="mt-0.5 block text-[13px] leading-5 text-neutral-500">{body}</span></span></button>;
export function UnderTheHood() {
  return <div className="mx-auto max-w-[1000px] px-5 py-8 md:px-8">
    <button onClick={() => go('')} className="mb-4 inline-flex items-center gap-1 text-[13px] text-neutral-500 hover:text-neutral-900"><ArrowLeft size={13} />Back to the story</button>
    <h1 className="text-[28px] font-bold tracking-tight">Under the hood</h1>
    <p className="mt-2 max-w-[680px] text-[15px] leading-6 text-neutral-600">Everything the story hides. Signatures, invoices, timestamps and checks are real, made by the protocol library in your browser. Money, relays and Bitcoin blocks are simulated unless a page says otherwise.</p>
    <div className="mt-3 flex flex-wrap gap-1.5"><TierBadge b="real" /><TierBadge b="sim" /><TierBadge b="limit" /><TierBadge b="open" /><TierBadge b="recorded" /></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card icon={<Swords size={18} />} title="Try to break it" body={`${ATTACKS.length} attacks against the real checks, with a score.`} to="redteam" />
      <Card icon={<ShieldCheck size={18} />} title="Check a licence file" body="Paste or open a licence, or check an audio file's fingerprint." to="verify" />
      <Card icon={<Globe size={18} />} title="Live test wallets" body="Real Lightning payments on a public test faucet." to="live" right={<TierBadge b="real" />} />
      <Card icon={<Radio size={18} />} title="Real runs on Bitcoin's test network" body="Recorded Mutinynet proofs: a purchase, a revocation, a timestamp." to="hood/runs" right={<TierBadge b="recorded" />} />
      <Card icon={<Library size={18} />} title="Protocol library" body="The audited library, byte for byte, plus the rights extension." to="about/library" />
      <Card icon={<FileText size={18} />} title="White paper and spec" body="The nine checks and event kinds." to="about/paper" />
    </div>
    <h2 className="mt-10 text-[18px] font-semibold">Explore all scenarios ({SCENARIOS.length})</h2>
    <div className="mt-3 grid gap-6 md:grid-cols-2">{([1, 2, 3, 4, 5, 6] as const).map(p => <div key={p}><div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-neutral-400">{p}. {PARTS[p]}</div>
      <ul className="space-y-0.5">{SCENARIOS.filter(s => s.part === p).map(s => <li key={s.id}><button onClick={() => go(s.id)} className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-[14px] hover:bg-neutral-50"><span className="w-5 text-center">{s.emoji}</span><span><span className="font-medium">{s.n}. {s.title}</span><span className="block text-[12px] text-neutral-500">{s.summary}</span></span></button></li>)}</ul></div>)}</div>
    <h2 id="glossary" className="mt-10 text-[18px] font-semibold">Words, in one line each</h2>
    <dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">{GLOSSARY.map(([k, v]) => <div key={k}><dt className="text-[14px] font-semibold">{k}</dt><dd className="text-[13px] leading-5 text-neutral-600">{v}</dd></div>)}</dl>
    <div className="mt-10 flex flex-wrap gap-4 text-[13px] text-neutral-500"><button className="inline-flex items-center gap-1 underline" onClick={() => go('about/help')}><HelpCircle size={13} />Help</button><span>Test keys only. Never paste a real key or wallet.</span></div>
  </div>;
}
