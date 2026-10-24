// Browser check of the live-price extra, with screenshots. Usage: URL=http://localhost:4180/ node scripts/live-price-check.mjs
// Both rate sources are stubbed (Alby 1 BTC = $80,000; mempool.space $80,800, with its own time) unless REAL=1.
import { chromium } from 'playwright'; import { mkdirSync } from 'node:fs';
const base = process.env.URL ?? 'http://localhost:4180/'; const out = process.env.OUT ?? 'screenshots/live-price/'; mkdirSync(out, { recursive: true });
const REAL = !!process.env.REAL; const ALBY = { USD: 80000, EUR: 70000, GBP: 60000, JPY: 12000000, CHF: 72000, CAD: 110000, AUD: 120000 };
const MEMPOOL = Object.fromEntries(Object.entries(ALBY).map(([k, v]) => [k, v * 1.01]));
const AVG = (ALBY.USD + MEMPOOL.USD) / 2; const sats = usd => Math.ceil(usd * 1e8 / AVG - 1e-6);
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const H = { 'access-control-allow-origin': '*' };
async function page(w, h, o = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (!REAL) {
    await ctx.route('https://getalby.com/api/rates/**', r => { const c = r.request().url().match(/rates\/(\w+)\.json/)[1].toUpperCase(); r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ code: c, rate_float: ALBY[c] }) }); });
    await ctx.route('https://mempool.space/api/v1/prices', r => o.noMempool ? r.abort() : r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ time: Math.floor(Date.now() / 1000) - 20, ...MEMPOOL }) }));
  }
  return { p, errs };
}
const shot = async (p, n, full = true) => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}${n}.png`, fullPage: full }); };
const status = p => p.getByTestId('rate-status').innerText();
const waitStatus = (p, t) => p.waitForFunction(t => document.querySelector('[data-testid=rate-status]')?.textContent?.startsWith(t), t, { timeout: 15000 });
{ const { p, errs } = await page(1280, 900);
  await p.goto(base + '#/stop1'); await p.waitForTimeout(500); ok(await p.getByTestId('to-live-price').isVisible(), 'Stop 1 links to the live price');
  await p.getByTestId('to-live-price').click(); await waitStatus(p, 'Live');
  ok((await status(p)) === 'Live · 2 sources agree', 'both sources agree: Live'); const line = await p.getByTestId('rate-line').innerText();
  ok(REAL ? /= [\d,]+ sats/.test(line) : line === `1 US dollar = ${Math.round(1e8 / AVG).toLocaleString('en-GB')} sats`, `rate line (average): ${line}`);
  ok(/Rate source 1[\s\S]*fetched \d\d:\d\d UTC/.test(await p.getByTestId('source-alby').innerText()), 'source 1 row (Alby): neutral name, rate and fetch time');
  ok(/Rate source 2[\s\S]*as of \d\d:\d\d UTC/.test(await p.getByTestId('source-mempool').innerText()), 'source 2 row (mempool.space): neutral name, rate and its own time');
  ok(/% apart \(limit 2%\)/.test(await p.getByTestId('spread').innerText()), `spread shown: ${await p.getByTestId('spread').innerText()}`);
  if (!REAL) { ok(await p.getByTestId('sats-input').inputValue() === String(sats(20)), `$20 → ${sats(20)} sats`);
    await p.getByTestId('sats-input').fill('12345'); ok(await p.getByTestId('fiat-input').inputValue() === String(Math.round(12345 * AVG / 1e6) / 100), '12,345 sats → dollars');
    await p.getByTestId('fiat-input').fill('20'); }
  await shot(p, '01-two-sources-agree', false);
  await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-sold]', { timeout: 20000 });
  ok(REAL || (await p.getByTestId('quote-sold').innerText()).includes(`Licensed for ${sats(20).toLocaleString('en-GB')} sats`), 'agreed rate: sold inside the band');
  ok((await p.getByTestId('quote-sold').innerText()).includes('average of rate sources 1 and 2'), 'sale names both sources');
  await p.getByTestId('quote-sold').scrollIntoViewIfNeeded(); await shot(p, '02-sold-on-agreed-rate');
  await p.getByTestId('price-input').fill('40'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-refused]', { timeout: 20000 });
  ok((await p.getByTestId('quote-refused').innerText()).includes('quote_band'), '$40: refused by quote_band'); await p.getByTestId('price-input').fill('20');
  await p.getByTestId('try-disagree').click(); await waitStatus(p, 'Sources disagree'); ok(/[4-6]\.\d% apart/.test(await p.getByTestId('spread').innerText()) || REAL, 'disagree: about 5% apart');
  ok((await p.getByTestId('rate-line').innerText()).startsWith('Last agreed:'), 'disagree: headline marked as last agreed'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-blocked]'); ok((await p.getByTestId('quote-blocked').innerText()).includes('apart'), 'disagree: no quote');
  await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await shot(p, '03-sources-disagree', false);
  await p.getByTestId('try-disagree').click(); await waitStatus(p, 'Live');
  ok((await p.getByTestId('try-one').innerText()) === 'Switch rate source 2 off', 'try-it button uses the neutral name'); await p.getByTestId('try-one').click(); await waitStatus(p, 'Last agreed rate'); ok((await p.getByTestId('source-mempool').innerText()).includes('did not answer'), 'one source off: shown as not answering');
  await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-sold]', { timeout: 20000 }); ok((await p.getByTestId('quote-sold').innerText()).includes('last agreed rate'), 'one source off, agreed rate under 10 min: still sells, says so');
  { const vis = await p.evaluate(() => ['rate-card', 'try-fail', 'quote-sold', 'converter', 'band-line'].map(t => document.querySelector(`[data-testid=${t}]`)?.innerText ?? '').join('\n'));
    ok(/Rate source 2 did not answer/.test(vis) && !/alby|mempool/i.test(vis), 'visible text names no service: "Rate source 2 did not answer"'); }
  await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await shot(p, '04-one-source-last-agreed', false);
  await p.getByTestId('try-old').click(); await waitStatus(p, 'Too old'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-blocked]'); ok(true, 'both off and 11 min later: too old, no quote'); await shot(p, '05-too-old');
  await p.getByTestId('try-reset').click(); await waitStatus(p, 'Live'); ok(true, 'back to normal: Live');
  await p.getByTestId('currency').selectOption('JPY'); await p.waitForFunction(() => document.querySelector('[data-testid=btc-line]')?.textContent?.includes('¥')); ok((await p.getByTestId('rate-line').innerText()).startsWith('1 Japanese yen ='), 'yen rate line');
  await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await shot(p, '06-yen', false);
  ok(errs.length === 0, `no page errors ${errs.join('; ')}`); await p.close(); }
if (!REAL) { const { p, errs } = await page(390, 844, { noMempool: true }); await p.goto(base + '#/price'); await waitStatus(p, 'Only one source');
  ok(true, 'phone, source 2 (mempool.space) down from the start: Only one source'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-blocked]');
  ok((await p.getByTestId('quote-blocked').innerText()).includes('Only one source'), 'one source, no agreed rate: no quote'); await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await shot(p, '07-phone-one-source', false);
  await p.getByTestId('quote-blocked').scrollIntoViewIfNeeded(); await shot(p, '08-phone-one-source-blocked', false); ok(errs.length === 0, 'no page errors (phone)'); await p.close(); }
{ const { p, errs } = await page(390, 844); await p.goto(base + '?rates=fail#/price'); await waitStatus(p, 'No rate'); ok(true, 'phone, both down from the start: No rate');
  await p.goto(base + '#/price'); await p.reload(); await waitStatus(p, 'Live'); await shot(p, '09-phone-live', false);
  await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await p.evaluate(() => document.querySelector('[data-testid=sources]')?.scrollIntoView({ block: 'center' })); await shot(p, '10-phone-sources', false);
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'phone: no sideways scroll'); ok(errs.length === 0, 'no page errors (phone 2)'); }
await b.close(); console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
