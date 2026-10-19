// Extra: live price. One idea per block, in the Alby sandbox style: today's rate (with its source and time), a two-way
// converter, then Bob's agent buying at Alice's dollar price, converted to sats and checked against the band she signed.
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, RefreshCw, WifiOff, Clock } from 'lucide-react';
import { cx } from '../bits';
import { Stop, BigButton, Busy, Good, Bad, VerdictCard, CodeDrawer } from './Story';
import { story } from './state';
import { RateBook, CURRENCIES, RATE_SOURCE, MAX_AGE_MS, FRESH_MS, satsPerUnit, satsToFiat, fiatToSats, formatFiat, formatSats, utcTime, ageText, usable, checkQuote, type Currency, type RateState, type Fetcher } from '../../live/rates';
import { BAND, LIST_USD, quotedSale, type QuotedSale } from '../../engine/livePrice';

// The rate service can be switched off from the page (and with ?rates=fail) to show what happens when it fails.
const ctl = { down: /[?&]rates=fail\b/.test(location.search + location.hash), skew: 0 };
const live: Fetcher = u => fetch(u, { cache: 'no-store' });
const book = new RateBook(u => ctl.down ? Promise.reject(new Error('the rate service did not answer')) : live(u), () => Date.now() + ctl.skew);
const now = () => Date.now() + ctl.skew;

function useRate(c: Currency, tick: number) {
  const [s, setS] = useState<RateState | null>(null); const [busy, setBusy] = useState(false);
  const load = async (force = false) => { setBusy(true); try { setS(await book.get(c, { force })); } finally { setBusy(false); } };
  useEffect(() => { setS(null); load(); const t = setInterval(() => load(), FRESH_MS); return () => clearInterval(t); }, [c]);
  useEffect(() => { if (tick) load(true); }, [tick]);
  return { s, busy, refresh: () => load(true) };
}
const name = (c: string) => CURRENCIES.find(x => x.code === c)?.name ?? c;
const perUnit = (x: number) => x >= 100 ? Math.round(x).toLocaleString('en-GB') : x.toLocaleString('en-GB', { maximumFractionDigits: 1 });

function Status({ s }: { s: RateState }) {
  const age = s.rate ? now() - s.rate.at : 0; const st = s.rate && s.status === 'live' && !usable(s.rate, now()) ? 'too-old' : s.status;
  const map = { live: ['Live', 'bg-emerald-500/15 text-emerald-700'], 'last-known': ['Last known rate', 'bg-amber-500/15 text-amber-700'], 'too-old': ['Too old to price a sale', 'bg-red-500/15 text-red-700'], none: ['No rate', 'bg-red-500/15 text-red-700'] } as const;
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-neutral-500">
    <span className={cx('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', map[st][1])} data-testid="rate-status">{map[st][0]}</span>
    {s.rate && <span data-testid="rate-source">{RATE_SOURCE.name} · {utcTime(s.rate.at)} ({ageText(age)})</span>}</div>;
}

export function LivePrice() {
  const [cur, setCur] = useState<Currency>('USD'); const [tick, setTick] = useState(0); const [, force] = useState(0);
  const shown = useRate(cur, tick); const usd = useRate('USD', tick); const s = shown.s; const r = s?.rate ?? null;
  const [fiat, setFiat] = useState('20'); const [sats, setSats] = useState(''); const [edited, setEdited] = useState<'fiat' | 'sats'>('fiat');
  useEffect(() => { if (!r) return; if (edited === 'fiat') { const f = Number(fiat); setSats(fiat !== '' && f >= 0 ? String(fiatToSats(f, r)) : ''); } else { const n = Number(sats); setFiat(sats !== '' && Number.isInteger(n) ? String(satsToFiat(n, r)) : ''); } }, [r?.btc, r?.currency]);
  const onFiat = (v: string) => { const c = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setFiat(c); setEdited('fiat'); if (r) setSats(c === '' ? '' : String(fiatToSats(Number(c), r))); };
  const onSats = (v: string) => { const c = v.replace(/[^0-9]/g, ''); setSats(c); setEdited('sats'); if (r) setFiat(c === '' ? '' : String(satsToFiat(Number(c), r))); };

  const [price, setPrice] = useState(String(LIST_USD)); const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ kind: 'blocked'; text: string } | { kind: 'sale'; r: QuotedSale; usdRate: number; at: number; price: number } | null>(null);
  const ur = usd.s?.rate ?? null;
  const band$ = useMemo(() => ur ? [satsToFiat(BAND.min, ur), satsToFiat(BAND.max, ur)] : null, [ur?.btc]);
  const buy = async () => {
    setBusy(true); setOut(null);
    try {
      const st = await book.get('USD'); const p = Number(price); const pre = checkQuote(p, st.rate, BAND, now());
      if (!pre.ok && (pre.code === 'no_rate' || pre.code === 'rate_too_old')) { setOut({ kind: 'blocked', text: pre.text }); return; }
      const q = fiatToSats(p, st.rate!); const note = `≈ ${formatFiat(p, 'USD')} at 1 BTC = ${formatFiat(st.rate!.btc, 'USD')} (${RATE_SOURCE.name}, ${utcTime(st.rate!.at)})`;
      const res = await quotedSale(story.world('price'), q, note); setOut({ kind: 'sale', r: res, usdRate: st.rate!.btc, at: st.rate!.at, price: p });
    } finally { setBusy(false); }
  };
  const tryDown = () => { ctl.down = !ctl.down; setTick(t => t + 1); };
  const tryOld = () => { ctl.skew += MAX_AGE_MS + 60_000; ctl.down = true; setTick(t => t + 1); force(x => x + 1); };
  const reset = () => { ctl.down = false; ctl.skew = 0; setTick(t => t + 1); setOut(null); };
  const input = 'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-[20px] tabular-nums outline-none focus:border-neutral-500';

  return <Stop id="price" title="Priced in dollars, paid in sats" why="Alice sets her price in dollars. Bitcoin's price moves, so her agent turns it into sats at today's market rate, and only inside the band she signed.">
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5" data-testid="rate-card">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="whitespace-nowrap text-[20px] font-semibold">Today's rate</h2>
        <div className="flex items-center gap-2"><select aria-label="Currency" data-testid="currency" value={cur} onChange={e => setCur(e.target.value as Currency)} className="max-w-[170px] rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[14px] sm:max-w-none">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select>
          <button onClick={shown.refresh} aria-label="Refresh the rate" data-testid="refresh" className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-900"><RefreshCw size={15} className={cx(shown.busy && 'animate-spin')} /></button></div></div>
      {!s ? <p className="text-[15px] text-neutral-500">Fetching the rate…</p> : <>
        {r ? <><div className="text-[22px] font-bold tabular-nums sm:text-[28px]" data-testid="rate-line">1 {CURRENCIES.find(x => x.code === cur)!.unit} = {perUnit(satsPerUnit(r))} sats</div>
          <div className="text-[14px] text-neutral-500" data-testid="btc-line">1 BTC = {formatFiat(r.btc, cur)}</div></> : <div className="text-[18px] font-semibold text-red-700" data-testid="rate-line">No rate yet</div>}
        <Status s={s} />
        {s.status !== 'live' && <p className="flex items-start gap-2 text-[13px] text-neutral-600" data-testid="rate-error"><WifiOff size={14} className="mt-0.5 shrink-0" />{s.status === 'none' ? `The rate service did not answer (${s.error}). Prices cannot be converted until it does.` : `The rate service did not answer. Showing the last rate, from ${utcTime(s.rate!.at)}.${s.status === 'too-old' ? ` It is more than ${MAX_AGE_MS / 60_000} minutes old, so no one can be billed with it.` : ''}`}</p>}
      </>}
    </section>

    <section className="space-y-2" data-testid="converter"><h2 className="text-[20px] font-semibold">Convert</h2>
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <label className="block"><span className="mb-1 block text-[13px] text-neutral-500">{name(cur)} ({cur})</span><input aria-label={`Amount in ${cur}`} data-testid="fiat-input" inputMode="decimal" value={fiat} onChange={e => onFiat(e.target.value)} disabled={!r} className={input} /></label>
        <ArrowLeftRight size={18} className="mx-auto mt-5 hidden text-neutral-400 sm:block" />
        <label className="block"><span className="mb-1 block text-[13px] text-neutral-500">Sats (whole)</span><input aria-label="Amount in sats" data-testid="sats-input" inputMode="numeric" value={sats} onChange={e => onSats(e.target.value)} disabled={!r} className={input} /></label>
      </div>
      <p className="text-[13px] text-neutral-500">Edit either side. Sats are always whole; a price is rounded up, so the seller never gets less.</p>
    </section>

    <section className="space-y-3"><h2 className="text-[20px] font-semibold">Bob's agent buys at Alice's price</h2>
      <p className="text-[16px] leading-7 text-neutral-600" data-testid="band-line">Alice signed one offer for a Creator licence: any price from <b>{formatSats(BAND.min)}</b> to <b>{formatSats(BAND.max)}</b>{band$ ? <> (about {formatFiat(band$[0], 'USD')} to {formatFiat(band$[1], 'USD')} today)</> : null}. Her agent Echo quotes each sale in sats at the live rate.</p>
      <label className="flex flex-wrap items-center gap-3 text-[15px] text-neutral-600">Alice's price in dollars<input aria-label="Alice's price in dollars" data-testid="price-input" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} className="w-28 rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-[17px]" />
        {ur && Number(price) > 0 && <span className="text-[14px] text-neutral-500" data-testid="price-sats">≈ {formatSats(fiatToSats(Number(price), ur))}{cur !== 'USD' && r ? ` ≈ ${formatFiat(satsToFiat(fiatToSats(Number(price), ur), r), cur)}` : ''}</span>}
        <span className="text-[13px] text-neutral-400">Try $40 or $10.</span></label>
      {busy ? <Busy label="Quoting and buying…" /> : <BigButton onClick={buy} disabled={!(Number(price) > 0)} data-testid="buy-quoted">Get a quote and buy</BigButton>}
      {out?.kind === 'blocked' && <Bad testid="quote-blocked" line="No quote, so no sale"><p className="mt-1 text-[14px] text-neutral-600">{out.text} Echo will not bill Bob with a guessed rate.</p></Bad>}
      {out?.kind === 'sale' && (out.r.ok
        ? <VerdictCard compact v={out.r.verdict} testid="quote-sold" title="Bob's licence, bought at the quoted price" line={`Licensed for ${formatSats(out.r.sats)} ≈ ${formatFiat(out.price, 'USD')}`}><p className="mt-1 text-[14px] text-neutral-600">Echo signed the quote at 1 BTC = {formatFiat(out.usdRate, 'USD')} ({RATE_SOURCE.name}, {utcTime(out.at)}). The quote lasts 6 blocks; Bob's invoice must match it exactly.</p></VerdictCard>
        : <Bad testid="quote-refused" line="Alice's node refused the quote"><p className="mt-1 text-[14px] text-neutral-600">{formatFiat(out.price, 'USD')} is {formatSats(out.r.sats)} at today's rate, {out.r.sats > BAND.max ? 'above' : 'below'} the {formatSats(BAND.min)} to {formatSats(BAND.max)} band Alice signed. Even a signed quote cannot sell outside it.</p><p className="mt-1 font-mono text-[12px] text-neutral-500">{out.r.code}: {out.r.reason}</p></Bad>)}
    </section>

    <section className="rounded-2xl border border-amber-200/70 p-5" data-testid="try-fail"><div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-amber-700"><Clock size={16} />Try it: the rate service fails</div>
      <p className="mb-3 text-[14px] text-neutral-600">If the service stops answering, the page keeps the last rate with its time. After {MAX_AGE_MS / 60_000} minutes that rate is too old to bill anyone.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={tryDown} data-testid="try-down" className="rounded-full border border-amber-300 px-4 py-2 text-[14px] text-amber-700 hover:bg-amber-50">{ctl.down ? 'Bring the service back' : 'Switch the service off'}</button>
        <button onClick={tryOld} data-testid="try-old" className="rounded-full border border-amber-300 px-4 py-2 text-[14px] text-amber-700 hover:bg-amber-50">Jump {MAX_AGE_MS / 60_000 + 1} minutes ahead</button>
        {(ctl.down || ctl.skew > 0) && <button onClick={reset} data-testid="try-reset" className="rounded-full px-4 py-2 text-[14px] text-neutral-500 underline underline-offset-4">Back to normal</button>}</div>
    </section>

    <p className="rounded-xl bg-neutral-100 px-4 py-3 text-[14px] text-neutral-600">The rate is real. The money here is practice money, and the sale runs on a practice copy of Bitcoin in your browser.</p>
    <CodeDrawer><p>Rate: <code>GET {RATE_SOURCE.url}usd.json</code>, field <code>rate_float</code> (BTC in that currency), the same feed as Alby's <code>@getalby/lightning-tools</code> fiat helpers. Reused for 1 minute; if a request fails, the last rate stays on screen with its time; older than {MAX_AGE_MS / 60_000} minutes, no quote is signed.</p>
      <p>Alice's main key signs the offer once with <code>price</code> {BAND.min} and <code>price-max</code> {BAND.max} and names Echo's <b>pricing key</b>. Echo signs a <b>quote</b> (draft kind 3416) with the sats price, an expiry block and a note with the rate and its time. Bob's request names the quote, and the invoice must match it. Alice's node runs <code>checkDeal</code>: a quote outside the band fails with <code>quote_band</code>. The rate never enters the licence check; only the signed sats price does.</p></CodeDrawer>
    <div className="pt-2 text-center"><BigButton variant="quiet" onClick={() => history.back()}>Back</BigButton></div>
  </Stop>;
}
