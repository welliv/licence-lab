// Measures Home → Stop 1 payoff (clicks, seconds) and the visible Stop 1 word count, and takes screenshots.
// Usage: URL=http://localhost:4180/ TAG=before|after [Q=?classic=1] [REAL=0|1] node scripts/artist-first-measure.mjs
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const tag = process.env.TAG ?? 'after'; const q = process.env.Q ?? ''; const real = process.env.REAL ?? '1';
const out = 'screenshots/artist-first/'; const W = process.env.W ? Number(process.env.W) : 1440; const H = W < 600 ? 844 : 900; const sfx = W < 600 ? `-mobile${W}` : '';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const tall = async (path) => { const h = await p.evaluate(() => document.querySelector('[data-stop=stop1]')?.closest('main')?.scrollHeight ?? 900); await p.setViewportSize({ width: W, height: Math.max(H, h + 140) }); await p.waitForTimeout(250); await p.screenshot({ path }); await p.setViewportSize({ width: W, height: H }); };
const words = async () => (await p.locator('[data-stop=stop1]').innerText()).split(/\s+/).filter(w => /[A-Za-z0-9$£]/.test(w)).length;
const qs = `?fresh=1${real === '0' ? '&real=0' : ''}${q ? '&' + q.replace(/^\?/, '') : ''}`;
await p.goto(base + qs); await p.waitForSelector('[data-persona=artist]'); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}${tag}${sfx}-0-home.png` });
let clicks = 0; const t0 = Date.now();
await p.click('[data-persona=artist]'); clicks++;
await p.waitForSelector('[data-stop=stop1]'); await p.waitForFunction(() => !/Checking the test faucet/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(300); const wBefore = await words(); await tall(`${out}${tag}${sfx}-1-stop1.png`);
const hear = p.getByRole('button', { name: /^Hear "Rain"$/ }); if (await hear.count()) { await hear.click(); clicks++; await p.waitForTimeout(400); }
const buy = p.locator('[data-testid=buy]'); if (await buy.count()) await buy.click(); else await p.getByRole('button', { name: /License for/ }).click(); clicks++;
if (await p.locator('[data-testid=fanout]').count() === 0) await p.waitForSelector('[data-testid=fanout], [data-testid=proof-saved]', { timeout: 120000 });
await p.waitForSelector('[data-testid=next]', { timeout: 120000 }); const secs = (Date.now() - t0) / 1000; await p.waitForTimeout(2200);
const wAfter = await words(); const satsAtPayoff = (await p.locator('[data-stop=stop1]').innerText()).match(/\bsats?\b/gi)?.length ?? 0; await p.screenshot({ path: `${out}${tag}${sfx}-2-payoff-viewport.png` }); await tall(`${out}${tag}${sfx}-2-payoff.png`);
const realLine = await p.locator('[data-testid=real-card]').count() ? (await p.locator('[data-testid=real-card]').innerText()).split('\n')[0] : '(no real card visible)';
let proofWords = null; const tap = p.locator('[data-testid=see-proof]'); if (await tap.count()) { await tap.click(); await p.waitForTimeout(500); await tall(`${out}${tag}${sfx}-3-proof-open.png`); proofWords = await words(); }
const satsWithProofOpen = (await p.locator('[data-stop=stop1]').innerText()).match(/\bsats?\b/gi)?.length ?? 0;
console.log(JSON.stringify({ tag, width: W, url: base + qs, clicksHomeToPayoff: clicks, secondsHomeToPayoff: secs, wordsStop1BeforeBuying: wBefore, wordsStop1AtPayoff: wAfter, wordsWithProofOpen: proofWords, satsAtPayoff, satsWithProofOpen, realLine, pageErrors: errs }));
await b.close();
