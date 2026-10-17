// The main path, vision-audit version: one simple sale per screen with the cause and the effect both visible.
// A wallet strip in dollars sits at the top of every stop (before you act, ticking when money moves, carried across stops);
// Stop 1 sells one song with a licence switch and Alice's price stepper; Stop 2 is ClipAI's agent inside a monthly budget plus the
// Harbour Music catalogue subscription (draft); Stop 3 checks the licence; the end offers three next steps.
// Everything technical (sats, checks, drafts, cheats, code) sits behind "See the proof" or under "I build".
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Pause, CheckCircle2, ChevronDown, ExternalLink, Wrench, Minus, Plus, Upload, Bot, GitBranch as Github, ArrowRight } from 'lucide-react';
import { music, useMusic, type Track } from '../music';
import { Art } from '../MiniPlayer';
import { cx } from '../bits';
import { go } from '../store';
import { short, tagv, sha256hex, USES, type Verdict } from '../../engine/lab';
import { persona } from '../../engine/cast';
import * as S from '../../engine/story';
import { CATALOGUE, LICENCES, licence, defaultPriceCents, shareCents, licenseTrack, termsFor, toSats, PRICE_MIN_CENTS, PRICE_MAX_CENTS, PRICE_STEP_CENTS, type CatalogueTrack, type LicenceType, ownSongSale } from '../../engine/catalogue';
import { VIDEOS, PLAN, BUDGET_DEFAULT_CENTS, BUDGET_MIN_CENTS, BUDGET_MAX_CENTS, BUDGET_STEP_CENTS, MAX_PER_PAYMENT_CENTS, AGENT, videoLicences, subscribe, renew, catalogueHash, setBudget, budgetLeftCents } from '../../engine/company';
import { useStory, story, sleep, STOPS, type StopId } from './state';
import { useProof } from './proof';
import { testkit } from '../testkit';
import { faucetReachable, realLicence, type RealResult } from '../../live/realpay';
import { usd, usdFromSats, DEMO_RATE_LABEL } from '../money';
import { BigButton, Busy, VerdictCard, Proven, CodeDrawer, Code, Cheat, Bad, Good, Row, Next, useRealMoney, RealToggle, CheatStop1, Counter, n, SHORT, type Real } from './Story';
import { plainReason } from '../plain';

export const COLOUR: Record<string, string> = { alice: 'bg-violet-500', carol: 'bg-sky-500', dave: 'bg-pink-500', erin: 'bg-teal-500', frank: 'bg-orange-500', bobagent: 'bg-amber-400', clipagent: 'bg-cyan-400', harbour: 'bg-blue-600', you: 'bg-emerald-500' };
export const NAME = (id: string) => (id === 'you' ? 'You' : persona(id).name);
/** One real test payment is capped here (faucet test wallets hold up to 5,000 test sats; Alice's stepper tops out at $200 = 4,000). */
export const MAX_REAL_TEST_SATS = 4_000;
const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
/** Counts from `from` to `to` after `delay` ms. */
function useCount(from: number, to: number, delay: number, ms = 900) {
  const [v, setV] = useState(reducedMotion() ? to : from);
  useEffect(() => { if (reducedMotion()) { setV(to); return; } let raf = 0; const t0 = performance.now() + delay;
    const f = (now: number) => { const k = Math.min(1, Math.max(0, (now - t0) / ms)); setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [from, to, delay, ms]);
  return v;
}
/** A dollar amount that ticks to its new value and flashes green (up) or red (down). */
export function Ticker({ cents, testid }: { cents: number; testid?: string }) {
  const prev = useRef(cents); const [from, setFrom] = useState(cents); const [dir, setDir] = useState<0 | 1 | -1>(0);
  useEffect(() => { if (cents !== prev.current) { setFrom(prev.current); setDir(cents > prev.current ? 1 : -1); prev.current = cents; const t = setTimeout(() => setDir(0), 1600); return () => clearTimeout(t); } }, [cents]);
  const v = useCount(from, cents, 0, 900);
  return <span data-testid={testid} data-cents={cents} className={cx('tabular-nums font-semibold transition-colors', dir === 1 ? 'text-emerald-600' : dir === -1 ? 'text-red-600' : 'text-neutral-900')}>{usd(v)}</span>;
}
/** The always-visible wallet strip. */
export function WalletStrip({ ids, extra }: { ids: string[]; extra?: ReactNode }) {
  const st = useStory();
  return <div className="sticky top-0 z-20 border-b border-neutral-200 bg-[var(--page,#fff)]/95 backdrop-blur" data-testid="wallet-strip" aria-label="Wallets">
    <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-center gap-1 px-3 py-1.5 text-[12px] sm:gap-1.5 sm:py-2 sm:text-[13px] md:px-6">
      <span className="mr-1 hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 sm:inline">Wallets</span>{extra}
      {ids.map(id => <span key={id} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 sm:px-2.5 sm:py-1" data-wallet={id}><span className={cx('h-2 w-2 rounded-full', COLOUR[id] ?? 'bg-neutral-400')} /><span className="text-neutral-600">{NAME(id)}</span><Ticker cents={st.cash[id] ?? 0} testid={`wallet-${id}`} /></span>)}
    </div></div>;
}
function PathStop({ id, title, why, strip, children }: { id: StopId; title: string; why?: string; strip: ReactNode; children: ReactNode }) {
  const st = useStory(); const i = st.order().indexOf(id);
  return <div data-stop={id} data-version="vision">{strip}
    <div className="mx-auto flex max-w-[760px] flex-col px-5 pb-10 pt-6 md:px-6 md:pt-10">
      <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{i >= 0 ? `Stop ${i + 1} of 3` : 'Stop'}</div>
      <h1 className="mt-2 text-[30px] font-bold leading-tight tracking-tight md:text-[42px]">{title}</h1>
      {why && <p className="mt-2 text-[17px] leading-7 text-neutral-600">{why}</p>}
      <div className="mt-6 space-y-5">{children}</div></div></div>;
}
/** A collapsed panel for everything technical. */
function ProofPanel({ title = 'See the proof', children, open: start = false, testid = 'see-proof' }: { title?: string; children: ReactNode; open?: boolean; testid?: string }) {
  const [open, setOpen] = useState(start);
  return <div className="rounded-2xl border border-neutral-200 bg-white text-left">
    <button onClick={() => setOpen(!open)} aria-expanded={open} data-testid={testid} className="flex w-full items-center gap-2 px-5 py-4 text-[16px] font-medium text-neutral-700 hover:text-neutral-900"><Wrench size={15} className="text-neutral-400" />{title}<ChevronDown size={17} className={cx('ml-auto transition-transform', open && 'rotate-180')} /></button>
    {open && <div className="fade-in space-y-5 border-t border-neutral-200 px-5 pb-5 pt-4" data-testid={`${testid}-panel`}>{children}</div>}</div>;
}
/** Licence switch: Personal · Creator · Business, with what each allows. */
function LicenceSwitch({ value, prices, onChange, disabled }: { value: LicenceType; prices: Record<LicenceType, number>; onChange: (t: LicenceType) => void; disabled?: boolean }) {
  return <div><div role="radiogroup" aria-label="Licence" className="grid grid-cols-3 gap-1 rounded-full bg-neutral-100 p-1" data-testid="licence-switch">
    {LICENCES.map(l => <button key={l.id} role="radio" aria-checked={value === l.id} disabled={disabled} onClick={() => onChange(l.id)} data-testid={`licence-${l.id}`}
      className={cx('whitespace-nowrap rounded-full px-1 py-1.5 text-[12.5px] transition-colors sm:px-2 sm:text-[14px]', value === l.id ? 'bg-neutral-900 font-semibold text-white shadow' : 'text-neutral-600 hover:text-neutral-900')}>{l.label} <span className="tabular-nums">{usd(prices[l.id], { whole: true })}</span></button>)}</div>
    <div className="mt-1.5 text-[14px] text-neutral-600" data-testid="licence-allows">{licence(value).allows}</div></div>;
}
function Stepper({ cents, onChange, who, disabled }: { cents: number; onChange: (c: number) => void; who: string; disabled?: boolean }) {
  const b = 'flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40';
  return <div className="flex items-center gap-2" data-testid="price-stepper"><button className={b} aria-label="Lower the price" disabled={disabled || cents <= PRICE_MIN_CENTS} onClick={() => onChange(cents - PRICE_STEP_CENTS)}><Minus size={14} /></button>
    <span className="text-[34px] font-bold leading-none tabular-nums sm:text-[44px]" data-testid="price">{usd(cents)}</span>
    <button className={b} aria-label="Raise the price" disabled={disabled || cents >= PRICE_MAX_CENTS} onClick={() => onChange(cents + PRICE_STEP_CENTS)}><Plus size={14} /></button>
    <span className="text-[12px] leading-4 text-neutral-500">{who}<br />sets this</span></div>;
}
// ---------- Stop 1: one sale ----------
type Item = { c: CatalogueTrack; t?: Track };
function playlist(): Item[] { const xs = CATALOGUE.flatMap(c => { const t = music.tracks.find(x => x.cast === c.cast); return t ? [{ c, t }] : []; }); return xs.length ? xs : [{ c: CATALOGUE[0], t: undefined }]; }
type RealOut = (RealResult & { wanted?: number }) | { error: string } | undefined;
export function ArtistStop1() {
  useMusic(); const st = useStory(); const items = playlist(); const cur = music.current(); const sel = items.find(i => i.t && i.t.id === cur?.id) ?? items[0];
  const { c, t } = sel; const type: LicenceType = st.r.s1type ?? 'creator'; const prices = st.r.prices ?? {};
  const priceOf = (ty: LicenceType) => prices[`${c.cast}:${ty}`] ?? defaultPriceCents(c, ty); const cents = priceOf(type);
  const rk = `s1:${c.cast}:${type}:${cents}`; const r = st.r[rk]; const rr: RealOut = st.r[rk + ':real'];
  const playing = music.isPlaying(t?.id ?? null) || (!t && music.mode === 'tone' && music.isPlaying());
  const real = useRealMoney(); const [label, setLabel] = useState(''); const [landed, setLanded] = useState(''); const busy = !!st.busy;
  const seller = NAME(c.seller); const co = c.shares.filter(s => s.who !== c.seller); const lic = licence(type); const short$ = (st.cash.bobagent ?? 0) < cents;
  const setType = (ty: LicenceType) => story.set('s1type', ty); const setPrice = (v: number) => story.set('prices', { ...prices, [`${c.cast}:${type}`]: v });
  const pick = (x: Item) => { if (busy || !x.t || x.t.id === t?.id) return; const was = music.isPlaying(); music.select(x.t.id); if (was) music.toggle(x.t.id); };
  const buy = async () => { const it = sel; const ty = type; const pc = cents; const key = rk; const sats = toSats(pc); const paySats = Math.min(sats, MAX_REAL_TEST_SATS); setLanded('');
    await story.run(key, async lab => {
      setLabel("Bob's agent is buying…");
      const useReal = real.known || real.decided ? real.on : await faucetReachable(3000);
      if (useReal) { try { const rainDefault = it.c.cast === 'alice' && ty === 'creator' && sats === S.PRICE;
          const song = rainDefault ? undefined : { title: it.c.title, sha256: it.t?.sha256 ?? lab.trackHash, termsText: termsFor(it.c, NAME(it.c.seller), ty), use: USES[licence(ty).use] };
          story.r[key + ':real'] = { ...(await realLicence({ priceSat: paySats, song, onStep: s => setLabel(/^Pay/.test(s) ? `Paying ${usd(pc)}…` : /^Check/.test(s) ? 'Checking it…' : "Bob's agent is buying…") })), wanted: sats }; }
        catch (e: any) { story.r[key + ':real'] = { error: String(e?.message ?? e) }; } }
      setLabel(`Paying ${usd(pc)}…`); await sleep(250); const out = await licenseTrack(lab, it.c, it.t?.sha256 ?? lab.trackHash, { type: ty, priceCents: pc }); setLabel('Saving the proof…'); await sleep(300); return out; });
    const out = story.r[key]; if (out?.verdict.result.ok) {
      story.move('bobagent', Object.fromEntries(out.split.map((s: any) => [s.id, s.sats * 5]))); story.r.lastLicence = { bundle: out.bundle, c: it.c, type: ty, cents: pc };
      testkit.licence(); testkit.stopDone('stop1'); story.finish('stop1');
      if (it.t) { music.unlock(it.t.id, { how: `Licensed in stop 1 (${licence(ty).label}): all ${out.verdict.passed} checks passed`, fileOk: out.verdict.file?.ok, holder: 'you' }); if (!music.isPlaying(it.t.id)) music.toggle(it.t.id); } } };
  const licensed = !!r?.verdict.result.ok || !!music.unlocked(t?.id);
  const strip = <WalletStrip ids={['bobagent', c.seller, ...co.map(s => s.who)]} />;
  return <PathStop id="stop1" title="Alice sells. Bob's agent buys." strip={strip}>
    {/* The offer: the song, the licence, the price, who shares */}
    <section className="rounded-3xl border border-neutral-200 bg-white p-4 sm:p-6" data-testid="song-card" data-track={c.cast}>
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{seller}'s offer</div>
      <div className="flex items-center gap-4 sm:gap-5">
        <button onClick={() => music.toggle(t?.id ?? null)} className="group relative shrink-0 rounded-2xl shadow-2xl" aria-label={playing ? `Pause ${c.title}` : `Play ${c.title}`}><Art t={t} size={typeof innerWidth === 'number' && innerWidth < 640 ? 88 : 132} />
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl transition group-hover:bg-black/20"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">{playing ? <Pause size={20} /> : <Play size={20} className="ml-1" />}</span></span></button>
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-semibold leading-tight sm:text-[24px]" data-testid="song-title">"{c.title}" <span className="font-normal text-neutral-500">· {seller}</span></div>
          <div className="text-[13px] text-neutral-500" data-testid="track-state">{licensed ? 'Full song unlocked' : playing ? 'Playing a 30-second taste' : 'Tap the cover to listen'}</div>
          <div className="mt-2"><Stepper cents={cents} onChange={setPrice} who={seller} disabled={busy} /></div>
        </div></div>
      <div className="mt-4 space-y-3">
        <LicenceSwitch value={type} prices={{ personal: priceOf('personal'), creator: priceOf('creator'), business: priceOf('business') }} onChange={setType} disabled={busy} />
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]" data-testid="shares">{co.length ? <><span className="text-neutral-500">Shared with</span>
          {co.map(s => <span key={s.who} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"><span className={cx('h-2 w-2 rounded-full', COLOUR[s.who])} />{NAME(s.who)} {s.bps / 100}%<span className="text-neutral-500">· {s.role}</span></span>)}</>
          : <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"><span className={cx('h-2 w-2 rounded-full', COLOUR[c.seller])} />Solo: {seller} keeps 100%</span>}</div>
      </div>
    </section>
    {/* The action */}
    {!r && <div className="flex flex-col items-center gap-2 text-center">
      {st.busy === rk ? <Busy label={label || "Bob's agent is buying…"} /> : <BigButton onClick={buy} disabled={busy || short$} data-testid="buy">Let Bob's agent buy it</BigButton>}
      {short$ ? <p className="text-[13px] text-amber-700" data-testid="low-funds">Bob's agent has {usd(st.cash.bobagent ?? 0)} left. <button className="underline" onClick={() => story.move('bobtopup', { bobagent: 10_000 })}>Top up $100</button></p>
        : <p className="text-[13px] text-neutral-500">Test money only. No real money moves.</p>}</div>}
    {/* The effect */}
    {r && <div className="space-y-4">
      {r.verdict.result.ok ? <Payoff key={rk} c={c} cents={cents} artist={st.persona === 'artist'} onLanded={() => setLanded(rk)} /> : <Bad line="Something went wrong with this sale" />}
      {r.verdict.result.ok && <p className="text-center text-[14px] leading-6 text-neutral-600" data-testid="log-line">Bob's agent paid {seller} {usd(cents)}{co.length ? ` · ${seller} passed on ${co.map((s, k) => `${NAME(s.who)} ${usd(shareCents(c, cents)[c.shares.indexOf(s)])}`).join(', ')}` : ''} · {lic.label} licence: {lic.allows.toLowerCase()}</p>}
      {(landed === rk || !r.verdict.result.ok) && <div className="fade-in flex justify-center pt-1"><Next from="stop1" /></div>}
    </div>}
    {items.length > 1 && <Playlist items={items} sel={sel} busy={busy} onPick={pick} />}
    <ProofPanel key={rk} title={r ? 'See the proof' : 'How it works'}><Stop1Proof r={r} rr={rr} real={real} c={c} type={type} cents={cents} /></ProofPanel>
  </PathStop>;
}
function Playlist({ items, sel, busy, onPick }: { items: Item[]; sel: Item; busy: boolean; onPick: (x: Item) => void }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => { const ul = ref.current; const li = ul?.querySelector('[aria-pressed=true]')?.parentElement as HTMLElement | null; if (!ul || !li || ul.scrollWidth <= ul.clientWidth) return;
    if (li.offsetLeft < ul.scrollLeft || li.offsetLeft + li.offsetWidth > ul.scrollLeft + ul.clientWidth) ul.scrollTo({ left: Math.max(0, li.offsetLeft - 20), behavior: reducedMotion() ? 'auto' : 'smooth' }); }, [sel.c.cast]);
  return <section data-testid="playlist" aria-label="Try another song"><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Try another song</div>
    <ul ref={ref} className={cx('scroll-thin relative -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0', busy && 'pointer-events-none opacity-60')}>
      {items.map(x => { const on = x === sel; const p = music.isPlaying(x.t?.id ?? null); const done = !!music.unlocked(x.t?.id);
        return <li key={x.c.cast} className="w-[136px] shrink-0 snap-start sm:w-auto"><div role="button" tabIndex={0} aria-pressed={on} data-testid={`pick-${x.c.cast}`} title={`${x.c.title} · ${NAME(x.c.seller)}`} onClick={() => onPick(x)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(x); } }}
          className={cx('flex h-full cursor-pointer flex-col gap-2 rounded-2xl border bg-white p-2.5 text-left transition-colors', on ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-400')}>
          <div className="flex items-center gap-2"><Art t={x.t} size={40} /><button aria-label={p ? `Pause ${x.c.title}` : `Play ${x.c.title}`} onClick={e => { e.stopPropagation(); if (x.t) music.toggle(x.t.id); }} className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">{p ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}</button></div>
          <div className="min-w-0"><div className="truncate text-[14px] font-semibold">{x.c.title}</div><div className="truncate text-[12px] text-neutral-500">{NAME(x.c.seller)}</div></div>
          <div className="text-[13px] tabular-nums text-neutral-600">from {usd(100, { whole: true })}{done && <span className="ml-1 text-emerald-600">✓</span>}</div></div></li>; })}
    </ul></section>;
}
function Payoff({ c, cents, artist, onLanded }: { c: CatalogueTrack; cents: number; artist: boolean; onLanded: () => void }) {
  const parts = shareCents(c, cents); const proof = useProof(); const bob = useCount(0, cents, 150, 1100); const [saved, setSaved] = useState(reducedMotion()); const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: innerWidth < 640 ? 'center' : 'nearest' }); }, []);
  useEffect(() => { const tm = setTimeout(() => { setSaved(true); onLanded(); }, reducedMotion() ? 0 : 1900); return () => clearTimeout(tm); }, []);
  const k3 = c.shares.length;
  return <section ref={ref} className="fade-in scroll-mt-16 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:p-6" data-testid="payoff">
    <div className="flex items-center gap-2 text-[24px] font-bold text-emerald-700"><CheckCircle2 size={26} />Paid</div>
    <div className="mt-4 grid items-center gap-3 md:grid-cols-[150px_1fr_250px]">
      <div className="rounded-2xl bg-white p-4 text-center" data-testid="from-bob"><div className="text-[14px] text-neutral-500">Bob's agent</div><div className="mt-1 text-[30px] font-bold tabular-nums">{usd(bob)}</div><div className="text-[12px] text-neutral-500">{bob === cents ? 'paid' : 'paying…'}</div></div>
      <div className={cx('relative hidden md:block', k3 === 1 ? 'h-[70px]' : k3 === 2 ? 'h-[130px]' : 'h-[180px]')} aria-hidden>{c.shares.map((s, k) => [0, 1, 2].map(j => <span key={`${s.who}${j}`} className={cx('coin absolute h-4 w-4 rounded-full shadow', COLOUR[s.who] ?? 'bg-amber-400')} style={{ top: `${k3 === 1 ? 40 : 15 + k * (70 / Math.max(1, k3 - 1))}%`, animationDelay: `${150 + k * 220 + j * 160}ms` }} />))}</div>
      <div className="flex justify-center md:hidden" aria-hidden><span className="coin-y h-4 w-4 rounded-full bg-amber-400 shadow" /></div>
      <ul className={cx('grid gap-2 md:grid-cols-1', k3 === 1 ? 'grid-cols-1' : k3 === 2 ? 'grid-cols-2' : 'grid-cols-3')}>{c.shares.map((s, k) => <ShareCard key={s.who} id={s.who} role={s.role} cents={parts[k]} pct={s.bps / 100} delay={350 + k * 220} you={artist && s.who === c.seller} />)}</ul>
    </div>
    {saved && <div className="fade-in mt-5 flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="proof-saved"><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[16px] font-semibold text-emerald-700">Proof saved on Bitcoin ✓</span><span className="text-[13px] text-neutral-600">Anyone can check it.</span>
      {proof && <a href={proof.txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900">See a real one<ExternalLink size={12} /></a>}</div>}
  </section>;
}
function ShareCard({ id, role, cents, pct, delay, you }: { id: string; role: string; cents: number; pct: number; delay: number; you: boolean }) {
  const v = useCount(0, cents, delay, 900);
  return <li className="rounded-2xl bg-white p-3 text-center md:flex md:items-center md:justify-between md:px-4 md:text-left"><div><div className="flex items-center justify-center gap-1.5 text-[15px] font-semibold md:justify-start"><span className={cx('h-2.5 w-2.5 rounded-full', COLOUR[id] ?? 'bg-amber-400')} />{NAME(id)}</div>
    <div className="text-[12px] text-neutral-500">{you ? 'Your share' : role}, {pct}%</div></div><div className="mt-1 text-[22px] font-bold tabular-nums text-emerald-700 md:mt-0" data-testid={`share-${id}`}>+{usd(v)}</div></li>;
}
function Stop1Proof({ r, rr, real, c, type, cents }: { r: any; rr: RealOut; real: Real; c: CatalogueTrack; type: LicenceType; cents: number }) {
  const st = useStory(); const seller = NAME(c.seller); const co = c.shares.filter(s => s.who !== c.seller); const sats = toSats(cents); const lic = licence(type);
  const draft = lic.draft && <p className="rounded-lg border border-dashed border-amber-300 px-3 py-2 text-[13px] text-amber-800" data-testid="draft-personal">Draft: "Personal" is a new licence type the Lab adds (use <code>personal</code>). It is not in the spec yet. Creator maps to the spec's <code>creator-video</code> use and Business to <code>advert</code> (one year).</p>;
  if (!r) return <><p className="text-[15px] leading-7 text-neutral-600">{seller}'s agent signs the offer: the song, the licence, the price{co.length ? ` and the shares, agreed by ${co.map(s => NAME(s.who)).join(' and ')}` : ''}. Bob's agent pays and gets a licence anyone can check without asking {seller}. A record of the sale is dated on Bitcoin, so no one can change it later.</p>
    <p className="text-[14px] text-neutral-500">Prices show in US dollars. Underneath, the payment is {n(sats)} test sats ({usd(cents)} at a fixed demo rate: {DEMO_RATE_LABEL}; test money, not a market rate). The wallet strip starts Bob's agent with $100 of demo money.</p>{draft}<RealToggle real={real} /></>;
  return <>
    <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[14px] text-neutral-700" data-testid="demo-rate">{usd(cents)} ≈ {n(sats)} test sats (test money, demo rate: {DEMO_RATE_LABEL}) · {lic.label} licence</p>{draft}
    {rr ? <ProofReal r={rr} seller={seller} co={co.map(s => NAME(s.who))} /> : <p className="text-[14px] text-neutral-600">This sale used practice money in your browser (the test faucet was off or not reachable).</p>}
    <VerdictCard v={r.verdict} line={r.verdict.result.ok ? `All ${r.verdict.passed} checks passed` : undefined} title="The full check, run in your browser on a practice copy of Bitcoin">
      {r.verdict.result.ok && <><p className="mt-1 text-[15px] text-neutral-600">{r.split.map((s: any) => `${s.who} ${n(s.sats)}`).join(', ')} sats ({usd(cents)} in all at the demo rate){r.statements ? ', with a signed statement of the sale for each co-owner' : ''}. Checked in {Math.max(1, Math.round(r.ms))} ms.</p>
        <p className="mt-2 text-[14px] text-neutral-600" data-testid="ownership-plain">Who owns "{c.title}": {r.verdict.ownership?.status === 'pass' ? `confirmed by ${seller}'s distributor, who signed that ${seller} owns it.` : r.verdict.ownership?.status === 'fail' ? 'this account does not own it.' : 'not confirmed. The sale is real, but no one trusted here has said who owns the song.'}</p>
        <p className="mt-2 text-[13px] text-neutral-500" data-testid="file-fingerprint">The licence names this exact recording by its fingerprint <span className="font-mono">{short(tagv(r.bundle.offer, 'x') ?? '')}</span> and the use <span className="font-mono">{r.bundle.offer.tags.find((x: string[]) => x[0] === 'use')?.slice(1).join(' · ')}</span>.</p><Proven /></>}
    </VerdictCard>
    {st.persona === 'builder' && c.cast === 'alice' && <CheatStop1 />}
    <CodeDrawer><p>{seller}'s <b>offer</b> is a signed Nostr event (kind 30402), id <code>{short(r.bundle.offer.id)}</code>, naming the SHA-256 of the audio file, the price in sats ({n(sats)}), the use and the licence text. {co.length ? `${co.map(s => NAME(s.who)).join(' and ')} each sign a ` : 'No co-owners, so no '}<b>consent</b> (kind 3413). Dollars are display only ({DEMO_RATE_LABEL}). Bob signs a <b>request</b>; the shop answers <b>402</b> with a Lightning <b>invoice</b> whose description hash commits to it; paying returns the <b>preimage</b>; the <b>bundle</b> is the licence.</p>
      <Code>{`const bundle = await buy(offer)          // request → 402 → pay → preimage
const result = await verifyLicence(bundle, chain)
// → { ok: ${r.verdict.result.ok}, anchoredHeight: ${r.block} }`}</Code></CodeDrawer>
    <p className="text-[13px] text-neutral-500"><a className="underline underline-offset-4" href="?classic=1#/stop1" data-testid="classic-link">See the classic Stop 1</a> (sats and checks on the page), for comparison.</p></>;
}
function ProofReal({ r, seller, co, what = 'an offer naming this recording' }: { r: NonNullable<RealOut>; seller: string; co: string[]; what?: string }) {
  const proof = useProof();
  if ('error' in r) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900" data-testid="real-card">The real test payment did not go through ({r.error}). Practice money was used instead.</div>;
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid="real-card"><div className="flex items-start gap-2 text-[17px] font-semibold text-emerald-700"><CheckCircle2 className="mt-0.5 shrink-0" size={20} />Real test payment: {n(r.aliceGot)} test sats reached {seller === 'your' ? 'your' : `${seller}'s`} test wallet ({usdFromSats(r.aliceGot)} at the demo rate)</div>
    {r.wanted && r.wanted > MAX_REAL_TEST_SATS && <p className="mt-1 text-[13px] text-amber-800" data-testid="real-capped">The real test payment was capped at {n(MAX_REAL_TEST_SATS)} test sats (the price is {n(r.wanted)}), because test wallets are small. The full check uses the full price.</p>}
    <p className="mt-1 text-[14px] text-neutral-600">Two test wallets were made on faucet.nwc.dev. The buyer paid a real Lightning invoice in {(r.ms / 1000).toFixed(1)} s, for {what}. Checked on the real payment:</p>
    <ul className="mt-2 space-y-1">{r.facts.filter(f => f.ok).map(f => <li key={f.label} className="flex items-start gap-2 text-[14px]"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f.label}</li>)}</ul>
    <p className="mt-3 text-[13px] text-neutral-600" data-testid="shared-node-note">Left out on purpose: that the receiving wallet is {seller === 'your' ? 'yours' : `${seller}'s own`}. Every test wallet shares one, so a test payment cannot show it. The full check covers it, and so does {proof ? <a className="underline" href={proof.txUrl} target="_blank" rel="noreferrer">this real licence on Bitcoin's test network</a> : "the real licence on Bitcoin's test network"}.{co.length ? ` The split to ${co.join(' and ')} runs in the full check.` : ''}</p>
    <details className="mt-2 text-[12px] text-neutral-500"><summary className="cursor-pointer">Payment details</summary><div className="mt-1 break-all font-mono">payment hash {r.paymentHash}<br />preimage {r.preimage}{r.offerSha256 && <><br />offer fingerprint {r.offerSha256}</>}</div></details></div>;
}
// ---------- Stop 2: a company's agent inside a budget, and a subscription ----------
const PEOPLE2 = ['harbour', 'alice', 'carol', 'dave', 'erin', 'frank'];
const dateGB = (unix: number) => new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export function Stop2() {
  const st = useStory(); const budget: number = st.r.s2budget ?? BUDGET_DEFAULT_CENTS; const clip = st.r.s2clip; const sub = st.r.s2sub; const ren = st.r.s2renew; const real = useRealMoney();
  const lab = story.world(); const left = lab.nwc[AGENT] ? budgetLeftCents(lab) : budget; const shas = Object.fromEntries(CATALOGUE.map(c => [c.cast, music.tracks.find(x => x.cast === c.cast)?.sha256 ?? sha256hex(c.title)]));
  const x = catalogueHash(['dave', 'erin', 'frank'].map(k => shas[k]));
  const setB = (v: number) => { story.set('s2budget', v); if (lab.nwc[AGENT]) { setBudget(lab, v); story.set('tick', Date.now()); } };
  const runVideos = async () => { const out = await story.run('s2clip', l => videoLicences(l, shas, budget, VIDEOS, k => { story.progress = k; story.set('tick', k); }));
    if (out) story.move('clipai', Object.fromEntries(Object.entries(out.credits).map(([k, s]) => [k, (s as number) * 5]))); };
  const runSub = async () => { await story.run('s2sub', async l => {
      const useReal = real.known || real.decided ? real.on : await faucetReachable(3000);
      if (useReal) { try { story.r.s2subReal = { ...(await realLicence({ priceSat: toSats(PLAN.priceCents), buyer: 'bobagent', song: { title: `${PLAN.title} (1 month)`, sha256: x, termsText: 'Catalogue licence (DRAFT subscription): use any recording in the Harbour Music catalogue in online creator videos, worldwide, for one month from payment.', use: USES.catalogue }, budget: { maxPerPaymentSat: toSats(MAX_PER_PAYMENT_CENTS), dailyCapSat: toSats(budget) } })), wanted: toSats(PLAN.priceCents) }; } catch (e: any) { story.r.s2subReal = { error: String(e?.message ?? e) }; } }
      return subscribe(l, x, budget); });
    const o = story.r.s2sub; if (o?.ok) { story.move('clipai', Object.fromEntries(o.split.map((s: any) => [s.id, s.sats * 5]))); testkit.stopDone('stop2'); story.finish('stop2'); } };
  const runRenew = async () => { await story.run('s2renew', l => renew(l, x, budget)); const o = story.r.s2renew; if (o?.ok) story.move('clipai', Object.fromEntries(o.split.map((s: any) => [s.id, s.sats * 5]))); };
  const agentChip = <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 sm:px-2.5 sm:py-1" data-wallet="clipagent"><span className={cx('h-2 w-2 rounded-full', COLOUR.clipagent)} /><span className="text-neutral-600">ClipAI's agent</span><Ticker cents={left} testid="wallet-clipagent" /><span className="text-neutral-500">left<span className="hidden sm:inline"> of {usd(budget, { whole: true })}</span></span></span>;
  return <PathStop id="stop2" title="Companies buy at scale" why="ClipAI's agent licenses songs for its users' videos. A person at ClipAI sets the monthly budget, and the agent never spends past it." strip={<WalletStrip ids={PEOPLE2} extra={agentChip} />}>
    <label className="block rounded-2xl border border-neutral-200 bg-white p-4" data-testid="budget-slider"><div className="flex items-baseline justify-between text-[15px]"><span className="font-semibold">ClipAI's monthly budget</span><span className="text-[20px] font-bold tabular-nums" data-testid="budget-value">{usd(budget, { whole: true })}</span></div>
      <input type="range" min={BUDGET_MIN_CENTS} max={BUDGET_MAX_CENTS} step={BUDGET_STEP_CENTS} value={budget} disabled={!!st.busy} onChange={e => setB(Number(e.target.value))} className="mt-2 w-full accent-cyan-500" aria-label="ClipAI's monthly budget" />
      <div className="text-[12px] text-neutral-500">A person sets this. Most the agent may pay at once: {usd(MAX_PER_PAYMENT_CENTS, { whole: true })}.</div></label>
    {/* Beat 1: licences for user videos */}
    {!clip ? (st.busy === 's2clip' ? <Counter k={story.progress} /> : <div className="flex justify-center"><BigButton onClick={runVideos} data-testid="clip-go">License songs for {n(VIDEOS)} user videos</BigButton></div>)
      : <Good testid="clip-done" line={clip.refused ? `${n(clip.bought)} videos licensed, then the agent stopped: budget reached` : `${n(clip.bought)} videos licensed for ${usd(clip.spentSats * 5, { whole: true })}`}>
        <p className="mt-1 text-[15px] text-neutral-600">{clip.refused ? `${n(clip.refused)} videos wait until a person raises the budget. It spent ${usd(clip.spentSats * 5, { whole: true })} of ${usd(budget, { whole: true })}.` : `Inside the ${usd(budget, { whole: true })} budget. Every artist was paid their share at once.`}</p></Good>}
    {/* Beat 2: the subscription */}
    {clip && <section className="rounded-3xl border border-neutral-200 bg-white p-5" data-testid="sub-card"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[20px] font-semibold">{PLAN.title}</h2><span className="text-[22px] font-bold tabular-nums">{usd(PLAN.priceCents)} <span className="text-[14px] font-normal text-neutral-500">a month</span></span></div>
      <p className="mt-1 text-[15px] text-neutral-600">Every song by Dave, Erin and Frank, for all of ClipAI's videos. Harbour keeps 30% and pays its artists the rest.</p>
      {!sub ? <div className="mt-4">{st.busy === 's2sub' ? <Busy label="ClipAI's agent is subscribing…" /> : <BigButton onClick={runSub} data-testid="sub-go">Let ClipAI's agent subscribe</BigButton>}</div>
        : !sub.ok ? <div className="mt-4" data-testid="sub-refused"><Bad line="Refused: not enough budget left this month" /><p className="mt-2 text-[14px] text-neutral-600">{usd(sub.budgetLeftCents)} left. Raise the budget above, then try again. <button className="underline" onClick={() => { story.r.s2sub = undefined; story.set('tick', Date.now()); }}>Try again</button></p></div>
        : <div className="mt-4 space-y-3" data-testid="sub-done"><div className="flex items-center gap-2 text-[20px] font-bold text-emerald-700"><CheckCircle2 size={22} />Subscribed</div>
          <p className="text-[14px] leading-6 text-neutral-600" data-testid="sub-log">ClipAI's agent paid Harbour Music {usd(PLAN.priceCents)} · Harbour passed on {sub.split.filter((s: any) => s.id !== 'harbour').map((s: any) => `${s.who} ${usd(s.sats * 5)}`).join(', ')} · Catalogue licence until {dateGB(sub.until)}</p>
          {!ren ? (st.busy === 's2renew' ? <Busy label="A month passes…" /> : <BigButton variant="quiet" onClick={runRenew} data-testid="renew-go">Skip to next month</BigButton>)
            : ren.ok ? <p className="text-[15px] font-semibold text-emerald-700" data-testid="renew-done">Renewed by the agent on {dateGB(ren.paidAt)}, a day before month 1 ended, inside the new month's budget. Month 2 runs {dateGB(ren.from)} to {dateGB(ren.until)}.</p>
            : <p className="text-[15px] text-amber-700" data-testid="renew-refused">Not renewed: {usd(ren.budgetLeftCents)} left in the budget. The licence ends on {dateGB(sub.until)}.</p>}</div>}
    </section>}
    {sub?.ok && <div className="fade-in space-y-4 pt-2 text-center"><p className="mx-auto max-w-[560px] text-[19px] leading-8 text-neutral-700" data-testid="sleep-line">Your agent can do this thousands of times while you sleep. You set the price and the rules.</p><div className="flex justify-center"><Next from="stop2" /></div></div>}
    <ProofPanel><Stop2Proof clip={clip} sub={sub} ren={ren} rr={st.r.s2subReal} budget={budget} /></ProofPanel>
  </PathStop>;
}
function Stop2Proof({ clip, sub, ren, rr, budget }: { clip: any; sub: any; ren: any; rr: RealOut; budget: number }) {
  const st = useStory(); const poison = st.r.s2poison;
  return <>
    <p className="text-[14px] text-neutral-600">The budget is a wallet connection (NWC) that only allows paying: at most {n(toSats(MAX_PER_PAYMENT_CENTS))} sats a payment and {n(toSats(budget))} sats a month ({usd(budget, { whole: true })} at the demo rate, {DEMO_RATE_LABEL}). Before each payment the agent checks the bill equals its own signed request and comes from the artist's bound node. Money here is practice money; signatures, bills and checks are real.</p>
    {clip && <p className="text-[14px] text-neutral-600" data-testid="clip-proof">{n(clip.bought)} Creator licences, one per video, across the five songs. All went into one Bitcoin timestamp (OpenTimestamps), and {clip.sampleOk} of {clip.sample} picked at random were re-checked from scratch: all real.{clip.refused ? ` The wallet refused the next payment: ${clip.reason}.` : ''}</p>}
    <p className="rounded-lg border border-dashed border-amber-300 px-3 py-2 text-[13px] text-amber-800" data-testid="draft-sub">Draft: the protocol has no subscription event yet. Here a subscription is a one-month catalogue licence (use <code>catalogue-video · worldwide · 1m</code>, priced {n(toSats(PLAN.priceCents))} sats) whose fingerprint is a hash of the catalogue's file hashes; the agent's renewal rule buys the next month before the old one ends, inside the budget.</p>
    {rr && <ProofReal r={rr} seller="Harbour Music" co={['Dave', 'Erin', 'Frank']} what="a one-month catalogue offer" />}
    {sub?.ok && <VerdictCard compact v={sub.verdict} line={`Month 1: all ${sub.verdict.passed} checks passed`} title="The catalogue licence, checked in your browser" testid="sub-verdict" />}
    {ren?.ok && <VerdictCard compact v={ren.verdict} line={`Month 2: all ${ren.verdict.passed} checks passed`} title="The renewal" testid="renew-verdict" />}
    {st.persona === 'builder' && <Cheat title="hide an order"><p className="text-[15px] text-neutral-600">Mallory hides an order in her offer and bills 500,000 sats.</p>
      {!poison ? <div className="mt-3"><BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('s2poison', S.poisonedPrompt)}>Send the poisoned offer</BigButton></div>
        : <div className="mt-3" data-testid="cheat-poison"><Good line={poison.refused ? `Blocked: order ignored. Paid: ${poison.paid} sats` : 'It got through'} /></div>}</Cheat>}
  </>;
}
// ---------- Stop 3: anyone can check ----------
export function Stop3() {
  const st = useStory(); const v = st.r.s3button as Verdict | undefined; const last = st.r.lastLicence; const c: CatalogueTrack = last?.c ?? CATALOGUE[0]; const seller = NAME(c.seller);
  const check = async () => { const out = await story.run('s3button', async lab => last?.bundle ? lab.verify(last.bundle) : S.licenseButton(lab)); if (out?.result.ok) { testkit.licence(); testkit.stopDone('stop3'); story.finish('stop3'); } };
  return <PathStop id="stop3" title="Anyone can check" why={`A video site or a fan can check Bob's licence for "${c.title}" alone, in seconds, without asking ${seller} or any company.`} strip={<WalletStrip ids={['bobagent', ...c.shares.map(s => s.who)]} />}>
    {!v ? <div className="flex justify-center">{st.busy === 's3button' ? <Busy label="Checking…" /> : <BigButton onClick={check} data-testid="check-go">Check Bob's licence</BigButton>}</div>
      : <VerdictCard v={v}>{v.result.ok && <p className="mt-1 text-[15px] text-neutral-600">{seller}{c.shares.length > 1 ? ' and the co-owners' : ''} agreed, Bob's agent paid, and it has not been withdrawn. Checked here, alone, in {Math.max(1, Math.round(v.ms))} ms.</p>}</VerdictCard>}
    {v && <div className="flex justify-center"><Next from="stop3" /></div>}
    {v && <ProofPanel><Proven /><Stop3Builders /></ProofPanel>}
  </PathStop>;
}
function Stop3Builders() {
  const st = useStory(); const reg = st.r.s3reg; const fake = st.r.s3fake as Verdict | undefined;
  if (st.persona !== 'builder') return <p className="text-[14px] text-neutral-600">Building on this? <button className="underline" onClick={() => go('verify')}>Check your own licence file</button> · <button className="underline" onClick={() => go('redteam')}>Try to break it</button></p>;
  return <div className="space-y-4">
    <section className="rounded-2xl border border-neutral-200 p-4" data-testid="regulator"><h3 className="text-[16px] font-semibold">A regulator asks ModelCo: "Prove you had permission to train on this song."</h3>
      {!reg ? <div className="mt-3"><BigButton variant="quiet" disabled={!!st.busy} onClick={() => story.run('s3reg', S.regulatorCheck)}>Check ModelCo's proof</BigButton></div>
        : <><ul className="mt-3 space-y-2">{reg.checks.map((x: any) => <Row key={x.text} ok={x.ok}>{x.text}</Row>)}</ul></>}</section>
    <Cheat title='sell a copy as "Alice Official"'>{!fake ? <BigButton variant="cheat" disabled={!!st.busy} onClick={() => story.run('s3fake', S.fakeCaught)}>Check the copycat's licence</BigButton>
      : <Bad testid="cheat-fake" line={fake.result.ok ? 'It got through' : `Fake ✗ ${plainReason(fake)}`} />}</Cheat>
    <CodeDrawer><Code>{`import { verifyLicence } from './src/lib/mll/verify'
const result = await verifyLicence(bundle, chain, { ownership: { trust: [distributorKey], vouches } })
if (result.ok && result.ownership?.status === 'verified') showBadge('Licensed ✓')`}</Code></CodeDrawer></div>;
}
// ---------- The end: three next steps ----------
export function NextSteps() {
  const [open, setOpen] = useState<'' | 'song' | 'agent'>('');
  const card = 'flex min-h-[96px] flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-neutral-900';
  return <div className="fade-in space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 md:p-6" data-testid="finale"><div className="text-center"><div className="text-[22px] font-semibold">That is the whole idea.</div><div className="mt-1 text-[16px] text-neutral-600">{SHORT}</div></div>
    <div className="grid gap-3 sm:grid-cols-3" data-testid="next-steps">
      <button className={cx(card, open === 'song' ? 'border-neutral-900' : 'border-neutral-200')} onClick={() => setOpen(open === 'song' ? '' : 'song')} data-testid="step-song"><Upload size={18} /><span className="text-[17px] font-semibold">Put up your song</span><span className="text-[13px] text-neutral-500">Set a price and see an agent buy it</span></button>
      <button className={cx(card, open === 'agent' ? 'border-neutral-900' : 'border-neutral-200')} onClick={() => setOpen(open === 'agent' ? '' : 'agent')} data-testid="step-agent"><Bot size={18} /><span className="text-[17px] font-semibold">Connect your agent</span><span className="text-[13px] text-neutral-500">Ten lines to buy a licence</span></button>
      <a className={cx(card, 'border-neutral-200')} href="https://github.com/welliv/licence-lab" target="_blank" rel="noreferrer" data-testid="step-github"><Github size={18} /><span className="text-[17px] font-semibold">Code on GitHub</span><span className="text-[13px] text-neutral-500">Open source: read it, run it, build on it</span></a>
    </div>
    {open === 'song' && <PutUpSong />}{open === 'agent' && <ConnectAgent />}
    <p className="text-center text-[13px] text-neutral-500"><button className="underline underline-offset-4" onClick={() => go('rights')} data-testid="next">Extra: when rights change hands</button> · <button className="underline underline-offset-4" onClick={() => go('hood')}>Under the hood</button></p></div>;
}
function ConnectAgent() {
  return <section className="fade-in space-y-3 rounded-2xl border border-neutral-200 p-4" data-testid="connect-agent"><p className="text-[15px] leading-7 text-neutral-700">Your agent asks for a licence, checks the bill matches what it asked for, pays from a wallet with a spending limit you set, and keeps the licence as proof. Anyone can check it later without asking you.</p>
    <Code>{`import { makePrivateRequest, requestBytes } from './src/lib/mll/events'
import { clientCheck, httpBinding, requestHash } from './src/lib/mll/x402'
import { verifyLicence } from './src/lib/mll/verify'
const { request } = makePrivateRequest(agentKey, { offer, binding, use, network, notBefore })
const res = await fetch(payLink, { method: 'POST', body: JSON.stringify(request) }) // answers 402 with a bill
const bill = JSON.parse(atob(res.headers.get('payment-required')))
clientCheck(bill, requestHash(httpBinding('POST', payLink, requestBytes(request))), binding.node, now, 60, amount)
const { preimage } = await nwc.payInvoice(bill.extra.invoice) // the wallet enforces your budget
const ok = (await verifyLicence({ offer, binding, consents, request, invoice: bill.extra.invoice, preimage }, chain)).ok
if (ok) save({ offer, request, preimage })                    // your licence: keep it, show it, prove it`}</Code>
    <p className="text-[13px] text-neutral-500">The full buyer agent, with budgets and retries, is in the repo. Its prompt is under the hood, in scenario 4.</p></section>;
}
function PutUpSong() {
  const st = useStory(); const real = useRealMoney(); const [file, setFile] = useState<{ name: string; sha256: string; size: number } | null>(null); const [err, setErr] = useState('');
  const [type, setType] = useState<LicenceType>('creator'); const you: CatalogueTrack = { cast: 'you', title: file?.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'Your song', seller: 'you', priceCents: 500, shares: [{ who: 'you', role: 'artist', bps: 10_000 }], blurb: '' };
  const [prices, setPrices] = useState<Record<LicenceType, number>>({ personal: 100, creator: 500, business: 5000 }); const cents = prices[type]; const out = st.r.own2; const rr: RealOut = st.r.own2real;
  const pick = async (f?: File) => { if (!f) return; setErr(''); if (!/^audio\//.test(f.type) && !/\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)) { setErr('Choose an audio file.'); return; } if (f.size > 200 * 1024 * 1024) { setErr('That file is over 200 MB.'); return; }
    setFile({ name: f.name, size: f.size, sha256: sha256hex(new Uint8Array(await f.arrayBuffer())) }); story.r.own2 = undefined; story.r.own2real = undefined; story.set('tick', Date.now()); };
  const sell = () => file && story.run('own2', async lab => {
    const useReal = real.known || real.decided ? real.on : await faucetReachable(3000);
    if (useReal) { try { story.r.own2real = { ...(await realLicence({ priceSat: Math.min(toSats(cents), MAX_REAL_TEST_SATS), song: { title: you.title, sha256: file.sha256, termsText: termsFor(you, 'you', type), use: USES[licence(type).use] } })), wanted: toSats(cents) }; } catch (e: any) { story.r.own2real = { error: String(e?.message ?? e) }; } }
    const r = await ownSongSale(lab, { title: you.title, sha256: file.sha256, type, priceCents: cents }); if (r.verdict.result.ok) story.move('bobagent', { you: cents }); return r; });
  return <section className="fade-in space-y-4 rounded-2xl border border-neutral-200 p-4" data-testid="own-song" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
    <div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"><span className={cx('h-2 w-2 rounded-full', COLOUR.bobagent)} />Bob's agent <Ticker cents={st.cash.bobagent ?? 0} /></span><span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"><span className={cx('h-2 w-2 rounded-full', COLOUR.you)} />You <Ticker cents={st.cash.you ?? 0} testid="wallet-you" /></span></div>
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-[15px] hover:bg-neutral-50"><Upload size={15} />{file ? 'Choose another song' : 'Choose a song'}<input type="file" accept="audio/*" className="hidden" data-testid="own-file" onChange={e => pick(e.target.files?.[0])} /></label>
    <p className="text-[13px] text-neutral-500">It stays on your device. Only a fingerprint of the file goes into your offer.</p>
    {err && <p className="text-[13px] text-red-700">{err}</p>}
    {file && <><div className="text-[17px] font-semibold" data-testid="own-title">"{you.title}" <span className="font-normal text-neutral-500">· you</span></div>
      <Stepper cents={cents} onChange={v => setPrices({ ...prices, [type]: v })} who="You" disabled={!!st.busy} />
      <LicenceSwitch value={type} prices={prices} onChange={setType} disabled={!!st.busy} />
      {!out ? (st.busy === 'own2' ? <Busy label="Bob's agent is buying…" /> : <BigButton onClick={sell} data-testid="own-sell">Put it on sale. Let Bob's agent buy it</BigButton>)
        : <div className="space-y-3"><Good testid="own-verdict" line={out.verdict.result.ok ? `Bob's agent paid you ${usd(cents)}` : 'Something went wrong'}><p className="mt-1 text-[14px] text-neutral-600">{licence(type).label} licence: {licence(type).allows.toLowerCase()}.</p>
          <p className="mt-1 text-[14px] text-neutral-600" data-testid="own-owner">Who owns it: not confirmed yet. A distributor you work with would confirm it, so buyers can trust it.</p></Good>
          <ProofPanel title="See the proof" testid="own-proof"><p className="rounded-lg bg-neutral-100 px-3 py-2 text-[14px] text-neutral-700">{usd(cents)} ≈ {n(toSats(cents))} test sats (test money, demo rate: {DEMO_RATE_LABEL})</p>
            {rr && <ProofReal r={rr} seller="your" co={[]} what="an offer naming your file" />}<VerdictCard compact v={out.verdict} title={`Your signed offer ${short(out.offer.id)}, fingerprint ${short(file.sha256)}`} testid="own-checks" /></ProofPanel></div>}</>}
  </section>;
}
export { ArrowRight };
