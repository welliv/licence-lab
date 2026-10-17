// The main path: Home (one choice), three stops and one optional extra. Plain words only on the page;
// the technical words live in each stop's code drawer and in the glossary under the hood.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Pause, Loader2, CheckCircle2, XCircle, ChevronDown, ExternalLink, ArrowRight, Moon, Sun, Wrench, ShieldAlert, Code2, RotateCcw, Sparkles } from 'lucide-react';
import { music, useMusic } from '../music';
import { Art } from '../MiniPlayer';
import { cx } from '../bits';
import { go } from '../store';
import { short, type Verdict } from '../../engine/lab';
import * as S from '../../engine/story';
import { useStory, story, sleep, STOPS, PERSONAS, type StopId, type Persona } from './state';
import { useProof } from './proof';
import { verdictLine, plainReason } from '../plain';
import { testkit } from '../testkit';
import { faucetReachable, realLicence, type RealResult } from '../../live/realpay';
import { sha256hex } from '../../engine/lab';
import { usd, usdFromSats, splitCents, satsToCents, PRICE_CENTS, BUDGET_USD, DEMO_RATE_LABEL } from '../money';

export const HEADLINE = 'Artists license their music directly. Any agent can buy it in seconds and prove it on Bitcoin.';
export const SHORT = 'Music rights, sold directly, bought by any agent, proven on Bitcoin.';
const n = (x: number) => x.toLocaleString('en-GB');

export function BigButton({ children, onClick, disabled, variant = 'primary', ...p }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'quiet' | 'cheat' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} onClick={onClick} disabled={disabled} className={cx('inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full px-8 text-[17px] font-semibold transition-all disabled:cursor-wait',
    variant === 'primary' ? 'bg-neutral-900 text-white shadow-lg hover:scale-[1.02] hover:bg-neutral-800 disabled:opacity-80 disabled:hover:scale-100'
      : variant === 'cheat' ? 'min-h-12 border border-red-300 px-6 text-[15px] text-red-700 hover:bg-red-50'
      : 'text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900')}>{children}</button>;
}
const Busy = ({ label }: { label: string }) => <BigButton disabled><Loader2 size={18} className="animate-spin" />{label}</BigButton>;

/** Slim top bar: the stops in the visitor's order, the extra, who you are (changeable), theme, under the hood. */
export function StoryShell({ path, children }: { path: string; children: ReactNode }) {
  const st = useStory(); const order = st.order(); const items: [string, string][] = [...order.map(s => [s, STOPS[s]] as [string, string]), ['rights', 'Extra: rights']];
  return <div className="flex h-full flex-col">
    <header className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5 md:gap-3 md:px-8">
      <button onClick={() => go('')} className="flex items-center gap-2 text-[15px] font-bold tracking-tight" aria-label="Licence Lab home"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-700 via-violet-600 to-sky-500 text-[14px] text-white">♪</span><span className="hidden sm:inline">Licence Lab</span></button>
      <nav aria-label="Progress" className="mx-auto flex items-center gap-0.5 md:gap-1.5">{items.map(([p, label], i) => { const cur = p === path; const done = st.done.has(p); const extra = p === 'rights';
        return <button key={p} onClick={() => go(p)} aria-current={cur ? 'step' : undefined} title={label} className={cx('flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] transition-colors md:px-3', cur ? 'bg-neutral-900 text-white' : extra ? 'text-neutral-400 hover:text-neutral-900' : 'text-neutral-500 hover:text-neutral-900')}>
          <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold', cur ? 'bg-white/20' : done ? 'bg-emerald-500 text-white' : extra ? 'border border-dashed border-neutral-300' : 'border border-neutral-300')}>{done && !cur ? '✓' : extra ? '+' : i + 1}</span>
          <span className={cx(cur ? 'hidden sm:inline' : 'hidden lg:inline')}>{label}</span></button>; })}</nav>
      <label className="hidden items-center gap-1 text-[12px] text-neutral-500 md:flex">Seen as<select aria-label="Seen as" value={st.persona ?? ''} onChange={e => story.setPersona(e.target.value as Persona)} className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-[12px] text-neutral-800"><option value="" disabled>choose</option>{PERSONAS.map(p => <option key={p.id} value={p.id}>{p.id === 'artist' ? 'an artist' : p.id === 'buyer' ? 'a buyer' : 'a builder'}</option>)}</select></label>
      <ThemeButton />
      <button onClick={() => go('hood')} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50"><Wrench size={13} /><span className="hidden sm:inline">Under the hood</span></button>
    </header>
    <main className="scroll-thin flex-1 overflow-y-auto">{children}
      <footer className="px-6 py-6 text-center text-[12px] text-neutral-400">Test money and test keys only · demo names on owner-supplied recordings (see Credits)</footer></main>
  </div>;
}
function ThemeButton() { const [d, setD] = useState(() => document.documentElement.classList.contains('dark'));
  return <button aria-label={d ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => { document.documentElement.classList.toggle('dark', !d); try { localStorage.setItem('ll.theme', d ? 'light' : 'dark'); } catch {} setD(!d); }} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">{d ? <Sun size={15} /> : <Moon size={15} />}</button>; }

/** The one verdict card. The nine checks are behind a tap. */
export function VerdictCard({ v, title, line, compact, children, testid = 'verdict', noChecks }: { v: Verdict; title?: string; line?: string; compact?: boolean; children?: ReactNode; testid?: string; noChecks?: boolean }) {
  const [open, setOpen] = useState(false); const ok = v.result.ok;
  return <div className={cx('fade-in rounded-2xl border text-left', ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50', compact ? 'p-4' : 'p-6')} data-testid={testid}>
    {title && <div className="mb-1 text-[13px] text-neutral-500">{title}</div>}
    <div className={cx('flex items-start gap-3 font-semibold', compact ? 'text-[18px]' : 'text-[24px] leading-tight', ok ? 'text-emerald-700' : 'text-red-700')}>{ok ? <CheckCircle2 className="mt-0.5 shrink-0" size={compact ? 22 : 28} /> : <XCircle className="mt-0.5 shrink-0" size={compact ? 22 : 28} />}<span>{line ?? verdictLine(v)}</span></div>
    {children}
    {!noChecks && <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-[14px] text-neutral-600 hover:text-neutral-900"><ChevronDown size={15} className={cx('transition-transform', open && 'rotate-180')} />{open ? 'Hide' : 'Show'} the checks</button>}
    {open && <ol className="fade-in mt-3 space-y-1.5 text-[14px]">{v.checks.map(c => <li key={c.n} className="flex items-start gap-2"><span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', c.status === 'pass' ? 'bg-emerald-500 text-white' : c.status === 'fail' ? 'bg-red-500 text-white' : 'bg-neutral-200 text-neutral-500')}>{c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : c.n}</span>
      <span className="text-neutral-700">{c.label}{c.status === 'fail' && c.detail && <span className="block text-[12px] text-red-700">{c.detail}</span>}</span></li>)}
      {v.ownership && <li className="flex items-start gap-2" data-testid="check-10"><span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', v.ownership.status === 'pass' ? 'bg-emerald-500 text-white' : v.ownership.status === 'fail' ? 'bg-red-500 text-white' : 'bg-amber-200 text-amber-900')}>{v.ownership.status === 'pass' ? '✓' : v.ownership.status === 'fail' ? '✗' : '?'}</span><span className="text-neutral-700">{v.ownership.label}<span className={cx('block text-[12px]', v.ownership.status === 'fail' ? 'text-red-700' : 'text-neutral-500')}>{v.ownership.detail}</span></span></li>}
      {v.file && <li className="flex items-start gap-2"><span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]', v.file.ok ? 'bg-emerald-500 text-white' : 'bg-neutral-200')}>♪</span><span className="text-neutral-700">The audio file is the one in the offer{v.file.ok ? ' (fingerprint matches)' : `: ${v.file.reason}`}</span></li>}
      <li className="pt-1"><button onClick={() => go('hood')} className="text-[13px] text-neutral-500 underline underline-offset-4">What do these mean?</button></li></ol>}
  </div>;
}
/** "Proven on Bitcoin" with the real Mutinynet proof and the practice-chain note right next to it. */
export function Proven({ label = 'Proven on Bitcoin ✓', short }: { label?: string; short?: boolean }) {
  const proof = useProof();
  return <div className="mt-3 flex flex-col gap-1" data-testid="proven">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[15px] font-semibold text-emerald-700">{label}</span>
      {proof ? <a href={proof.txUrl} target="_blank" rel="noreferrer" data-testid="proof-link" className="inline-flex items-center gap-1 text-[14px] text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900">See a real one{proof.block ? ` (block ${n(Number(proof.block))})` : ''}<ExternalLink size={13} /></a> : proof === null ? <span className="text-[13px] text-neutral-500">No recorded proof yet.</span> : null}</div>
    <p className="text-[12px] leading-5 text-neutral-500" data-testid="practice-note">{short ? 'Dated on a practice chain here; the link is real, on Bitcoin\'s test network.' : 'Here it was dated on a practice chain in your browser. The link is a licence our live run proved on Mutinynet, Bitcoin\'s public test network.'}</p></div>;
}
/** Technical words and code live here, closed unless you are a builder. */
function CodeDrawer({ children, title = 'For builders: how it works' }: { children: ReactNode; title?: string }) {
  const st = useStory(); const [o, setO] = useState(st.persona === 'builder');
  return <div className="rounded-xl border border-dashed border-neutral-300 text-[14px]" data-drawer="code"><button onClick={() => setO(!o)} aria-expanded={o} className="flex w-full items-center gap-2 px-4 py-3 text-left text-neutral-500 hover:text-neutral-800"><Code2 size={14} />{title}<ChevronDown size={15} className={cx('ml-auto transition-transform', o && 'rotate-180')} /></button>
    {o && <div className="fade-in space-y-2 px-4 pb-4 leading-6 text-neutral-600" data-testid="code-drawer">{children}</div>}</div>;
}
const Code = ({ children }: { children: string }) => <pre className="scroll-thin overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-[12px] leading-5 text-neutral-100">{children}</pre>;
function Cheat({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-red-200/70 p-5" data-testid="cheat"><div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-red-700"><ShieldAlert size={17} />Try to cheat: {title}</div>{children}</section>;
}
const Row = ({ ok = true, children }: { ok?: boolean; children: ReactNode }) => <li className="flex items-start gap-3 text-[17px]">{ok ? <CheckCircle2 size={20} className="mt-1 shrink-0 text-emerald-600" /> : <XCircle size={20} className="mt-1 shrink-0 text-red-600" />}<span>{children}</span></li>;
const Bad = ({ title, line, children, testid }: { title?: string; line: string; children?: ReactNode; testid?: string }) => <div className="fade-in rounded-2xl border border-red-200 bg-red-50 p-4" data-testid={testid}>{title && <div className="mb-1 text-[13px] text-neutral-500">{title}</div>}<div className="flex items-start gap-3 text-[18px] font-semibold text-red-700"><XCircle size={22} className="mt-0.5 shrink-0" /><span>{line}</span></div>{children}</div>;
const Good = ({ title, line, children, testid }: { title?: string; line: string; children?: ReactNode; testid?: string }) => <div className="fade-in rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid={testid}>{title && <div className="mb-1 text-[13px] text-neutral-500">{title}</div>}<div className="flex items-start gap-3 text-[18px] font-semibold text-emerald-700"><CheckCircle2 size={22} className="mt-0.5 shrink-0" /><span>{line}</span></div>{children}</div>;

/** Next: the next stop in the visitor's order; after the last one, the finale with the extra offered (not forced). */
function Next({ from }: { from: StopId }) {
  const st = useStory(); const order = st.order(); const i = order.indexOf(from); const next = order.slice(i + 1).find(s => !st.done.has(s)) ?? order.find(s => !st.done.has(s));
  if (next) return <div className="pt-2"><BigButton onClick={() => go(next)} data-testid="next">Next: {STOPS[next].toLowerCase()} <ArrowRight size={18} /></BigButton></div>;
  return <Finale />;
}
function Finale() {
  return <div className="fade-in rounded-2xl border border-neutral-200 bg-white p-6 text-center" data-testid="finale"><div className="text-[22px] font-semibold">That is the whole idea.</div><div className="mt-1 text-[17px] text-neutral-600">{SHORT}</div>
    <div className="mt-5 flex flex-wrap justify-center gap-3"><BigButton onClick={() => go('rights')} data-testid="next">Extra: when rights change hands <ArrowRight size={18} /></BigButton><BigButton variant="quiet" onClick={() => go('hood')}>Explore under the hood</BigButton></div>
    <p className="mt-3 text-[13px] text-neutral-500">The extra takes about two minutes. It is optional.</p></div>;
}
function Stop({ id, title, why, children }: { id: string; title: string; why: string; children: ReactNode }) {
  const st = useStory(); const order = st.order(); const i = order.indexOf(id as StopId);
  return <div className="mx-auto flex max-w-[760px] flex-col px-5 pb-10 pt-8 md:px-6 md:pt-14" data-stop={id}>
    <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{i >= 0 ? `Stop ${i + 1} of 3` : 'Extra'}</div>
    <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight md:text-[46px]">{title}</h1>
    <p className="mt-3 text-[18px] leading-8 text-neutral-600">{why}</p>
    <div className="mt-8 space-y-6">{children}</div></div>;
}

// ---------- Home ----------
export function Home() {
  const st = useStory(); useEffect(() => { testkit.start(); }, []);
  const pick = (p: Persona) => { story.setPersona(p); testkit.mark(`persona:${p}`, { persona: p }); go(story.order()[0]); };
  return <div className="mx-auto flex max-w-[900px] flex-col items-center px-5 pb-10 pt-10 text-center md:pt-20">
    <h1 className="text-[34px] font-bold leading-[1.08] tracking-tight md:text-[54px]">Artists license their music directly. <span className="text-neutral-500">Any agent can buy it in seconds and prove it on Bitcoin.</span></h1>
    <p className="mt-6 text-[18px] text-neutral-600">Three short stops. Which are you?</p>
    <div className="mt-6 grid w-full max-w-[820px] gap-3 md:grid-cols-3" role="group" aria-label="Which are you?">{PERSONAS.map(p => <button key={p.id} onClick={() => pick(p.id)} data-persona={p.id}
      className={cx('flex min-h-[120px] flex-col items-start gap-1 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-lg', st.persona === p.id ? 'border-neutral-900 bg-white shadow-md' : 'border-neutral-200 bg-white')}>
      <span className="text-[26px]">{p.emoji}</span><span className="text-[19px] font-semibold">{p.label}</span><span className="text-[14px] leading-5 text-neutral-500">{p.line}</span></button>)}</div>
    {st.persona && <p className="mt-4 text-[13px] text-neutral-500">Last time you chose "{PERSONAS.find(p => p.id === st.persona)!.label}". Pick again to change the order of the stops.</p>}
  </div>;
}

// ---------- Stop 1 ----------
/** Stop 1: the artist-first version (dollars, one screen, three beats) by default; the earlier version stays at ?classic=1 for comparison. */
export const classicStop1 = () => /[?&]classic=1\b/.test(location.search + location.hash);
export function Stop1() { return classicStop1() ? <Stop1Classic /> : <ArtistStop1 />; }
// ---------- Stop 1, classic: hear it, license it (sats, checks on the page) ----------
function Stop1Classic() {
  useMusic(); const st = useStory(); const r = st.r.s1; const hero = music.hero(); const playing = music.isPlaying(hero?.id ?? null) || (music.mode === 'tone' && music.isPlaying());
  const [phase, setPhase] = useState<'idle' | 'listening'>(music.isPlaying() ? 'listening' : 'idle'); const [label, setLabel] = useState('');
  const artist = st.persona === 'artist';
  const listen = () => { music.toggle(hero?.id ?? null); setPhase('listening'); };
  const real = useRealMoney();
  const buy = async () => { await story.run('s1', async lab => {
      if (real.on) { try { story.r.s1real = await realLicence({ priceSat: S.PRICE, onStep: setLabel }); } catch (e: any) { story.r.s1real = { error: String(e?.message ?? e) }; } }
      setLabel(`Paying ${S.PRICE} sats…`); await sleep(300); setLabel('Checking the licence…'); const out = await S.hearAndLicense(lab); setLabel('Dating it on Bitcoin…'); await sleep(300); return out; });
    const out = story.r.s1; if (out?.verdict.result.ok) { testkit.licence(); testkit.stopDone('stop1'); story.finish('stop1'); if (hero) { music.unlock(hero.id, { how: 'Licensed in stop 1: all 9 checks passed', fileOk: out.verdict.file?.ok, holder: 'you' }); if (!music.isPlaying(hero.id)) music.toggle(hero.id); } } };
  const total = r ? r.split.reduce((a: number, b: any) => a + b.sats, 0) : S.PRICE;
  return <Stop id="stop1" title={artist ? 'Your song, licensed in seconds' : 'Hear it, license it'} why={artist ? 'This is what a buyer sees when you put "Rain" up for licence. Play the buyer: hear the preview, pay 100 sats, and watch the money reach you and your co-writers at once.' : 'Hear the preview of "Rain". License it for 100 sats. The full track unlocks, and the one payment is shared out at once.'}>
    <div className="flex flex-col items-center text-center">
      <button onClick={listen} className="group relative rounded-2xl shadow-2xl" aria-label={playing ? 'Pause Rain' : 'Play Rain'}><Art t={hero} size={190} />
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition group-hover:bg-black/20"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">{playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}</span></span></button>
      <div className="mt-4 text-[22px] font-semibold">"Rain" <span className="font-normal text-neutral-500">· Alice</span></div>
      <div className="mt-1 text-[14px] text-neutral-500" data-testid="track-state">{r?.verdict.result.ok ? 'Full track' : music.unlocked(hero?.id) ? 'Full track (licensed earlier)' : '30-second preview'}</div>
      {!r && <div className="mt-6 flex min-h-[64px] flex-col items-center">
        {st.busy !== 's1' && (phase === 'idle' ? <BigButton onClick={listen}><Play size={18} />Hear "Rain"</BigButton> : <BigButton onClick={buy}>License for {S.PRICE} sats</BigButton>)}
        {st.busy === 's1' && <Busy label={label || 'Working…'} />}
        <RealToggle real={real} /></div>}
    </div>
    {r && <>
      {st.r.s1real && <RealCard r={st.r.s1real} />}
      <VerdictCard v={r.verdict} line={r.verdict.result.ok ? 'Licensed' : undefined} title={st.r.s1real && !st.r.s1real.error ? 'The full check, with the Bitcoin timestamp and the shares, on the practice chain' : undefined}>
        {r.verdict.result.ok && <><p className="mt-1 text-[15px] text-neutral-600">The full track is unlocked. All 9 checks passed in your browser, in {Math.max(1, Math.round(r.ms))} ms here; a real Lightning payment adds a second or two.</p><Proven /></>}
      </VerdictCard>
      <FanOut split={r.split} total={total} />
      <OwnSong real={real} />
      <CheatStop1 />
      <CodeDrawer><p>Alice's <b>offer</b> is a signed Nostr event (kind 30402), id <code>{short(r.bundle.offer.id)}</code>. It names the track by the SHA-256 of the audio file, the price, the use and the licence text. Carol and Dave each sign a <b>consent</b> (kind 3413) with their share.</p>
        <p>You sign a <b>request</b>; Alice's shop answers <b>402 Payment Required</b> with a Lightning <b>invoice</b> whose description hash commits to your request. Paying returns the <b>preimage</b>. The <b>bundle</b> (offer, consents, binding, request, invoice, preimage, Bitcoin timestamp) is your licence. Alice's node pays Carol and Dave and signs a statement for each ({r.statements} statements).</p>
        <Code>{`const bundle = await buy(offer)          // request → 402 → pay → preimage
const result = await verifyLicence(bundle, chain)
// → { ok: ${r.verdict.result.ok}, anchoredHeight: ${r.block} }`}</Code></CodeDrawer>
      <Next from="stop1" /></>}
  </Stop>;
}
// ---------- Stop 1, artist-first: the song, one button, the money landing. Everything technical sits behind "See the proof". ----------
const SHARES: Record<string, { role: string; colour: string; text: string }> = { alice: { role: 'artist', colour: 'bg-violet-500', text: 'text-violet-700' }, carol: { role: 'producer', colour: 'bg-sky-500', text: 'text-sky-700' }, dave: { role: 'singer', colour: 'bg-pink-500', text: 'text-pink-700' } };
const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
/** Counts from `from` to `to` (cents) after `delay` ms. */
function useCount(from: number, to: number, delay: number, ms = 900) {
  const [v, setV] = useState(reducedMotion() ? to : from);
  useEffect(() => { if (reducedMotion()) { setV(to); return; } let raf = 0; const t0 = performance.now() + delay;
    const f = (now: number) => { const k = Math.min(1, Math.max(0, (now - t0) / ms)); setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [from, to, delay, ms]);
  return v;
}
function ArtistStop1() {
  useMusic(); const st = useStory(); const r = st.r.s1; const hero = music.hero(); const playing = music.isPlaying(hero?.id ?? null) || (music.mode === 'tone' && music.isPlaying());
  const artist = st.persona === 'artist'; const order = st.order(); const i = order.indexOf('stop1'); const real = useRealMoney(); const [label, setLabel] = useState(''); const [landed, setLanded] = useState(false);
  const price = usd(PRICE_CENTS);
  const buy = async () => { setLanded(false); await story.run('s1', async lab => {
      setLabel("Bob's agent is buying…");
      // A quick tap can beat the faucet check: wait for it rather than silently using practice money.
      const useReal = real.known || real.decided ? real.on : await faucetReachable(3000);
      if (useReal) { try { story.r.s1real = await realLicence({ priceSat: S.PRICE, onStep: s => setLabel(/^Pay/.test(s) ? `Paying ${price}…` : /^Check/.test(s) ? 'Checking it…' : "Bob's agent is buying…") }); } catch (e: any) { story.r.s1real = { error: String(e?.message ?? e) }; } }
      setLabel(`Paying ${price}…`); await sleep(250); const out = await S.hearAndLicense(lab); setLabel('Saving the proof…'); await sleep(300); return out; });
    const out = story.r.s1; if (out?.verdict.result.ok) { testkit.licence(); testkit.stopDone('stop1'); story.finish('stop1'); if (hero) { music.unlock(hero.id, { how: 'Licensed in stop 1: all 9 checks passed', fileOk: out.verdict.file?.ok, holder: 'you' }); if (!music.isPlaying(hero.id)) music.toggle(hero.id); } } };
  const licensed = !!r?.verdict.result.ok;
  return <div className="mx-auto flex max-w-[760px] flex-col px-5 pb-10 pt-6 md:px-6 md:pt-12" data-stop="stop1" data-version="artist-first">
    <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{i >= 0 ? `Stop ${i + 1} of 3` : 'Stop 1'}</div>
    <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-tight md:text-[44px]">{artist ? 'Your song sells itself' : 'Hear it, license it'}</h1>
    {/* Beat 1: the song, the price, who shares */}
    <section className="mt-6 flex flex-col items-center gap-5 rounded-3xl border border-neutral-200 bg-white p-5 sm:flex-row sm:p-6" data-testid="song-card">
      <button onClick={() => music.toggle(hero?.id ?? null)} className="group relative shrink-0 rounded-2xl shadow-2xl" aria-label={playing ? 'Pause Rain' : 'Play Rain'}><Art t={hero} size={typeof innerWidth === 'number' && innerWidth < 640 ? 112 : 150} />
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl transition group-hover:bg-black/20"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">{playing ? <Pause size={24} /> : <Play size={24} className="ml-1" />}</span></span></button>
      <div className="flex-1 text-center sm:text-left">
        <div className="text-[24px] font-semibold">"Rain" <span className="font-normal text-neutral-500">· Alice</span></div>
        <div className="text-[14px] text-neutral-500" data-testid="track-state">{licensed ? 'Full song unlocked' : playing ? 'Playing a 30-second taste' : 'Tap the cover to listen'}</div>
        <div className="mt-3 flex items-baseline justify-center gap-2 sm:justify-start"><span className="text-[46px] font-bold leading-none tabular-nums" data-testid="price">{price}</span><span className="text-[17px] text-neutral-500">a licence</span></div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[14px] sm:justify-start" data-testid="shares"><span className="text-neutral-500">Shared with</span>
          {([['carol', 'Carol', 20], ['dave', 'Dave', 15]] as const).map(([id, who, pct]) => <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"><span className={cx('h-2 w-2 rounded-full', SHARES[id].colour)} />{who} {pct}%</span>)}</div>
      </div>
    </section>
    {/* Beat 2: one button */}
    {!r && <div className="mt-6 flex flex-col items-center gap-2 text-center">
      {st.busy === 's1' ? <Busy label={label || "Bob's agent is buying…"} /> : <BigButton onClick={buy} data-testid="buy">Let Bob's agent buy it</BigButton>}
      <p className="text-[13px] text-neutral-500">Test money only. No real money moves.</p></div>}
    {/* Beat 3: the payoff */}
    {r && <div className="mt-6 space-y-5">
      {licensed ? <Payoff split={r.split} artist={artist} onLanded={() => setLanded(true)} /> : <Bad line="Something went wrong with this sale" />}
      {(landed || !licensed) && <div className="fade-in space-y-5 text-center">
        <p className="mx-auto max-w-[560px] text-[19px] leading-8 text-neutral-700" data-testid="sleep-line">Your agent can do this thousands of times while you sleep. You set the price and the rules.</p>
        <div className="flex justify-center"><Next from="stop1" /></div></div>}
    </div>}
    <div className="mt-8"><SeeProof r={r} real={real} /></div>
  </div>;
}
function Payoff({ split, artist, onLanded }: { split: { who: string; id: string; sats: number }[]; artist: boolean; onLanded: () => void }) {
  const total = split.reduce((a, b) => a + b.sats, 0); const cents = splitCents(satsToCents(total), split.map(s => s.sats)); const all = cents.reduce((a, b) => a + b, 0);
  const proof = useProof(); const bob = useCount(all, 0, 150, 1100); const [saved, setSaved] = useState(reducedMotion()); const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: innerWidth < 640 ? 'start' : 'nearest' }); }, []);
  useEffect(() => { const t = setTimeout(() => { setSaved(true); onLanded(); }, reducedMotion() ? 0 : 1900); return () => clearTimeout(t); }, []);
  return <section ref={ref} className="fade-in scroll-mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:p-6" data-testid="payoff">
    <div className="flex items-center gap-2 text-[24px] font-bold text-emerald-700"><CheckCircle2 size={26} />Paid</div>
    <div className="mt-4 grid items-center gap-3 md:grid-cols-[150px_1fr_250px]">
      <div className="rounded-2xl bg-white p-4 text-center" data-testid="from-bob"><div className="text-[14px] text-neutral-500">Bob's agent</div><div className="mt-1 text-[30px] font-bold tabular-nums">{usd(bob)}</div><div className="text-[12px] text-neutral-500">{bob === 0 ? 'paid' : 'paying…'}</div></div>
      <div className="relative hidden h-[180px] md:block" aria-hidden>{split.map((s, k) => [0, 1, 2].map(j => <span key={`${s.id}${j}`} className={cx('coin absolute h-4 w-4 rounded-full shadow', SHARES[s.id]?.colour ?? 'bg-amber-400')} style={{ top: `${15 + k * 35}%`, animationDelay: `${150 + k * 220 + j * 160}ms` }} />))}</div>
      <div className="flex justify-center md:hidden" aria-hidden><span className="coin-y h-4 w-4 rounded-full bg-amber-400 shadow" /></div>
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-1">{split.map((s, k) => <Share key={s.id} id={s.id} who={s.who} cents={cents[k]} pct={Math.round(s.sats / total * 100)} delay={350 + k * 220} you={artist && s.id === 'alice'} />)}</ul>
    </div>
    {saved && <div className="fade-in mt-5 flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="proof-saved"><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[17px] font-semibold text-emerald-700">Proof saved on Bitcoin ✓</span>
      {proof && <a href={proof.txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900">See a real one<ExternalLink size={13} /></a>}</div>}
  </section>;
}
function Share({ id, who, cents, pct, delay, you }: { id: string; who: string; cents: number; pct: number; delay: number; you: boolean }) {
  const v = useCount(0, cents, delay, 900); const s = SHARES[id];
  return <li className="rounded-2xl bg-white p-3 text-center md:flex md:items-center md:justify-between md:px-4 md:text-left"><div><div className="flex items-center justify-center gap-1.5 text-[15px] font-semibold md:justify-start"><span className={cx('h-2.5 w-2.5 rounded-full', s?.colour)} />{who}</div>
    <div className="text-[12px] text-neutral-500">{you ? 'Your share' : s?.role}, {pct}%</div></div><div className="mt-1 text-[22px] font-bold tabular-nums text-emerald-700 md:mt-0" data-testid={`share-${id}`}>+{usd(v)}</div></li>;
}
/** One tap for everything technical: before buying, how it works and the test-money switch; after, the proof, the checks, the real payment in sats, cheats and code. */
function SeeProof({ r, real }: { r: any; real: Real }) {
  const st = useStory(); const [open, setOpen] = useState(st.persona === 'builder');
  return <div className="rounded-2xl border border-neutral-200 bg-white text-left">
    <button onClick={() => setOpen(!open)} aria-expanded={open} data-testid="see-proof" className="flex w-full items-center gap-2 px-5 py-4 text-[16px] font-medium text-neutral-700 hover:text-neutral-900"><Wrench size={15} className="text-neutral-400" />{r ? 'See the proof' : 'How it works'}<ChevronDown size={17} className={cx('ml-auto transition-transform', open && 'rotate-180')} /></button>
    {open && <div className="fade-in space-y-5 border-t border-neutral-200 px-5 pb-5 pt-4" data-testid="proof-panel">
      {!r && <><p className="text-[15px] leading-7 text-neutral-600">Alice's agent signs the offer: the song, the price and the shares, agreed by Carol and Dave. Bob's agent pays, and gets a licence that anyone can check without asking Alice. A record of the sale is dated on Bitcoin, so no one can change it later.</p>
        <p className="text-[14px] text-neutral-500">Prices show in US dollars. Underneath, the payment is {S.PRICE} test sats ({usd(PRICE_CENTS)} at a fixed demo rate: {DEMO_RATE_LABEL}; test money, not a market rate).</p><RealToggle real={real} /></>}
      {r && <>
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[14px] text-neutral-700" data-testid="demo-rate">{usd(PRICE_CENTS)} ≈ {S.PRICE} test sats (test money, demo rate: {DEMO_RATE_LABEL})</p>
        {st.r.s1real ? <ProofReal r={st.r.s1real} /> : <p className="text-[14px] text-neutral-600">This sale used practice money in your browser (the test faucet was off or not reachable).</p>}
        <VerdictCard v={r.verdict} line={r.verdict.result.ok ? `All ${r.verdict.passed} checks passed` : undefined} title="The full check, run in your browser on a practice copy of Bitcoin">
          {r.verdict.result.ok && <><p className="mt-1 text-[15px] text-neutral-600">{r.split.map((s: any) => `${s.who} ${s.sats}`).join(', ')} sats ({usd(PRICE_CENTS)} in all at the demo rate), each with a signed statement of the sale. Checked in {Math.max(1, Math.round(r.ms))} ms.</p>
            <p className="mt-2 text-[14px] text-neutral-600" data-testid="ownership-plain">Who owns "Rain": {r.verdict.ownership?.status === 'pass' ? "confirmed by Alice's distributor, who signed that Alice owns it." : r.verdict.ownership?.status === 'fail' ? 'this account does not own it.' : 'not confirmed. The sale is real, but no one trusted here has said who owns the song.'}</p><Proven /></>}
        </VerdictCard>
        <OwnSong real={real} />
        <CheatStop1 />
        <CodeDrawer><p>Alice's <b>offer</b> is a signed Nostr event (kind 30402), id <code>{short(r.bundle.offer.id)}</code>. It names the track by the SHA-256 of the audio file, the price in sats ({S.PRICE}), the use and the licence text. Carol and Dave each sign a <b>consent</b> (kind 3413) with their share. Dollars are display only, at the fixed demo rate ({DEMO_RATE_LABEL}).</p>
          <p>Bob signs a <b>request</b>; Alice's shop answers <b>402 Payment Required</b> with a Lightning <b>invoice</b> whose description hash commits to the request. Paying returns the <b>preimage</b>. The <b>bundle</b> (offer, consents, binding, request, invoice, preimage, Bitcoin timestamp) is the licence. Alice's node pays Carol and Dave and signs a statement for each ({r.statements} statements).</p>
          <Code>{`const bundle = await buy(offer)          // request → 402 → pay → preimage
const result = await verifyLicence(bundle, chain)
// → { ok: ${r.verdict.result.ok}, anchoredHeight: ${r.block} }`}</Code></CodeDrawer>
      </>}
      <p className="text-[13px] text-neutral-500"><a className="underline underline-offset-4" href="?classic=1#/stop1" data-testid="classic-link">See the classic Stop 1</a> (sats and checks on the page), for comparison.</p>
    </div>}
  </div>;
}
function ProofReal({ r }: { r: RealResult | { error: string } }) {
  const proof = useProof();
  if ('error' in r) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900" data-testid="real-card">The real test payment did not go through ({r.error}). Practice money was used instead.</div>;
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid="real-card"><div className="flex items-start gap-2 text-[17px] font-semibold text-emerald-700"><CheckCircle2 className="mt-0.5 shrink-0" size={20} />Real test payment: {n(r.aliceGot)} test sats reached Alice ({usdFromSats(r.aliceGot)} at the demo rate)</div>
    <p className="mt-1 text-[14px] text-neutral-600">Two test wallets were made on faucet.nwc.dev. Bob paid a real Lightning invoice in {(r.ms / 1000).toFixed(1)} s. These were checked on the real payment:</p>
    <ul className="mt-2 space-y-1">{r.facts.filter(f => f.ok).map(f => <li key={f.label} className="flex items-start gap-2 text-[14px]"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f.label}</li>)}</ul>
    <p className="mt-3 text-[13px] text-neutral-600" data-testid="shared-node-note">Left out here on purpose: that the receiving wallet is Alice's own. Every test wallet shares one, so a test payment cannot show it. The full check below covers it, and so does {proof ? <a className="underline" href={proof.txUrl} target="_blank" rel="noreferrer">this real licence on Bitcoin's test network</a> : 'the real licence on Bitcoin\'s test network'}, where Alice's own wallet signed. The split to Carol and Dave runs in the full check.</p>
    <details className="mt-2 text-[12px] text-neutral-500"><summary className="cursor-pointer">Payment details</summary><div className="mt-1 break-all font-mono">payment hash {r.paymentHash}<br />preimage {r.preimage}</div></details></div>;
}
// ---------- real test money (faucet.nwc.dev) and "put up your own song" ----------
type Real = { on: boolean; known: boolean; reachable: boolean; set: (v: boolean) => void; decided?: boolean };
function useRealMoney(): Real {
  const forced = /[?&]real=0\b/.test(location.search + location.hash) ? false : /[?&]real=1\b/.test(location.search + location.hash) ? true : undefined;
  const [reachable, setReachable] = useState<boolean | null>(null); const [choice, setChoice] = useState<boolean | undefined>(forced);
  useEffect(() => { if (forced === false) { setReachable(false); return; } let live = true; faucetReachable().then(ok => { if (live) setReachable(ok); }); return () => { live = false; }; }, []);
  const on = choice ?? !!reachable; return { on: on && reachable !== false, known: reachable !== null, reachable: !!reachable, set: setChoice, decided: choice !== undefined };
}
function RealToggle({ real }: { real: Real }) {
  return <label className="mt-4 inline-flex max-w-[460px] items-start gap-2 text-left text-[14px] text-neutral-600" data-testid="real-toggle">
    <input type="checkbox" className="mt-1" checked={real.on} disabled={!real.reachable} onChange={e => real.set(e.target.checked)} data-testid="real-money" />
    <span><b className="font-semibold text-neutral-800">Use real test money</b><span className="block text-[12px] text-neutral-500">{!real.known ? 'Checking the test faucet…' : !real.reachable ? 'The test faucet is not reachable, so this uses practice money in your browser.' : real.on ? 'A real Lightning payment with test sats from faucet.nwc.dev. No real money.' : 'Off: practice money in your browser.'}</span></span></label>;
}
function RealCard({ r }: { r: RealResult | { error: string } }) {
  const proof = useProof();
  if ('error' in r) return <div className="fade-in rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900" data-testid="real-card">The real test payment did not go through ({r.error}). Practice money was used instead.</div>;
  const ok = r.facts.filter(f => f.ok);
  return <div className="fade-in rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid="real-card"><div className="flex items-start gap-2 text-[18px] font-semibold text-emerald-700"><CheckCircle2 className="mt-0.5 shrink-0" size={22} />Real test payment: {n(r.aliceGot)} sats reached Alice</div>
    <p className="mt-1 text-[14px] text-neutral-600">Two test wallets were made for you on faucet.nwc.dev. Bob paid the real invoice in {(r.ms / 1000).toFixed(1)} s, and the real preimage was checked.</p>
    <ul className="mt-2 space-y-1">{ok.map(f => <li key={f.label} className="flex items-start gap-2 text-[14px]"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f.label}</li>)}</ul>
    <p className="mt-3 rounded-lg bg-amber-100/70 p-2 text-[13px] text-amber-800" data-testid="shared-node-note">Not proven here: that the node belongs to Alice. Every faucet wallet shares one node, and that node will not sign Alice's binding, so check 3 cannot pass. {proof ? <a className="underline" href={proof.txUrl} target="_blank" rel="noreferrer">See a licence where Alice's own node signed (Mutinynet)</a> : null}</p>
    <details className="mt-2 text-[12px] text-neutral-500"><summary className="cursor-pointer">Payment details</summary><div className="mt-1 break-all font-mono">payment hash {r.paymentHash}<br />preimage {r.preimage}</div></details></div>;
}
function OwnSong({ real }: { real: Real }) {
  const st = useStory(); const [file, setFile] = useState<{ name: string; sha256: string; size: number } | null>(null); const [err, setErr] = useState(''); const out = st.r.own; const rr = st.r.ownReal;
  const pick = async (f?: File) => { if (!f) return; setErr(''); if (!/^audio\//.test(f.type) && !/\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)) { setErr('Choose an audio file.'); return; } if (f.size > 200 * 1024 * 1024) { setErr('That file is over 200 MB.'); return; }
    setFile({ name: f.name, size: f.size, sha256: sha256hex(new Uint8Array(await f.arrayBuffer())) }); story.r.own = undefined; story.r.ownReal = undefined; };
  const sell = () => file && story.run('own', async lab => { const title = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'My song';
    if (real.on) { try { story.r.ownReal = await realLicence({ priceSat: S.PRICE, buyer: 'bobagent', song: { title, sha256: file.sha256, termsText: S.ownTerms(title) } }); } catch (e: any) { story.r.ownReal = { error: String(e?.message ?? e) }; } }
    try { return await S.ownSong(lab, file); } catch (e: any) { setErr(`Could not sell it: ${e?.message ?? e}`); return undefined; } });
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5" data-testid="own-song" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
    <h2 className="text-[18px] font-semibold">Put up your own song</h2>
    <p className="mt-1 text-[14px] text-neutral-600">Drop an audio file. It stays in your browser: only its fingerprint (SHA-256) goes into a signed offer. Then Bob's agent buys a licence for it.</p>
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-[15px] hover:bg-neutral-50">Choose a song<input type="file" accept="audio/*" className="hidden" data-testid="own-file" onChange={e => pick(e.target.files?.[0])} /></label>
    {err && <p className="mt-2 text-[13px] text-red-700">{err}</p>}
    {file && <div className="mt-3 text-[13px] text-neutral-600" data-testid="own-hash">{file.name} · {(file.size / 1048576).toFixed(1)} MB · fingerprint <span className="font-mono">{file.sha256.slice(0, 16)}…</span></div>}
    {file && !out && <div className="mt-3">{st.busy === 'own' ? <Busy label="Signing and selling…" /> : <BigButton onClick={sell} data-testid="own-sell">Sign the offer and let Bob's agent buy it</BigButton>}</div>}
    {out && <div className="mt-4 space-y-3">{rr && <RealCard r={rr} />}
      <VerdictCard compact v={out.verdict} title={`Signed offer ${short(out.offer.id)} for "${out.title}" at ${S.PRICE} sats, fingerprint ${short(file?.sha256)}`} line={out.verdict.result.ok ? `Bob's agent holds a licence for "${out.title}"` : undefined} testid="own-verdict">
        <p className="mt-1 text-[13px] text-neutral-600">Check 10 says "unverified ownership": nothing here proves you own this recording. A distributor you work with would sign that.</p></VerdictCard></div>}
  </section>;
}
function FanOut({ split, total }: { split: { who: string; id: string; sats: number }[]; total: number }) {
  const [go1, setGo] = useState(false); useEffect(() => { const t = setTimeout(() => setGo(true), 150); return () => clearTimeout(t); }, []);
  const colour: Record<string, string> = { alice: 'bg-violet-500', carol: 'bg-sky-500', dave: 'bg-pink-500' }; const role: Record<string, string> = { alice: 'the artist', carol: 'producer, 20%', dave: 'featured singer, 15%' };
  return <section className="rounded-2xl border border-neutral-200 bg-white p-6" data-testid="fanout"><div className="flex items-baseline justify-between"><h2 className="text-[20px] font-semibold">Your {total} sats, shared out at once</h2><span className="text-[13px] text-neutral-500">no label, no waiting</span></div>
    <ul className="mt-4 space-y-3">{split.map((s, i) => <li key={s.id} className="grid grid-cols-[88px_1fr_64px] items-center gap-3"><span className="text-[15px] font-medium">{s.who}<span className="block text-[11px] font-normal text-neutral-500">{role[s.id]}</span></span>
      <span className="h-3 overflow-hidden rounded-full bg-neutral-100"><span className={cx('block h-3 rounded-full transition-all duration-1000 ease-out', colour[s.id])} style={{ width: go1 ? `${(s.sats / total) * 100}%` : '0%', transitionDelay: `${i * 250}ms` }} /></span>
      <span className="text-right text-[18px] font-bold tabular-nums" data-testid={`share-${s.id}`}>{s.sats}</span></li>)}</ul>
    <p className="mt-4 text-[14px] text-neutral-500">Each of them gets a signed statement of this sale, so anyone short-changed can prove it.</p></section>;
}
function CheatStop1() {
  const st = useStory(); const price = st.r.s1cheatPrice as Verdict | undefined; const audio = st.r.s1cheatAudio as ReturnType<typeof S.cheatAudio> | undefined;
  return <Cheat title="change one thing">
    <p className="text-[15px] text-neutral-600">Take the licence you just bought and change one thing. Then check it again.</p>
    <div className="mt-3 flex flex-wrap gap-2"><BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('s1cheatPrice', S.cheatPrice)}>Change the price to 1 sat</BigButton><BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('s1cheatAudio', lab => S.cheatAudio(lab))}>Change one byte of the song</BigButton></div>
    <div className="mt-3 space-y-3">{price && <Bad testid="cheat-price" title="The licence with the price changed to 1 sat" line={`Not valid: ${plainReason(price)}`}><p className="mt-1 text-[14px] text-neutral-600">Alice's signature covers the price. Change anything, and it no longer matches.</p></Bad>}
      {audio && <Bad testid="cheat-audio" title={`The song with 1 of its ${n(audio.ofBytes)} bytes changed`} line="Not the licensed file: the offer names the exact song"><p className="mt-1 text-[14px] text-neutral-600">The original file's fingerprint {audio.originalMatches ? 'matches' : 'does not match'} the offer. The changed file's fingerprint is completely different, so no one can pass off an edited copy.</p></Bad>}</div>
  </Cheat>;
}

// ---------- Stop 2: agents buy at scale ----------
export function Stop2() {
  const st = useStory(); const one = st.r.s2one; const poison = st.r.s2poison; const scale = st.r.s2scale;
  const buyer = st.persona === 'buyer';
  const runScale = async () => { const out = await story.run('s2scale', lab => S.atScale(lab, S.SCALE, k => { story.progress = k; story.set('tick', k); })); if (out && out.sampleOk === out.sample) { testkit.stopDone('stop2'); story.finish('stop2'); } };
  return <Stop id="stop2" title="Agents buy at scale" why={buyer ? 'Set a budget once. Your agent checks every bill and never spends past it.' : `Most buyers will be software. Bob's agent gets a budget: ${usd(BUDGET_USD.perPayment, { whole: true })} a payment, ${usd(BUDGET_USD.daily, { whole: true })} a day.`}>
    {!one ? (st.busy === 's2one' ? <Busy label="Bob's agent is buying…" /> : <div><BigButton onClick={async () => { const o = await story.run('s2one', S.agentBuys); if (o?.verdict.result.ok) testkit.licence(); }}>Let Bob's agent buy a licence</BigButton></div>) : <>
      <div className="fade-in rounded-2xl border border-neutral-200 bg-white p-6" data-testid="s2-one"><div className="text-[22px] font-semibold">Licensed for {usd(PRICE_CENTS)}. No one clicked.</div>
        <ul className="mt-3 grid grid-cols-2 gap-2"><Row>Right price</Row><Row>Right licence</Row><Row>Paid to Alice</Row><Row>Inside budget</Row></ul></div>
      <Cheat title="hide an order">
        <p className="text-[15px] text-neutral-600">Mallory hides an order in her offer and bills {usdFromSats(500_000, { whole: true })}.</p>
        {!poison ? <div className="mt-3"><BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('s2poison', S.poisonedPrompt)}>Send the poisoned offer</BigButton></div>
          : <div className="mt-3 space-y-3" data-testid="cheat-poison"><blockquote className="rounded-lg bg-neutral-100 px-4 py-3 font-mono text-[13px] text-neutral-500 line-through decoration-red-400">"{poison.text.replace(/([\d,]+) sats/, (_: string, x: string) => usdFromSats(Number(x.replace(/,/g, '')), { whole: true }))}"</blockquote>
            <Good line={poison.refused ? `Blocked: order ignored. Paid: ${usdFromSats(poison.paid)}` : 'It got through'} /></div>}
      </Cheat>
      {!scale ? (st.busy === 's2scale' ? <Counter k={story.progress} /> : <div><BigButton onClick={runScale} data-testid="scale-go"><Sparkles size={18} />Now buy {n(S.SCALE)}</BigButton></div>) : <>
        <Good testid="verdict-scale" line={scale.sampleOk === scale.sample ? `${n(scale.n)} licences ✓ inside budget` : 'Some licences failed'}>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">{[[(scale.buyMs / 1000).toFixed(1) + ' s', 'in total'], ['1', 'Bitcoin proof']].map(([a, b]) => <div key={b} className="rounded-xl bg-white/70 p-3"><div className="text-[24px] font-bold tabular-nums">{a}</div><div className="text-[12px] text-neutral-500">{b}</div></div>)}</div>
          <p className="mt-3 text-[15px] text-neutral-600" data-testid="scale-dollars">{n(scale.n)} licences for {usdFromSats(scale.spent, { whole: true })}, inside a {usd(BUDGET_USD.daily, { whole: true })} daily budget. {scale.sampleOk} of {scale.sample} re-checked: all real.</p>
          <Budget spent={scale.spentToday} cap={scale.cap} /><Proven short label="Proven on Bitcoin ✓" /></Good>
      </>}
      <CodeDrawer><p>Bob's agent pays through <b>NWC</b> (Nostr Wallet Connect): the connection only allows paying, at most {S.BUDGET.maxPerPaymentSat} sats a payment and {n(S.BUDGET.dailyCapSat)} a day, on ClipAI's wallet. Before each payment it checks the <b>invoice</b> amount equals its own signed request ({S.PRICE} sats; the poisoned one asked {poison ? n(poison.asked) : '500,000'}), the <b>description hash</b> commits to that request, and the invoice is signed by the <b>node</b> Alice bound to her key. The agent's own trace for the first licence:</p>
        <Code>{one.trace.join('\n')}</Code>
        {poison && <Code>{poison.trace.join('\n')}</Code>}
        {scale && <p>The {n(scale.n)} licences went into one <b>OpenTimestamps</b> batch: one Bitcoin block ({scale.block}) commits to all of them, each with its own small proof. Every bill was checked before paying, and {scale.sample} picked at random were re-checked from scratch with <b>verifyLicence</b>. Money is simulated here; signatures, invoices, proofs and checks are real.</p>}</CodeDrawer>
      {scale && <Next from="stop2" />}</>}
  </Stop>;
}
function Budget({ spent, cap }: { spent: number; cap: number }) {
  return <div className="mt-5" data-testid="budget"><div className="flex justify-between text-[13px] text-neutral-500"><span>Daily budget</span><span className="tabular-nums">{usdFromSats(spent, { whole: true })} of {usdFromSats(cap, { whole: true })} used</span></div><div className="mt-1 h-2.5 rounded-full bg-neutral-200"><div className="h-2.5 rounded-full bg-neutral-900 transition-all duration-500" style={{ width: `${Math.min(100, spent / cap * 100)}%` }} /></div></div>;
}
function Counter({ k }: { k: number }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center" data-testid="counter" aria-live="polite"><div className="text-[64px] font-bold leading-none tabular-nums">{n(k)}</div><div className="mt-2 text-[15px] text-neutral-500">licences bought and checked, one by one</div>
    <div className="mx-auto mt-4 h-2 max-w-[420px] rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${k / S.SCALE * 100}%` }} /></div></div>;
}

// ---------- Stop 3: anyone verifies ----------
export function Stop3() {
  const st = useStory(); const v = st.r.s3button as Verdict | undefined; const reg = st.r.s3reg; const fake = st.r.s3fake as Verdict | undefined;
  const check = async () => { const out = await story.run('s3button', S.licenseButton); if (out?.result.ok) { testkit.licence(); testkit.stopDone('stop3'); story.finish('stop3'); } };
  return <Stop id="stop3" title="Anyone verifies" why="A video site, a regulator or a fan can check a licence alone, in seconds, without asking Alice or any company. It needs the licence file, a view of Bitcoin, and someone it trusts to say who owns the song.">
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white" data-testid="video-card">
      <div className="relative flex aspect-video items-center justify-center bg-[linear-gradient(135deg,#334155,#0f172a_55%,#000)]"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black"><Play size={22} className="ml-1" /></span><span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[12px] text-white">♪ "Rain" · Alice</span></div>
      <div className="flex flex-wrap items-center gap-3 p-4"><div className="flex-1"><div className="font-semibold">Bob's travel video</div><div className="text-[13px] text-neutral-500">A video site, with a licence attached</div></div>
        {!v ? (st.busy === 's3button' ? <Busy label="Checking…" /> : <BigButton onClick={check} data-testid="license-this">✓ Check the licence</BigButton>) : <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[14px] font-semibold text-emerald-700">Licensed ✓</span>}</div></div>
    {v && <>
      <VerdictCard v={v}>{v.result.ok && <><p className="mt-1 text-[15px] text-neutral-600">Checked here, alone, in {Math.max(1, Math.round(v.ms))} ms: Alice and her co-owners agreed, the money went to her, and it was paid.</p><Proven /></>}</VerdictCard>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6" data-testid="regulator"><h2 className="text-[20px] font-semibold">A regulator asks: "Prove you had permission to train on this song."</h2>
        <p className="mt-1 text-[15px] text-neutral-600">ModelCo trains an AI music model on "Rain". Months later it hands over its licence and its training log.</p>
        {!reg ? <div className="mt-4"><BigButton variant="quiet" disabled={!!st.busy} onClick={() => story.run('s3reg', S.regulatorCheck)}>{st.busy === 's3reg' ? 'Checking…' : 'Check ModelCo\'s proof'}</BigButton></div>
          : <><ul className="mt-4 space-y-2">{reg.checks.map((c: any) => <Row key={c.text} ok={c.ok}>{c.text}</Row>)}</ul><div className={cx('mt-4 text-[18px] font-semibold', reg.ok ? 'text-emerald-700' : 'text-red-700')}>{reg.ok ? 'Permission proven ✓' : 'Not proven'}</div></>}</section>
      <Cheat title='sell a copy as "Alice Official"'>
        <p className="text-[15px] text-neutral-600">A copycat account calls itself "Alice Official", signs its own offer for "Rain" and sells a licence. Is it real?</p>
        {!fake ? <div className="mt-3"><BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('s3fake', S.fakeCaught)}>Check the copycat's licence</BigButton></div>
          : <div className="mt-3"><Bad testid="cheat-fake" line={fake.result.ok ? 'It got through' : 'Fake ✗ Caught: "Alice Official" never owned the rights to "Rain"'}><p className="mt-1 text-[14px] text-neutral-600">The copy is signed correctly and was really paid. What it cannot fake is who owns the song: Alice's distributor, which this checker trusts, signed that Alice's account owns "Rain". With no voucher like that, the answer would be "owner not checked", never "real".</p></Bad></div>}
      </Cheat>
      <CodeDrawer><p><b>verifyLicence</b> runs nine checks on the <b>bundle</b>: the offer signature, the <b>binding</b> between Alice's key and her Lightning <b>node</b>, every co-owner's consent, the request, the <b>invoice</b> (signed by the bound node, committing to the request), the <b>preimage</b>, and the Bitcoin timestamp (an <b>OpenTimestamps</b> proof). Check 9: has the offer been withdrawn? These nine prove that this account sold the licence and was paid. They do not prove it owns the song. That is <b>check 10</b>: it needs a voucher you trust (here the distributor's signed vouch) or a chain of title that starts from one. Without it, the result says <i>unverified ownership</i>.</p>
        <Code>{`import { verifyLicence } from 'mll'
const result = await verifyLicence(bundle, chain, { ownership: { trust: [distributorKey], vouches } })
if (result.ok && result.ownership?.status === 'verified') showBadge('Licensed ✓')
// copycat → ${fake ? `{ ok: ${fake.result.ok}, code: '${fake.result.code}', ownership: '${fake.result.ownership?.status}' }` : '(try it above)'}
// no voucher → { ok: true, ownership: 'unverified' }: sold and paid, owner not checked`}</Code>
        <p><button className="underline" onClick={() => go('verify')}>Check your own licence file →</button> · <button className="underline" onClick={() => go('redteam')}>Try to break it →</button></p></CodeDrawer>
      <Next from="stop3" /></>}
  </Stop>;
}

// ---------- Extra: rights change hands ----------
export function RightsExtra() {
  const st = useStory(); const sale = st.r.xsale; const old = st.r.xold as Verdict | undefined; const succ = st.r.xsucc; const stolen = st.r.xstolen;
  useEffect(() => { if (sale && succ && stolen) { story.finish('rights'); testkit.stopDone('rights'); } }, [sale, succ, stolen]);
  const play = async () => { if (!st.r.xsale) await story.run('xsale', S.rightsSale, 'sale'); await sleep(700); if (!story.r.xsucc) await story.run('xsucc', S.succession, 'succ'); await sleep(700); if (!story.r.xstolen) await story.run('xstolen', S.stolenKey, 'stolen'); };
  const busy = st.busy === 'xsale' || st.busy === 'xsucc' || st.busy === 'xstolen';
  return <Stop id="rights" title="Rights change hands" why="Songs are sold, and outlive the people who made them. Licences must survive both.">
    {!sale && !busy && <div><BigButton onClick={play} data-testid="rights-play">Show what happens</BigButton></div>}
    {(sale || busy) && <section className="space-y-3"><h2 className="text-[20px] font-semibold">1. Alice sells "Rain" to Harbour Music</h2>
      {!sale ? <Busy label="Signing the sale…" /> : <>
        <Good testid="x-sale" line='"Rain" now belongs to Harbour Music'><p className="mt-1 text-[14px] text-neutral-600">Carol and Dave agreed. The date is fixed on Bitcoin.</p></Good>
        <div className="grid gap-3 sm:grid-cols-2"><VerdictCard compact noChecks v={sale.earlier} title="Your licence, from before the sale" testid="verdict-earlier" /><VerdictCard compact noChecks v={sale.newOwner} title="A new licence from Harbour" testid="verdict-harbour" /></div>
        <Cheat title="sell from Alice's old account">{!old ? <BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('xold', S.cheatOldAccount, 'sale')}>Sell from the old account</BigButton> : <Bad testid="cheat-old" line={old.result.ok ? 'It got through' : `Not valid: ${plainReason(old)}`} />}</Cheat></>}
    </section>}
    {(succ || st.busy === 'xsucc') && <section className="space-y-3"><h2 className="text-[20px] font-semibold">2. Alice dies, with a plan</h2><p className="text-[16px] text-neutral-600">Any two of Heidi (daughter), Ivan (brother) and Judy (lawyer) may take over.</p>
      {!succ ? <Busy label="Collecting signatures…" /> : <div className="fade-in space-y-3" data-testid="x-succ">
        <div className="flex flex-wrap gap-2">{[['Heidi', true], ['Ivan', true], ['Judy', false]].map(([who, signed], i) => <span key={who as string} className={cx('fade-in inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px]', signed ? 'bg-emerald-500/15 font-semibold text-emerald-700' : 'bg-neutral-100 text-neutral-500')} style={{ animationDelay: `${i * 300}ms` }}>{signed ? <CheckCircle2 size={15} /> : null}{who as string}{signed ? ' signed' : ' not needed'}</span>)}</div>
        <VerdictCard compact noChecks v={succ.heirs} title="A new licence from the heirs (2 of 3)" line={succ.heirs.result.ok ? 'Real ✓ The music keeps paying' : undefined} testid="verdict-heirs" />
        <p className="text-[14px] text-neutral-500">One heir alone: {succ.oneHeir.result.ok ? 'went through' : 'not valid'}. Your older licence: {succ.earlier.result.ok ? 'still real' : 'not valid'}.</p></div>}
    </section>}
    {(stolen || st.busy === 'xstolen') && <section className="space-y-3"><h2 className="text-[20px] font-semibold">3. Alice's phone is stolen</h2><p className="text-[16px] text-neutral-600">She moves to a new account. The thief keeps the old one.</p>
      {!stolen ? <Busy label="Moving to a new account…" /> : <div className="grid gap-3 sm:grid-cols-2" data-testid="x-stolen"><VerdictCard compact noChecks v={stolen.thief} title="The thief sells with the old account" testid="verdict-thief" /><VerdictCard compact noChecks v={stolen.earlier} title="Your licence, from before the theft" testid="verdict-before-theft" /></div>}
    </section>}
    <p className="rounded-xl bg-neutral-100 px-4 py-3 text-[14px] text-neutral-600">Honest limit: with no plan, the estate needs a court order. <a className="underline" href="#/s27">See the estate with no plan →</a></p>
    <CodeDrawer><p>A <b>transfer record</b> (draft kind 3417) signed by the holder names the track's fingerprint and the new key; co-owners co-sign (kind 3419). A 36-byte <b>OP_RETURN</b> ("MLT1" and a digest of the record and its co-signatures) dates it. A <b>succession plan</b> (kind 3418) names keys and a threshold. A key rotation is a transfer to your own new key. Check 9 walks this chain of title from Alice's vouched key; the first dated transfer wins, so a double sale fails. Each verdict above passed or failed the same nine checks as every licence.</p>
      <p>Under the hood: <a className="underline" href="#/s25">rights sale</a> · <a className="underline" href="#/s26">planned succession</a> · <a className="underline" href="#/s11">stolen key</a> · <a className="underline" href="#/redteam">rights attacks</a></p></CodeDrawer>
    {sale && succ && stolen && <div className="pt-2 text-center" data-testid="rights-done"><div className="text-[19px] text-neutral-600">{SHORT}</div><div className="mt-5 flex justify-center"><BigButton onClick={() => go('hood')}>Explore under the hood <ArrowRight size={18} /></BigButton></div></div>}
  </Stop>;
}
export { plainReason };
