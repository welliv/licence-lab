// Fresh headless walk of the first 3 Under the hood scenarios: Start here → do every step by its button → log → result → proof → Next.
// Usage: URL=https://welliv.github.io/licence-lab/next/ [W=390] node scripts/hood-walk.mjs
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const W = Number(process.env.W ?? 1440); const sfx = W < 600 ? `-m${W}` : ''; const out = 'screenshots/under-the-hood/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: W < 600 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const tall = async (name) => { const h = await p.evaluate(() => document.querySelector('main')?.scrollHeight ?? 900); await p.setViewportSize({ width: W, height: Math.min(7000, Math.max(W < 600 ? 844 : 900, h + 60)) }); await p.waitForTimeout(250); await p.screenshot({ path: `${out}after${sfx}-${name}.png` }); await p.setViewportSize({ width: W, height: W < 600 ? 844 : 900 }); };
const R = { url: base, width: W, walks: [] };
await p.goto(base + '?fresh=1#/hood'); await p.waitForSelector('[data-testid=start-here]');
if (W < 600) { await p.click('[data-testid=menu]'); await p.waitForTimeout(400); await p.screenshot({ path: `${out}after${sfx}-drawer.png` }); await p.mouse.click(W - 20, 400); await p.waitForTimeout(300); }
const t0 = Date.now(); await p.click('[data-testid=start-here]');
for (let k = 0; k < 3; k++) {
  await p.waitForSelector('[data-testid=guide-page]'); await p.waitForSelector('[data-testid^=wallet-card-][data-cents]:not([data-cents=""])', { timeout: 20000 }); await p.waitForTimeout(300);
  const w = { where: await p.innerText('[data-testid=guide-where]'), title: (await p.innerText('h1')).trim(), wallets: await p.$$eval('[data-testid^=wallet-card-]', xs => xs.map(x => x.innerText.replace(/\s+/g, ' ').trim())) };
  if (k === 0) { w.secondsToFirstPage = (Date.now() - t0) / 1000; await tall(`scenario1-before`); }
  const ids = await p.$$eval('[data-testid^=step-row-]', xs => xs.map(x => x.getAttribute('data-testid').slice(9)));
  w.steps = [];
  for (const id of ids) { const label = (await p.innerText(`[data-testid=do-${id}]`)).trim(); await p.click(`[data-testid=do-${id}]`); await p.waitForSelector(`[data-testid=said-${id}]`, { timeout: 60000 }); await p.waitForFunction(() => !document.querySelector('[data-testid=steps] .animate-spin'), null, { timeout: 60000 });
    w.steps.push(`${label} → ${(await p.innerText(`[data-testid=said-${id}]`)).trim()}`); }
  w.log = await p.$$eval('[data-testid=log] li', xs => xs.map(x => x.innerText.replace(/\s+/g, ' ').trim())); w.result = (await p.innerText('[data-testid=result]')).replace(/\s+/g, ' ');
  await p.waitForTimeout(1500); w.walletsAfter = await p.$$eval('[data-testid^=wallet-card-]', xs => xs.map(x => x.innerText.replace(/\s+/g, ' ').trim())); await tall(`scenario${k + 1}-done`);
  await p.click('[data-testid=see-proof]'); await p.waitForSelector('[data-testid=proof-panel]'); w.proofHasSats = /sats/.test(await p.innerText('[data-testid=proof-panel]')); if (k === 0) await tall('scenario1-proof');
  w.next = (await p.innerText('[data-testid=next-item]')).replace(/\s+/g, ' '); R.walks.push(w); await p.click('[data-testid=next-item]'); await p.waitForTimeout(400);
}
await p.goto(base + '#/redteam'); await p.waitForTimeout(1200); R.redteamOk = (await p.locator('text=/attack|break/i').count()) > 0;
await p.goto(base + '#/s11'); await p.waitForSelector('[data-testid=guide-page]'); R.oldRouteS11 = await p.innerText('h1');
R.pageErrors = errs; console.log(JSON.stringify(R, null, 1)); await b.close();
