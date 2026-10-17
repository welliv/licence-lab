// Drives every scenario in a real browser: set up all parties, run all steps, check each step behaved as described.
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
let bad = 0; const ids = Array.from({ length: 24 }, (_, i) => `s${i + 1}`);
for (const id of ids) {
  await p.goto(`${base}#/${id}`); await p.waitForTimeout(150);
  const setup = p.getByRole('button', { name: /Set up all/ }); if (await setup.count()) await setup.click();
  await p.getByRole('button', { name: 'Run all steps' }).waitFor({ timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('button[disabled]')?.textContent?.includes('Run all') || true);
  await p.waitForTimeout(100); await p.getByRole('button', { name: 'Run all steps' }).click();
  await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 });
  const res = await p.evaluate(() => { const cards = [...document.querySelectorAll('[data-testid^=step-]')]; return { n: cards.length, good: cards.filter(c => c.querySelector('.lucide-circle-check-big, .lucide-circle-check, .lucide-check-circle-2')).length, err: cards.filter(c => c.textContent.includes('Error:')).map(c => c.textContent.slice(0, 120)) }; });
  const ok = res.n > 0 && res.good === res.n && !res.err.length; if (!ok) bad++;
  console.log(ok ? '✓' : '✗', id, `${res.good}/${res.n}`, res.err.join(' | '));
}

// Free play: on a fresh S3, press step 5 first. It must show a guard, not an error.
await p.goto(`${base}#/start`); await p.evaluate(() => localStorage.clear()); await p.goto(`${base}#/s3`); await p.reload(); await p.waitForTimeout(200);
await p.getByRole('button', { name: /Set up all/ }).click(); await p.getByRole('button', { name: 'Run all steps' }).waitFor(); await p.waitForTimeout(400);
const s3 = await p.locator('[data-testid^=step-]').nth(4); await s3.getByRole('button').first().click(); await p.waitForTimeout(500);
const g = (await s3.textContent()) ?? ''; const guardOk = /Not yet|Refused/.test(g) && !g.includes('Error:'); console.log(guardOk ? '✓' : '✗', 'free play guard:', g.match(/(Not yet|Refused)[^.]*\./)?.[0]); if (!guardOk) bad++;
// Getting started: three slides, then the first scenario
await p.goto(`${base}#/start`); for (let i = 0; i < 2; i++) await p.getByRole('button', { name: 'Next →' }).click(); await p.getByRole('button', { name: /Try the first scenario/ }).click(); await p.waitForTimeout(300);
const gs = p.url().endsWith('#/s1'); console.log(gs ? '✓' : '✗', 'getting started → s1'); if (!gs) bad++;
// Live page, real faucet wallets (only when LIVE=1)
if (process.env.LIVE) { await p.goto(`${base}#/live`); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Create all/ }).click(); await p.waitForFunction(() => !document.body.innerText.includes('missing)'), null, { timeout: 90000 });
  for (const name of [/Publish offer/, /Sign a licence request/, /Make invoice/, /Check and pay/, /Verify the licence/, /Pay the co-owners/]) { await p.getByRole('button', { name }).click(); await p.waitForFunction(() => !document.querySelector('.animate-spin'), null, { timeout: 60000 }); await p.waitForTimeout(300); }
  const t = await p.locator('main').innerText(); const liveOk = /Paid\. Preimage/.test(t) && /stopped at check 2/.test(t) && /Paid: Jay/.test(t); console.log(liveOk ? '✓' : '✗', 'live page: real pay, verify, payout'); if (!liveOk) { bad++; console.log(t.slice(0, 1500)); } }

for (const a of ['A1', 'A18']) { await p.goto(`${base}#/attack/${a}`); await p.waitForTimeout(800); await p.getByRole('button', { name: /Present to the verifier|Run the attack/ }).click(); await p.waitForTimeout(1500); console.log(a, (await p.locator('.fade-in').first().textContent())?.slice(0, 100)); }
console.log('page errors:', errs.length, errs.slice(0, 5)); await b.close(); process.exit(bad || errs.length ? 1 : 0);
