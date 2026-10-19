// Extra: live price. One idea per block, in the Alby sandbox style: today's rate (with its source and time), a two-way
// converter, then Bob's agent buying at Alice's dollar price, converted to sats and checked against the band she signed.
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, RefreshCw, WifiOff, Clock } from 'lucide-react';
import { cx } from '../bits';
import { Stop, BigButton, Busy, Good, Bad, VerdictCard, CodeDrawer } from './Story';
import { story } from './state';
import { RateBook, CURRENCIES, MAX_AGE_MS, MAX_SPREAD, FRESH_MS, satsPerUnit, satsToFiat, fiatToSats, formatFiat, formatSats, utcTime, ageText, usable, checkQuote, type Currency, type RateState, type Fetcher, type SourceId } from '../../live/rates';
import { BAND, LIST_USD, quotedSale, type QuotedSale } from '../../engine/livePrice';

// Try-it controls: switch sources off, make them disagree, or jump ahead in time. ?rates=fail starts with both off.
const ctl = { off: new Set<SourceId>(/[?&]rates=fail\b/.test(location.search + location.hash) ? ['alby', 'mempool'] : []), drift: 0, skew: 0 };
const fetcher: Fetcher = async u => {
  const id: SourceId = u.includes('mempool.space') ? 'mempool' : 'alby';
  if (ctl.off.has(id)) throw new Error('did not answer');
  const r = await fetch(u, { cache: 'no-store' }); if (!r.ok || id !== 'mempool' || !ctl.drift) return r;
  const j = await r.json(); for (const c of CURRENCIES) if (typeof j[c.code] === 'number') j[c.code] *= 1 + ctl.drift; // "make them disagree": mempool.space reads 5% high
  return { ok: true, status: 200, json: async () => j };
};
const now = () => Date.now() + ctl.skew;
const book = new RateBook(fetcher, now);
const unit = (c: Currency) => CURRENCIES.find(x => x.code === c)!.unit;

function useRate(c: Currency, tick: number) {
  const [s, setS] = useState<RateState | null>(null); const [busy, setBusy] = useState(false);
  const load = async (force = false) => { setBusy(true); try { setS(await book.get(c, { force })); } finally { setBusy(false); } };
  useEffect(() => { setS(null); load(); const t = setInterval(() => load(), FRESH_MS); return () => clearInterval(t); }, [c]);
  useEffect(() => { if (tick) load(true); }, [tick]);
  return { s, busy, refresh: () => load(true) };
}
const name = (c: string) => CURRENCIES.find(x => x.code === c)?.name ?? c;
const perUnit = (x: number) => x >= 100 ? Math.round(x).toLocaleString('en-GB') : x.toLocaleString('en-GB', { maximumFractionDigits: 1 });
const CHIP: Record<string, [string, string]> = { live: ['Live · 2 sources agree', 'bg-emerald-500/15 text-emerald-700'], 'last-known': ['Last agreed rate', 'bg-amber-500/15 text-amber-700'],
  'too-old': ['Too old to price a sale', 'bg-red-500/15 text-red-700'], none: ['No rate', 'bg-red-500/15 text-red-700'], disagree: ['Sources disagree', 'bg-red-500/15 text-red-700'], 'one-source': ['Only one source', 'bg-red-500/15 text-red-700'] };
function note(s: RateState) {
  const down = s.sources.filter(x => !x.rate).map(x => x.name).join(' and ');
  switch (s.status) {
    case 'disagree': return `The two sources are ${((s.spread ?? 0) * 100).toFixed(1)}% apart, more than ${MAX_SPREAD * 100}%. No sale can be priced until they agree.`;
    case 'one-source': return `${down} did not answer. One source alone is not enough to price a sale.`;
    case 'last-known': return `${down} did not answer. Using the last agreed rate, from ${utcTime(s.rate!.at)}, until it is ${MAX_AGE_MS / 60_000} minutes old.`;
    case 'too-old': return `${down} did not answer. The last agreed rate is from ${utcTime(s.rate!.at)}, more than ${MAX_AGE_MS / 60_000} minutes old, so no one can be billed with it.`;
    case 'none': return 'Neither source answered. Prices cannot be converted until they do.';
    default: return '';
  }
}
function RateCard({ s, cur }: { s: RateState; cur: Currency }) {
  const r = s.rate; const st = r && s.status === 'live' && !usable(r, now()) ? 'too-old' : s.status;
  return <>
    {r ? <><div className={cx('text-[22px] font-bold tabular-nums sm:text-[28px]', (st === 'disagree' || st === 'too-old') && 'text-neutral-400')} data-testid="rate-line">{(st === 'disagree' || st === 'too-old') && <span className="mr-2 text-[15px] font-semibold">Last agreed:</span>}1 {unit(cur)} = {perUnit(satsPerUnit(r))} sats</div>
      <div className="text-[14px] text-neutral-500" data-testid="btc-line">1 BTC = {formatFiat(r.btc, cur)} · {s.status === 'live' ? 'average of both sources' : `agreed at ${utcTime(r.at)} (${ageText(now() - r.at)})`}</div></>
      : <div className="text-[20px] font-semibold text-red-700" data-testid="rate-line">No agreed rate</div>}
    <div className="flex flex-wrap items-center gap-2"><span className={cx('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', CHIP[st][1])} data-testid="rate-status">{CHIP[st][0]}</span>
      {s.spread !== undefined && <span className="text-[12px] text-neutral-500" data-testid="spread">{(s.spread * 100).toFixed(1)}% apart (limit {MAX_SPREAD * 100}%)</span>}</div>
    <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-[13px]" data-testid="sources">{s.sources.map(x => <li key={x.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2" data-testid={`source-${x.id}`}>
      <span className="font-semibold text-neutral-700">{x.name}</span>
      {x.rate ? <span className="tabular-nums text-neutral-600">1 BTC = {formatFiat(x.rate.btc, cur)} <span className="text-neutral-400">· {x.rate.ownTime ? 'as of' : 'fetched'} {utcTime(x.rate.at)}</span></span>
        : <span className="flex items-center gap-1 text-red-700" title={x.error}><WifiOff size={13} />{/too old/.test(x.error ?? '') ? 'its price is too old' : 'did not answer'}</span>}</li>)}</ul>
    {st !== 'live' && <p className="flex items-start gap-2 text-[13px] text-neutral-600" data-testid="rate-error"><Clock size={14} className="mt-0.5 shrink-0" />{note({ ...s, status: st })}</p>}
  </>;
}

export function LivePrice() {
  const [cur, setCur] = useState<Currency>('USD'); const [tick, setTick] = useState(0); const [, force] = useState(0);
  const shown = useRate(cur, tick); const usd = useRate('USD', tick); const s = shown.s; const r = s?.rate ?? null;
  const [fiat, setFiat] = useState('20'); const [sats, setSats] = useState(''); const [edited, setEdited] = useState<'fiat' | 'sats'>('fiat');
  useEffect(() => { if (!r) return; if (edited === 'fiat') { const f = Number(fiat); setSats(fiat !== '' && f >= 0 ? String(fiatToSats(f, r)) : ''); } else { const n = Number(sats); setFiat(sats !== '' && Number.isInteger(n) ? String(satsToFiat(n, r)) : ''); } }, [r?.btc, r?.currency]);
  const onFiat = (v: string) => { const c = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setFiat(c); setEdited('fiat'); if (r) setSats(c === '' ? '' : String(fiatToSats(Number(c), r))); };
  const onSats = (v: string) => { const c = v.replace(/[^0-9]/g, ''); setSats(c); setEdited('sats'); if (r) setFiat(c === '' ? '' : String(satsToFiat(Number(c), r))); };

  const [price, setPrice] = useState(String(LIST_USD)); const [busy, setBusy] = useState(false);
  const [outSrc, setOutSrc] = useState('');
  const [out, setOut] = useState<{ kind: 'blocked'; text: string } | { kind: 'sale'; r: QuotedSale; usdRate: number; at: number; price: number } | null>(null);
  const ur = usd.s?.rate ?? null;
  const band$ = useMemo(() => ur ? [satsToFiat(BAND.min, ur), satsToFiat(BAND.max, ur)] : null, [ur?.btc]);
  const buy = async () => {
    setBusy(true); setOut(null);
    try {
      const st = await book.get('USD'); const p = Number(price); const pre = checkQuote(p, st, BAND, now());
      if (!pre.ok && pre.code !== 'below_band' && pre.code !== 'above_band') { setOut({ kind: 'blocked', text: pre.text }); return; }
      const q = fiatToSats(p, st.rate!); const note = `≈ ${formatFiat(p, 'USD')} at 1 BTC = ${formatFiat(st.rate!.btc, 'USD')} (${st.status === 'live' ? 'average of Alby and mempool.space' : 'last agreed rate'}, ${utcTime(st.rate!.at)})`;
      setOutSrc(st.status === 'live' ? 'the average of Alby rates API and mempool.space' : 'the last agreed rate');
      const res = await quotedSale(story.world('price'), q, note); setOut({ kind: 'sale', r: res, usdRate: st.rate!.btc, at: st.rate!.at, price: p });
    } finally { setBusy(false); }
  };
  const flip = (f: () => void) => { f(); setTick(t => t + 1); force(x => x + 1); };
  const tryOne = () => flip(() => { ctl.off.has('mempool') ? ctl.off.delete('mempool') : ctl.off.add('mempool'); });
  const tryBoth = () => flip(() => { const both = ctl.off.size === 2; ctl.off = new Set(both ? [] : ['alby', 'mempool']); });
  const tryDisagree = () => flip(() => { ctl.drift = ctl.drift ? 0 : 0.05; });
  const tryOld = () => flip(() => { ctl.skew += MAX_AGE_MS + 60_000; ctl.off = new Set(['alby', 'mempool']); });
  const reset = () => { flip(() => { ctl.off = new Set(); ctl.drift = 0; ctl.skew = 0; }); setOut(null); };
  const input = 'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-[20px] tabular-nums outline-none focus:border-neutral-500';

  return <Stop id="price" title="Priced in dollars, paid in sats" why="Alice sets her price in dollars. Bitcoin's price moves, so her agent turns it into sats at today's market rate, and only inside the band she signed.">
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5" data-testid="rate-card">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="whitespace-nowrap text-[20px] font-semibold">Today's rate</h2>
        <div className="flex items-center gap-2"><select aria-label="Currency" data-testid="currency" value={cur} onChange={e => setCur(e.target.value as Currency)} className="max-w-[170px] rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[14px] sm:max-w-none">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select>
          <button onClick={shown.refresh} aria-label="Refresh the rate" data-testid="refresh" className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-900"><RefreshCw size={15} className={cx(shown.busy && 'animate-spin')} /></button></div></div>
      {!s ? <p className="text-[15px] text-neutral-500">Fetching the rate…</p> : <>
        <RateCard s={s} cur={cur} />
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
        ? <VerdictCard compact v={out.r.verdict} testid="quote-sold" title="Bob's licence, bought at the quoted price" line={`Licensed for ${formatSats(out.r.sats)} ≈ ${formatFiat(out.price, 'USD')}`}><p className="mt-1 text-[14px] text-neutral-600">Echo signed the quote at 1 BTC = {formatFiat(out.usdRate, 'USD')} ({outSrc}, {utcTime(out.at)}). The quote lasts 6 blocks; Bob's invoice must match it exactly.</p></VerdictCard>
        : <Bad testid="quote-refused" line="Alice's node refused the quote"><p className="mt-1 text-[14px] text-neutral-600">{formatFiat(out.price, 'USD')} is {formatSats(out.r.sats)} at today's rate, {out.r.sats > BAND.max ? 'above' : 'below'} the {formatSats(BAND.min)} to {formatSats(BAND.max)} band Alice signed. Even a signed quote cannot sell outside it.</p><p className="mt-1 font-mono text-[12px] text-neutral-500">{out.r.code}: {out.r.reason}</p></Bad>)}
    </section>

    <section className="rounded-2xl border border-amber-200/70 p-5" data-testid="try-fail"><div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-amber-700"><Clock size={16} />Try it: when the rate sources fail</div>
      <p className="mb-3 text-[14px] text-neutral-600">A sale is priced only when both sources agree within {MAX_SPREAD * 100}%. If one stops answering, the last agreed rate is used for up to {MAX_AGE_MS / 60_000} minutes, with its time shown.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={tryDisagree} data-testid="try-disagree" className="rounded-full border border-amber-300 px-4 py-2 text-[14px] text-amber-700 hover:bg-amber-50">{ctl.drift ? 'Make them agree again' : 'Make the sources disagree'}</button>
        <button onClick={tryOne} data-testid="try-one" className="rounded-full border border-amber-300 px-4 py-2 text-[14px] text-amber-700 hover:bg-amber-50">{ctl.off.has('mempool') ? 'Bring mempool.space back' : 'Switch mempool.space off'}</button>
        <button onClick={tryBoth} data-testid="try-down" className="rounded-full border border-amber-300 px-4 py-2 text-[14px] text-amber-700 hover:bg-amber-50">{ctl.off.size === 2 ? 'Bring both back' : 'Switch both off'}</button>
        <button onClick={tryOld} data-testid="try-old" className="rounded-full border border-amber-300 px-4 py-2 text-[14px] text-amber-700 hover:bg-amber-50">Jump {MAX_AGE_MS / 60_000 + 1} minutes ahead</button>
        {(ctl.off.size > 0 || ctl.drift > 0 || ctl.skew > 0) && <button onClick={reset} data-testid="try-reset" className="rounded-full px-4 py-2 text-[14px] text-neutral-500 underline underline-offset-4">Back to normal</button>}</div>
    </section>

    <p className="rounded-xl bg-neutral-100 px-4 py-3 text-[14px] text-neutral-600">The rate is real. The money here is practice money, and the sale runs on a practice copy of Bitcoin in your browser.</p>
    <CodeDrawer><p>Rates: <code>GET https://getalby.com/api/rates/usd.json</code> (field <code>rate_float</code>; no time of its own, so the fetch time is shown) and <code>GET https://mempool.space/api/v1/prices</code> (one field per currency, plus its own <code>time</code>). Both are keyless and allow browser calls. The agreed rate is their average, dated by the older time, and only if they are within {MAX_SPREAD * 100}% of each other. Rates are reused for 1 minute. If a source stops answering, the last agreed rate prices sales for up to {MAX_AGE_MS / 60_000} minutes; after that, or if the sources disagree, or only one has ever answered, no quote is signed.</p>
      <p>Alice's main key signs the offer once with <code>price</code> {BAND.min} and <code>price-max</code> {BAND.max} and names Echo's <b>pricing key</b>. Echo signs a <b>quote</b> (draft kind 3416) with the sats price, an expiry block and a note with the rate and its time. Bob's request names the quote, and the invoice must match it. Alice's node runs <code>checkDeal</code>: a quote outside the band fails with <code>quote_band</code>. The rate never enters the licence check; only the signed sats price does.</p></CodeDrawer>
    <div className="pt-2 text-center"><BigButton variant="quiet" onClick={() => history.back()}>Back</BigButton></div>
  </Stop>;
}
