// Browser check of the live-price extra, with screenshots. Usage: URL=http://localhost:4180/ node scripts/live-price-check.mjs
// The rates API is stubbed at a fixed rate (1 BTC = $80,000 / €70,000 / £60,000 / ¥12,000,000) unless REAL=1.
import { chromium } from 'playwright'; import { mkdirSync } from 'node:fs';
const base = process.env.URL ?? 'http://localhost:4180/'; const out = process.env.OUT ?? 'screenshots/live-price/'; mkdirSync(out, { recursive: true });
const RATES = { usd: 80000, eur: 70000, gbp: 60000, jpy: 12000000, chf: 72000, cad: 110000, aud: 120000 };
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
async function page(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (!process.env.REAL) await ctx.route('https://getalby.com/api/rates/**', r => { const c = r.request().url().match(/rates\/(\w+)\.json/)[1]; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ code: c.toUpperCase(), rate_float: RATES[c] }) }); });
  return { p, errs };
}
const shot = (p, n, full = true) => p.screenshot({ path: `${out}${n}.png`, fullPage: full });
{ const { p, errs } = await page(1280, 900);
  await p.goto(base + '#/stop1'); await p.waitForTimeout(500); ok(await p.getByTestId('to-live-price').isVisible(), 'Stop 1 links to the live price');
  await p.getByTestId('to-live-price').click(); await p.waitForSelector('[data-testid=rate-line]'); await p.waitForTimeout(300);
  const line = await p.getByTestId('rate-line').innerText(); ok(process.env.REAL ? /= [\d,]+ sats/.test(line) : line.includes('1,250 sats'), `rate line: ${line}`);
  ok((await p.getByTestId('rate-status').innerText()) === 'Live', 'status Live'); ok(/Alby rates API · \d\d:\d\d UTC/.test(await p.getByTestId('rate-source').innerText()), 'source and UTC time shown');
  if (!process.env.REAL) { ok(await p.getByTestId('sats-input').inputValue() === '25000', '$20 → 25,000 sats');
    await p.getByTestId('sats-input').fill('12345'); ok(await p.getByTestId('fiat-input').inputValue() === '9.88', '12,345 sats → $9.88');
    await p.getByTestId('fiat-input').fill('0.01'); ok(await p.getByTestId('sats-input').inputValue() === '13', '$0.01 → 13 sats (rounded up)'); await p.getByTestId('fiat-input').fill('20'); }
  await shot(p, '01-rate-and-converter', false);
  await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-sold]', { timeout: 20000 });
  ok((await p.getByTestId('quote-sold').innerText()).includes('Licensed for 25,000 sats') || !!process.env.REAL, 'quote inside the band: licensed for 25,000 sats'); await p.getByTestId('quote-sold').scrollIntoViewIfNeeded(); await shot(p, '02-bought-inside-band');
  await p.getByTestId('price-input').fill('40'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-refused]', { timeout: 20000 });
  ok((await p.getByTestId('quote-refused').innerText()).includes('quote_band'), '$40: refused by quote_band'); await p.getByTestId('quote-refused').scrollIntoViewIfNeeded(); await shot(p, '03-refused-above-band');
  await p.getByTestId('currency').selectOption('EUR'); await p.waitForFunction(() => document.querySelector('[data-testid=btc-line]')?.textContent?.includes('€'));
  ok((await p.getByTestId('btc-line').innerText()).includes('€'), 'EUR selected'); if (!process.env.REAL) ok(await p.getByTestId('rate-line').innerText() === '1 euro = 1,429 sats', 'EUR rate line');
  await p.getByTestId('currency').selectOption('JPY'); await p.waitForFunction(() => document.querySelector('[data-testid=btc-line]')?.textContent?.includes('¥')); await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await shot(p, '04-yen', false); ok((await p.getByTestId('rate-line').innerText()).startsWith('1 Japanese yen ='), 'yen rate line');
  await p.getByTestId('currency').selectOption('USD'); await p.waitForTimeout(200);
  await p.getByTestId('try-down').click(); await p.waitForFunction(() => document.querySelector('[data-testid=rate-status]')?.textContent === 'Last known rate');
  ok(true, 'service off: last known rate kept'); await p.getByTestId('price-input').fill('20'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-sold]', { timeout: 20000 }); ok(true, 'still sells within 10 minutes');
  await p.getByTestId('rate-card').scrollIntoViewIfNeeded(); await shot(p, '05-service-down-last-known', false);
  await p.getByTestId('try-old').click(); await p.waitForFunction(() => document.querySelector('[data-testid=rate-status]')?.textContent?.startsWith('Too old'));
  await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-blocked]'); await p.waitForTimeout(400); ok(true, 'rate too old: no quote'); await shot(p, '06-rate-too-old-blocked');
  ok(errs.length === 0, `no page errors ${errs.join('; ')}`); await p.close(); }
{ const { p, errs } = await page(390, 844); await p.goto(base + '?rates=fail#/price'); await p.waitForSelector('[data-testid=rate-status]');
  ok((await p.getByTestId('rate-status').innerText()) === 'No rate', 'mobile, service down from the start: No rate'); await p.getByTestId('buy-quoted').click(); await p.waitForSelector('[data-testid=quote-blocked]'); await p.waitForTimeout(400); await shot(p, '07-mobile-no-rate');
  await p.goto(base + '#/price'); await p.reload(); await p.waitForSelector('[data-testid=btc-line]'); await shot(p, '08-mobile-live', true);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); ok(!wide, 'mobile: no sideways scroll');
  ok(errs.length === 0, 'no page errors on mobile'); }
{ const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); await ctx.route('https://getalby.com/api/rates/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ code: 'USD', rate_float: 80000 }) }));
  await p.goto(base + '#/price'); await p.evaluate(() => { localStorage.setItem('ll.theme', 'light'); }); await p.reload(); await p.waitForSelector('[data-testid=btc-line]'); await shot(p, '09-light-mode', false); }
await b.close(); console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
