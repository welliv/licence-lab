// The main path: a 60-second first experience and four short chapters. Plain words only; the technology is one tap away.
import { useState, type ReactNode } from 'react';
import { Play, Pause, Loader2, CheckCircle2, XCircle, ChevronDown, ExternalLink, ArrowRight, Moon, Sun, Wrench } from 'lucide-react';
import { music, useMusic } from '../music';
import { Art } from '../MiniPlayer';
import { cx } from '../bits';
import { go } from '../store';
import { NINE, short, type Verdict } from '../../engine/lab';
import { youBuy, PRICE, artistSells, agentBuys, anyoneVerifies, forgedCopy, rightsChange } from '../../engine/story';
import { useStory, story, sleep } from './state';
import { useProof } from './proof';
import { verdictLine, plainReason } from '../plain';
import { Lab } from '../../engine/lab';

export const HEADLINE = 'Artists license their music directly. Any agent can buy it in seconds and prove it on Bitcoin.';
export const SHORT = 'Music rights, sold directly, bought by any agent, proven on Bitcoin.';
const CHAPTERS: [string, string][] = [['', 'Listen'], ['c1', 'Artist sells'], ['c2', 'Agent buys'], ['c3', 'Anyone verifies'], ['c4', 'Rights change hands']];

export function BigButton({ children, onClick, disabled, variant = 'primary', ...p }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'quiet' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} onClick={onClick} disabled={disabled} className={cx('inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full px-8 text-[17px] font-semibold transition-all disabled:cursor-wait',
    variant === 'primary' ? 'bg-neutral-900 text-white shadow-lg hover:scale-[1.02] hover:bg-neutral-800 disabled:opacity-80 disabled:hover:scale-100' : 'text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900')}>{children}</button>;
}

/** Slim top bar with the progress indicator. No sidebar on the main path. */
export function StoryShell({ path, children }: { path: string; children: ReactNode }) {
  const st = useStory(); const cur = CHAPTERS.findIndex(([p]) => p === (['start', 'home'].includes(path) ? '' : path));
  const done = (i: number) => i === 0 ? st.home.phase === 'done' : !!(st as any)[`c${i}`];
  return <div className="flex h-full flex-col">
    <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 md:px-8">
      <button onClick={() => go('')} className="flex items-center gap-2 text-[15px] font-bold tracking-tight" aria-label="Licence Lab home"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-700 via-violet-600 to-sky-500 text-[14px] text-white">♪</span><span className="hidden sm:inline">Licence Lab</span></button>
      <nav aria-label="Progress" className="mx-auto flex items-center gap-1 md:gap-2">{CHAPTERS.map(([p, label], i) => <button key={p || 'home'} onClick={() => go(p)} aria-current={i === cur ? 'step' : undefined} title={label}
        className={cx('flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] transition-colors md:px-3', i === cur ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900')}>
        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold', i === cur ? 'bg-white/20' : done(i) ? 'bg-emerald-500 text-white' : 'border border-neutral-300')}>{done(i) && i !== cur ? '✓' : i === 0 ? '♪' : i}</span>
        <span className={cx(i === cur ? 'inline' : 'hidden lg:inline')}>{label}</span></button>)}</nav>
      <ThemeButton />
      <button onClick={() => go('hood')} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50"><Wrench size={13} /><span className="hidden sm:inline">Under the hood</span></button>
    </header>
    <main className="scroll-thin flex-1 overflow-y-auto">{children}
      <footer className="px-6 py-6 text-center text-[12px] text-neutral-400">Test money and test keys only · demo names on owner-supplied recordings (see Credits)</footer></main>
  </div>;
}
function ThemeButton() { const [d, setD] = useState(() => document.documentElement.classList.contains('dark'));
  return <button aria-label={d ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => { document.documentElement.classList.toggle('dark', !d); try { localStorage.setItem('ll.theme', d ? 'light' : 'dark'); } catch {} setD(!d); }} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">{d ? <Sun size={15} /> : <Moon size={15} />}</button>; }

/** One verdict, the nine checks behind a tap. */
export function VerdictCard({ v, title, compact }: { v: Verdict; title?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false); const ok = v.result.ok;
  return <div className={cx('fade-in rounded-2xl border text-left', ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50', compact ? 'p-4' : 'p-6')} data-testid="verdict">
    {title && <div className="mb-1 text-[13px] text-neutral-500">{title}</div>}
    <div className={cx('flex items-start gap-3 font-semibold', compact ? 'text-[18px]' : 'text-[24px] leading-tight', ok ? 'text-emerald-700' : 'text-red-700')}>{ok ? <CheckCircle2 className="mt-0.5 shrink-0" size={compact ? 22 : 28} /> : <XCircle className="mt-0.5 shrink-0" size={compact ? 22 : 28} />}<span>{verdictLine(v)}</span></div>
    <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-[14px] text-neutral-600 hover:text-neutral-900"><ChevronDown size={15} className={cx('transition-transform', open && 'rotate-180')} />{open ? 'Hide' : 'Show'} the 9 checks</button>
    {open && <ol className="fade-in mt-3 space-y-1.5 text-[14px]">{v.checks.map(c => <li key={c.n} className="flex items-start gap-2"><span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', c.status === 'pass' ? 'bg-emerald-500 text-white' : c.status === 'fail' ? 'bg-red-500 text-white' : 'bg-neutral-200 text-neutral-500')}>{c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : c.n}</span>
      <span className="text-neutral-700">{c.label}{c.status === 'fail' && c.detail && <span className="block text-[12px] text-red-700">{c.detail}</span>}</span></li>)}
      {v.file && <li className="flex items-start gap-2"><span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]', v.file.ok ? 'bg-emerald-500 text-white' : 'bg-neutral-200')}>♪</span><span className="text-neutral-700">The audio file is the one in the offer{v.file.ok ? ' (fingerprint matches)' : `: ${v.file.reason}`}</span></li>}
      {!ok && <li className="pt-1 text-[12px] text-neutral-500">Technical reason: <code>{v.result.code}</code> · {v.result.reason}</li>}
      <li className="pt-1"><button onClick={() => go('hood')} className="text-[13px] text-neutral-500 underline underline-offset-4">What do these mean?</button></li></ol>}
  </div>;
}

/** Home: hear "Rain" → license for 100 sats → licensed and proven → full track. */
export function Home() {
  useMusic(); const st = useStory(); const h = st.home; const hero = music.hero(); const playing = music.isPlaying(hero?.id ?? null) || (music.mode === 'tone' && music.isPlaying()); const proof = useProof();
  const listen = () => { music.toggle(hero?.id ?? null); if (h.phase === 'idle') story.set({ phase: 'listening' }); };
  const buy = async () => { story.set({ phase: 'buying', label: `Paying ${PRICE} sats…` }); await sleep(350); const lab = new Lab('home'); story.set({ label: 'Checking the licence…' });
    const out = await youBuy(lab); await sleep(300); story.set({ label: 'Proving it on Bitcoin…' }); await sleep(350);
    if (out.verdict.result.ok && hero) { music.unlock(hero.id, { how: `Licensed on the home page: all 9 checks passed${out.verdict.file?.ok ? '; file fingerprint matches the offer' : ''}`, fileOk: out.verdict.file?.ok, holder: 'you' }); if (!music.isPlaying(hero.id)) music.toggle(hero.id); }
    story.set({ phase: 'done', lab, out, label: '' }); };
  const done = h.phase === 'done' && h.out?.verdict.result.ok;
  return <div className="mx-auto flex max-w-[860px] flex-col items-center px-6 pb-10 pt-10 text-center md:pt-16">
    <h1 className="text-[34px] font-bold leading-[1.08] tracking-tight md:text-[52px]">Artists license their music directly. <span className="text-neutral-500">Any agent can buy it in seconds and prove it on Bitcoin.</span></h1>
    <div className="mt-8 flex flex-col items-center md:mt-12">
      <button onClick={listen} className="group relative rounded-2xl shadow-2xl" aria-label={playing ? 'Pause Rain' : 'Play Rain'}><Art t={hero} size={200} />
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition group-hover:bg-black/20"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">{playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}</span></span></button>
      <div className="mt-5 text-[22px] font-semibold">"Rain" <span className="font-normal text-neutral-500">· Ava</span></div>
      <div className="mt-1 text-[14px] text-neutral-500">{done ? 'Full track' : music.unlocked(hero?.id) ? 'Full track (licensed earlier)' : '30-second preview'}</div>
    </div>
    <div className="mt-8 flex min-h-[150px] flex-col items-center gap-4">
      {h.phase === 'idle' && <BigButton onClick={listen}><Play size={18} />Hear "Rain"</BigButton>}
      {h.phase === 'listening' && <BigButton onClick={buy}>License for {PRICE} sats</BigButton>}
      {h.phase === 'buying' && <BigButton disabled><Loader2 size={18} className="animate-spin" />{h.label}</BigButton>}
      {h.phase === 'done' && h.out && (done ? <div className="fade-in flex flex-col items-center gap-3" data-testid="licensed">
          <div className="rounded-full bg-emerald-500/15 px-6 py-3 text-[22px] font-semibold text-emerald-700">Licensed ✓ Proven on Bitcoin</div>
          <div className="text-[15px] text-neutral-600">The full track is unlocked. Paid {PRICE} test sats; all 9 checks passed in your browser.</div>
          {proof ? <a href={proof.txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[15px] text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900" data-testid="proof-link">See a real proof on Bitcoin{proof.block ? ` (block ${Number(proof.block).toLocaleString('en-GB')})` : ''}<ExternalLink size={14} /></a>
            : proof === null ? <span className="text-[13px] text-neutral-500">No recorded Bitcoin proof yet.</span> : null}
          {proof && <p className="max-w-[520px] text-[12px] leading-5 text-neutral-400">That link is a licence our live run proved on Mutinynet, Bitcoin's test network. Your click ran the same checks here, on a practice chain.</p>}
          <div className="mt-3"><BigButton onClick={() => go('c1')}>See how it works <ArrowRight size={18} /></BigButton></div></div>
        : <VerdictCard v={h.out.verdict} />)}
    </div>
  </div>;
}

function Chapter({ n, title, why, children }: { n: number; title: string; why: string; children: ReactNode }) {
  return <div className="mx-auto flex max-w-[760px] flex-col px-6 pb-10 pt-10 md:pt-16">
    <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Chapter {n} of 4</div>
    <h1 className="mt-2 text-[36px] font-bold leading-tight tracking-tight md:text-[48px]">{title}</h1>
    <p className="mt-4 text-[19px] leading-8 text-neutral-600">{why}</p>
    <div className="mt-10 space-y-6">{children}</div></div>;
}
const Row = ({ ok = true, children }: { ok?: boolean; children: ReactNode }) => <li className="flex items-start gap-3 text-[17px]">{ok ? <CheckCircle2 size={20} className="mt-1 shrink-0 text-emerald-600" /> : <XCircle size={20} className="mt-1 shrink-0 text-red-600" />}<span>{children}</span></li>;
const Next = ({ to, label }: { to: string; label: string }) => <div className="pt-4"><BigButton onClick={() => go(to)}>{label} <ArrowRight size={18} /></BigButton></div>;
export function Hood({ children }: { children: ReactNode }) { const [o, setO] = useState(false);
  return <div className="rounded-xl border border-dashed border-neutral-300 text-[14px]"><button onClick={() => setO(!o)} aria-expanded={o} className="flex w-full items-center gap-2 px-4 py-3 text-left text-neutral-500 hover:text-neutral-800"><Wrench size={14} />Under the hood<ChevronDown size={15} className={cx('ml-auto transition-transform', o && 'rotate-180')} /></button>
    {o && <div className="fade-in space-y-2 px-4 pb-4 leading-6 text-neutral-600">{children}</div>}</div>; }
const Busy = ({ label }: { label: string }) => <BigButton disabled><Loader2 size={18} className="animate-spin" />{label}</BigButton>;

export function Chapter1() { const st = useStory(); const r = st.c1; const lab = st.lab;
  return <Chapter n={1} title="Artist sells" why="Ava sets her price and rules once. They travel with the song, so anyone, anywhere, can license it without a middleman.">
    {!r ? (st.busy === 'c1' ? <Busy label="Signing…" /> : <div><BigButton onClick={() => story.run('c1', artistSells)}>Put "Rain" up for licence</BigButton></div>) : <>
      <div className="fade-in flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 sm:flex-row sm:items-center" data-testid="c1-result"><Art t={music.hero()} size={96} />
        <div className="flex-1"><div className="text-[22px] font-semibold">"Rain" · {PRICE} sats</div><div className="text-[15px] text-neutral-500">For online videos · worldwide · forever · up to 4 minutes</div>
          <ul className="mt-4 space-y-2"><Row>Signed by Ava</Row><Row>Jay, her producer, agreed to his 20% share</Row><Row>Payments go straight to Ava's own wallet</Row></ul></div></div>
      <Hood><p><b>Offer</b>: a Nostr event (kind 30402) signed with Ava's key, id <code>{short(r.offer.id)}</code>. It names the track by the SHA-256 of the audio file, the price, the use and the licence text.</p><p><b>Consent</b>: Jay's signed event (kind 3413) naming this offer and his share. <b>Binding</b> (kind 3411): Ava's key and her Lightning node sign each other, so payments can only go to her.</p><p>Ava's agent does all of this; she only approves. {lab && <button className="underline" onClick={() => go('s2')}>Full scenario →</button>}</p></Hood>
      <Next to="c2" label="Next: an agent buys" /></>}
  </Chapter>; }

export function Chapter2() { const st = useStory(); const r = st.c2;
  const plain = ['The price is the one Ava set', 'The payment is for this exact licence', 'The money goes to Ava\'s own wallet', `It fits the budget ClipAI set (${r?.budget.dailyCapSat.toLocaleString('en-GB') ?? '5,000'} sats a day)`];
  return <Chapter n={2} title="Agent buys" why="Most buyers will be agents: a platform licensing at scale, or an AI tool working for a creator. A person sets the limits; the agent does the rest.">
    {!r ? (st.busy === 'c2' ? <Busy label="Scout is buying…" /> : <div><BigButton onClick={() => story.run('c2', agentBuys)}>Let Scout buy a licence</BigButton></div>) : <>
      <div className="fade-in rounded-2xl border border-neutral-200 bg-white p-6" data-testid="c2-result"><div className="text-[24px] font-semibold">Scout licensed "Rain". No person had to click.</div>
        <div className="mt-1 text-[15px] text-neutral-500">Scout is the buying agent of ClipAI, an AI video tool. Checking and signing took {Math.max(1, Math.round(r.ms))} ms here; a real Lightning payment adds a second or two.</div>
        <div className="mt-5 text-[14px] font-medium text-neutral-500">Before paying, Scout checked:</div><ul className="mt-2 space-y-2">{plain.map(t => <Row key={t}>{t}</Row>)}</ul>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">{[['Paid', r.paid], ['Ava got', r.ava], ['Jay got', r.jay]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-neutral-50 p-3"><div className="text-[24px] font-bold">{Number(v).toLocaleString('en-GB')}</div><div className="text-[12px] text-neutral-500">{k} (test sats)</div></div>)}</div></div>
      <Hood><p><b>x402</b>: Ava's shop answers "402 Payment Required" with a Lightning <b>invoice</b>, a payment request signed by her node.</p><p><b>NWC</b> (Nostr Wallet Connect): Scout's wallet connection only allows paying, up to {r.budget.maxPerPaymentSat} sats a payment and {r.budget.dailyCapSat.toLocaleString('en-GB')} a day. Even a hacked agent cannot spend more.</p><p>The invoice's description hash commits to Scout's signed request. Paying returns the <b>preimage</b>, the secret that proves payment. Scout's own trace: {r.trace.join(' · ')}</p><p>The payment is simulated here; the <button className="underline" onClick={() => go('live')}>live test wallets</button> make real ones.</p></Hood>
      <Next to="c3" label="Next: anyone verifies" /></>}
  </Chapter>; }

export function Chapter3() { const st = useStory();
  return <Chapter n={3} title="Anyone verifies" why="A video site, a court or a curious fan can check a licence alone, without asking Ava or any company, and without anyone being online.">
    {!st.c3 ? (st.busy === 'c3' ? <Busy label="Checking…" /> : <div><BigButton onClick={() => story.run('c3', anyoneVerifies)}>Check Scout's licence</BigButton></div>) : <>
      <VerdictCard v={st.c3} />
      {!st.c3fake ? <div><BigButton variant="quiet" disabled={!!st.busy} onClick={() => story.run('c3fake', forgedCopy)}>Now check a forged copy</BigButton></div> : <VerdictCard v={st.c3fake} title="A copy where someone changed the price to 1 sat" />}
      <Hood><p><b>verifyLicence</b> runs nine checks in your browser on the signed offer, Jay's consent, the binding, the request, the invoice, the preimage and the Bitcoin timestamp (an <b>OpenTimestamps</b> proof or an <b>OP_RETURN</b>, a tiny note inside a Bitcoin transaction). Check 9 also asks: has the offer been withdrawn, or the rights sold?</p>{st.c3fake && <p>The forged copy fails check 1 because its signature no longer matches: {st.c3fake.result.reason}.</p>}<p><button className="underline" onClick={() => go('verify')}>Check your own licence file →</button> · <button className="underline" onClick={() => go('redteam')}>Try to break it →</button></p></Hood>
      <Next to="c4" label="Next: rights change hands" /></>}
  </Chapter>; }

export function Chapter4() { const st = useStory(); const r = st.c4;
  return <Chapter n={4} title="Rights change hands" why="Songs are sold, and outlive the people who made them. The licence trail has to survive both.">
    {!r ? (st.busy === 'c4' ? <Busy label="Signing the sale…" /> : <div><BigButton onClick={() => story.run('c4', rightsChange)}>Ava sells "Rain" to Harbour Music</BigButton></div>) : <>
      <div className="fade-in rounded-2xl border border-neutral-200 bg-white p-6" data-testid="c4-result"><div className="text-[24px] font-semibold">"Rain" now belongs to Harbour Music</div>
        <div className="mt-1 text-[15px] text-neutral-500">Ava signed, Jay agreed, and the date is fixed on Bitcoin (here a practice chain, block {r.block.toLocaleString('en-GB')}).</div></div>
      <div className="grid gap-3"><VerdictCard compact v={r.earlier} title="Scout's licence, bought before the sale" /><VerdictCard compact v={r.oldKey} title="A new licence sold from Ava's old account" /><VerdictCard compact v={r.newOwner} title="A new licence sold by Harbour Music" /></div>
      <Hood><p>A <b>transfer record</b> (draft kind 3417) signed by Ava names the track's fingerprint and Harbour's key. Jay co-signs. A 36-byte <b>OP_RETURN</b> ("MLT1" and a digest of the record and its co-signatures) dates it. Check 9 walks this chain of title. The first dated transfer wins, so a double sale fails.</p><p>Also under the hood: <button className="underline" onClick={() => go('s26')}>a planned succession (2 of 3 heirs)</button>, <button className="underline" onClick={() => go('s27')}>an estate with no plan (an honest limit)</button>, and <button className="underline" onClick={() => go('redteam')}>attacks A20 to A23</button>.</p></Hood>
      <div className="pt-4 text-center"><div className="text-[19px] text-neutral-600">{SHORT}</div><div className="mt-5 flex flex-wrap justify-center gap-3"><BigButton onClick={() => go('hood')}>Explore under the hood <ArrowRight size={18} /></BigButton><BigButton variant="quiet" onClick={() => { story.reset(); go('c1'); }}>Start again</BigButton></div></div></>}
  </Chapter>; }
export { plainReason };
