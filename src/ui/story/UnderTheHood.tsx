// "Under the hood": everything the story hides, skimmable. Nothing was deleted from the Lab; it moved here.
import { useState } from 'react';
import { byId } from '../../scenarios';
import { S22_LINE } from '../groups';
import { GUIDE, GUIDE_GROUPS, MORE } from '../guide';
import { TOOLS } from '../Sidebar';
import { ATTACKS } from '../../engine/attacks';
import { go } from '../store';
import { Swords, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
export const GLOSSARY: [string, string][] = [
  ['Nostr', 'An open network of relays that pass on signed notes. Anyone can read them; nobody owns it.'],
  ['Key and signature', 'A secret only Alice holds signs her notes; anyone can check the signature with her public key.'],
  ['Relay', 'A server that stores and passes on Nostr notes. Use several, so none can hide one.'],
  ['Offer (kind 30402)', 'Alice\'s signed price, use and licence text for one track.'],
  ['Consent (kind 3413)', 'A co-owner\'s signed "yes" to an offer and their share.'],
  ['Binding (kind 3411)', 'Alice\'s key and her Lightning node sign each other, so payments go only to her.'],
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
export function UnderTheHood() {
  const [more, setMore] = useState(false); const first = GUIDE[0];
  return <div className="mx-auto max-w-[860px] px-5 py-8 md:px-8" data-testid="hood-landing">
    <button onClick={() => go('')} className="mb-4 inline-flex items-center gap-1 text-[13px] text-neutral-500 hover:text-neutral-900"><ArrowLeft size={13} />Back to the story</button>
    <h1 className="text-[30px] font-bold tracking-tight">Under the hood</h1>
    <p className="mt-2 text-[16px] leading-7 text-neutral-600">Fifteen short scenarios, simplest first. Each one shows who is involved, gives you one button per step, and logs who paid whom.</p>
    <button onClick={() => go(first.id)} data-testid="start-here" className="mt-6 flex w-full items-center gap-4 rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 p-5 text-left hover:border-emerald-500">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[17px] font-bold text-white">1</span>
      <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Start here</span><span className="block text-[19px] font-semibold">{first.title}</span><span className="block text-[14px] text-neutral-600">{first.line}</span></span><ArrowRight className="shrink-0 text-emerald-700" size={20} /></button>
    <div className="mt-8 grid gap-6 sm:grid-cols-2" data-testid="hood-groups">{GUIDE_GROUPS.map(g => <section key={g.id} data-group={g.id}><h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{g.title}</h2>
      <ol className="mt-1.5 space-y-0.5">{GUIDE.filter(x => x.group === g.id).map(x => <li key={x.id}><button onClick={() => go(x.id)} data-testid={`hood-item-${x.n}`} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-neutral-100"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-semibold tabular-nums text-neutral-500">{x.n}</span><span className="font-medium">{x.title}</span></button></li>)}
        {g.id === 'safety' && <li><button onClick={() => go('redteam')} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-neutral-100"><span className="flex h-6 w-6 items-center justify-center text-neutral-400"><Swords size={14} /></span><span className="font-medium">Try to break it</span><span className="text-[13px] text-neutral-500">a game, {ATTACKS.length} attacks</span></button></li>}</ol></section>)}</div>
    <div className="mt-8 border-t border-neutral-200 pt-4"><button onClick={() => setMore(!more)} aria-expanded={more} className="inline-flex items-center gap-1 text-[14px] font-medium text-neutral-600 hover:text-neutral-900" data-testid="more-toggle"><ChevronRight size={14} className={more ? 'rotate-90 transition-transform' : 'transition-transform'} />More scenarios ({MORE.length}) and tools for builders</button>
      {more && <div className="fade-in mt-3 space-y-5"><ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">{MORE.map(m => <li key={m.id}><button onClick={() => go(m.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[14px] hover:bg-neutral-100"><span className="w-5 text-center">{byId(m.id)?.emoji}</span>{m.title}</button></li>)}</ul>
        <div className="flex flex-wrap gap-2">{TOOLS.map(t => <button key={t.to} onClick={() => go(t.to)} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-[13px] hover:bg-neutral-100">{t.icon}{t.label}</button>)}</div>
        <details id="glossary"><summary className="cursor-pointer text-[14px] font-medium">Words, in one line each</summary><dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">{GLOSSARY.map(([k, v]) => <div key={k}><dt className="text-[14px] font-semibold">{k}</dt><dd className="text-[13px] leading-5 text-neutral-600">{v}</dd></div>)}</dl></details>
        <p className="text-[13px] text-neutral-500">{S22_LINE}</p></div>}</div>
  </div>;
}
