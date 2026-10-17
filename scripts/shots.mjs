import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:5180/'; const out = 'screenshots';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
const runAll = async id => { await p.goto(`${base}#/${id}`); await p.waitForTimeout(200); const s = p.getByRole('button', { name: /Set up all/ }); if (await s.count()) await s.click();
  await p.getByRole('button', { name: 'Run all steps' }).click({ timeout: 20000 }); await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 }); };
const tab = async name => { await p.getByRole('tab', { name }).click(); await p.waitForTimeout(250); };
const shot = async (name, full = false) => { await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}.png`, fullPage: full }); console.log(`${out}/${name}.png`); };
// ---- The main path (branch "simple") ----
const primary = () => p.locator('main button.min-h-14').first();
await p.goto(`${base}#/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200); await shot('01-home-first-screen');
await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.waitForTimeout(2500); await shot('01b-home-listening-preview');
await p.getByRole('button', { name: /License for 100 sats/ }).click(); await p.waitForTimeout(500); await shot('01c-home-licensing');
await p.waitForSelector('[data-testid=licensed]', { timeout: 30000 }); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('main').scrollTo(0, 400)); await shot('01d-home-licensed-proven-full-track');
const chap = async (c, name, after) => { await p.goto(`${base}#/${c}`); await p.waitForTimeout(400); await shot(`${name}-before`); await primary().click(); await p.waitForTimeout(2200); if (after) await after(); await shot(name); };
await chap('c1', '30-chapter1-artist-sells');
await chap('c2', '31-chapter2-agent-buys');
await chap('c3', '32-chapter3-verdict-real');
await p.getByRole('button', { name: /forged copy/ }).click(); await p.waitForTimeout(1500); await p.getByRole('button', { name: /Show the 9 checks/ }).nth(1).click(); await p.waitForTimeout(300); await p.locator('[data-testid=verdict]').nth(1).scrollIntoViewIfNeeded(); await shot('33-chapter3-verdict-forged-nine-checks');
await chap('c4', '34-chapter4-rights-change-hands');
await p.getByRole('button', { name: /^Under the hood$/ }).last().click(); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('main').scrollBy(0, 600)); await shot('34b-chapter4-under-the-hood-layer');
await p.goto(`${base}#/hood`); await p.waitForTimeout(600); await shot('35-under-the-hood'); await p.evaluate(() => document.querySelector('main').scrollTo(0, 99999)); await shot('35b-under-the-hood-glossary');
for (const id of ['s25', 's26', 's27']) { await runAll(id); await p.evaluate(() => document.querySelector('main').scrollTo(0, 380)); await shot(`4${id.slice(1) - 25}-${id}-rights-steps`); }
await p.goto(`${base}#/attack/A22`); await p.waitForTimeout(900); await p.getByRole('button', { name: /Run the attack/ }).click(); await p.waitForTimeout(2000); await shot('43-attack-A22-double-sale');
await p.goto(`${base}#/attack/A12c`); await p.waitForTimeout(900); await p.getByRole('button', { name: /Run the attack/ }).click(); await p.waitForTimeout(2000); await shot('44-attack-A12c-key-rotation');
{ const mm = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const q = await mm.newPage(); for (const [r, n] of [['', '36-mobile-home'], ['c2', '37-mobile-chapter2']]) { await q.goto(`${base}#/${r}`); await q.waitForTimeout(900); if (r) { await q.locator('main button.min-h-14').first().click(); await q.waitForTimeout(2000); } await q.screenshot({ path: `${out}/${n}.png` }); console.log(`${out}/${n}.png`); } await mm.close(); }
// ---- Under the hood (unchanged features) ----
await p.goto(`${base}#/start`); const bar = p.getByRole('region', { name: 'Music player' }); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
await bar.getByRole('button', { name: 'Play' }).click(); await p.waitForTimeout(3000); await shot('20-player-preview-playing'); await bar.getByRole('button', { name: 'Pause' }).click();
await bar.getByRole('button', { name: 'Credits' }).click(); await p.waitForTimeout(300); await shot('22-music-credits'); await p.getByRole('button', { name: 'Close' }).click();
await p.goto(`${base}#/s3`); await p.waitForTimeout(300); await shot('02-s3-set-up-parties');
await p.getByRole('button', { name: /Set up all/ }).click(); await p.getByRole('button', { name: 'Run all steps' }).waitFor(); await p.waitForTimeout(400);
await p.locator('[data-testid^=step-]').nth(4).getByRole('button').first().click(); await p.waitForTimeout(500); await p.locator('[data-testid^=step-]').nth(4).scrollIntoViewIfNeeded(); await shot('02b-s3-free-play-guard');
await p.getByRole('button', { name: 'Reset scenario' }).click(); await p.waitForTimeout(400);
await runAll('s3'); await p.evaluate(() => document.querySelector('main').scrollTo(0, 0)); await shot('03-s3-steps-done');
await tab('Flow Diagram'); await p.getByRole('tablist').scrollIntoViewIfNeeded(); await p.evaluate(() => document.querySelector('main').scrollBy(0, -60)); await shot('04-s3-flow-diagram');
await tab('Log'); await p.locator('text=Show code and data').first().click(); await p.getByRole('tablist').scrollIntoViewIfNeeded(); await shot('05-s3-log-with-code');
await tab('Nine Checks'); await p.getByRole('tablist').scrollIntoViewIfNeeded(); await shot('06-s3-nine-checks');
await p.getByRole('region', { name: 'Music player' }).getByRole('button', { name: 'Play' }).click(); await p.waitForTimeout(3000); await p.locator('[data-testid=file-check]').first().scrollIntoViewIfNeeded(); await shot('21-player-licensed-full-track-and-file-check'); await p.getByRole('region', { name: 'Music player' }).getByRole('button', { name: 'Pause' }).click();
await runAll('s4'); await p.evaluate(() => document.querySelector('main').scrollTo(0, 0)); await shot('07-s4-agent-buys');
await runAll('s11'); await tab('Code'); await p.getByRole('tablist').scrollIntoViewIfNeeded(); await shot('08-s11-code-tab');
await p.getByRole('button', { name: 'REPL', exact: true }).click(); await p.getByLabel('REPL input').fill("await w.verify(w.a['bundle.mia'] ?? w.a[Object.keys(w.a).find(k => k.startsWith('bundle'))]).then(v => v.result)"); await p.getByRole('button', { name: 'Run', exact: true }).click(); await p.waitForTimeout(600); await shot('08b-s11-repl');
  await tab('Production'); await p.getByRole('tablist').scrollIntoViewIfNeeded(); await shot('09-production-tab');
await p.goto(`${base}#/attack/A1`); await p.waitForTimeout(900); await p.getByRole('button', { name: /Present to the verifier/ }).click(); await p.waitForTimeout(1200); await shot('10-attack-A1-tamper');
await p.goto(`${base}#/attack/A18`); await p.waitForTimeout(900); await p.getByRole('button', { name: /Run the attack/ }).click(); await p.waitForTimeout(1500); await shot('11-attack-A18-open-issue');
await runAll('s5'); await tab('Balance Chart'); await p.getByRole('tablist').scrollIntoViewIfNeeded(); await shot('12-s5-balance-chart');
if (process.env.LIVE) { await p.goto(`${base}#/live`); await p.waitForTimeout(600); await shot('14-live-wallets-before');
  await p.getByRole('button', { name: /Create all/ }).click(); await p.waitForFunction(() => !document.body.innerText.includes('missing)'), null, { timeout: 90000 }); await p.waitForTimeout(800); await shot('15-live-wallets-connected');
  for (const name of [/Publish offer/, /Sign a licence request/, /Make invoice/, /Check and pay/, /Verify the licence/, /Pay the co-owners/]) { await p.getByRole('button', { name }).click(); await p.waitForFunction(() => !document.querySelector('.animate-spin'), null, { timeout: 60000 }); await p.waitForTimeout(300); }
  await p.getByRole('button', { name: 'Refresh balances' }).click(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelector('main').scrollTo(0, 0)); await shot('16-live-paid-balances');
  await p.getByText('verifyLicence on the real preimage', { exact: true }).scrollIntoViewIfNeeded(); await p.evaluate(() => document.querySelector('main').scrollBy(0, 200)); await shot('17-live-actions-verify'); await p.getByText('Timestamps and revocations on Mutinynet').scrollIntoViewIfNeeded(); await shot('18-live-mutinynet-needs-login'); }
await p.goto(`${base}#/s3`); await p.evaluate(() => { document.documentElement.classList.remove('dark'); }); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('main').scrollTo(0, 0)); await shot('19-light-mode-s3'); await p.evaluate(() => document.documentElement.classList.add('dark'));
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage(); await mp.goto(`${base}#/s3`); await mp.waitForTimeout(400); await mp.screenshot({ path: `${out}/13-mobile-s3.png` }); console.log(`${out}/13-mobile-s3.png`);
await b.close();
