// Walk all 11 scenarios like a visitor: every step, then the cheat. Screenshots before the first tap and after; console errors; timings.
// node scripts/one/walk.mjs <base url> <out dir> <desktop|mobile> [practice]
import { chromium } from 'playwright';
import fs from 'fs';
const [url = 'http://127.0.0.1:5190/', out = '/tmp/one/walk', mode = 'desktop', practice] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const SLUGS = ['sell', 'licences', 'check', 'cowriters', 'stop-selling', 'rights', 'budget', 'scale', 'subscribe', 'train', 'fake'];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 860 };
const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: mode === 'mobile' ? 2 : 1, hasTouch: mode === 'mobile', isMobile: mode === 'mobile' });
const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
const q = practice ? '?practice=1&fresh=1' : '?fresh=1'; await p.goto(url + q + '#/sell'); await p.waitForTimeout(600);
const report = [];
for (const [i, slug] of SLUGS.entries()) {
  if (i) { await p.evaluate(s => { location.hash = '/' + s; }, slug); await p.waitForTimeout(500); }
  const n = String(i + 1).padStart(2, '0'); await p.screenshot({ path: `${out}/${n}-${slug}-${mode}-before.png` });
  const r = { slug, steps: [], errorsBefore: errs.length };
  for (let k = 0; k < 6; k++) { const btn = p.locator('article [data-testid^="run-"]'); if (!(await btn.count())) break; const id = await btn.first().getAttribute('data-testid'); const t0 = Date.now(); await btn.first().click();
    await p.waitForFunction(id => !document.querySelector(`[data-testid="${id}"]`), id, { timeout: 60000 }).catch(() => {}); r.steps.push({ id, s: (Date.now() - t0) / 1000 }); await p.waitForTimeout(300); }
  const cheat = p.locator('article li[data-state="open"] button'); if (await cheat.count()) { const t0 = Date.now(); await cheat.first().click(); await p.waitForTimeout(400); r.steps.push({ id: 'cheat', s: (Date.now() - t0) / 1000 }); }
  // wait for proofs to finish
  await p.waitForTimeout(800); await p.click('#tab-proof'); for (let w = 0; w < 40; w++) { if (!(await p.locator('[data-testid=proof] .pulse').count())) break; await p.waitForTimeout(250); }
  await p.locator('details summary').first().click().catch(() => {}); await p.waitForTimeout(200);
  r.checks = await p.locator('details ol li').allTextContents().catch(() => []); r.blocked = await p.locator('article [role=status]').allTextContents();
  await p.click('#tab-what'); await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/${n}-${slug}-${mode}-after.png`, fullPage: true });
  r.complete = await p.locator('[data-testid=result]').count() > 0; r.errors = errs.slice(r.errorsBefore); report.push(r);
  console.log(slug, r.complete ? 'complete' : 'NOT COMPLETE', JSON.stringify(r.steps), r.blocked.join(' | '), r.errors.length ? r.errors : '');
}
await p.evaluate(() => { location.hash = '/done'; }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/12-done-${mode}.png`, fullPage: true });
const ledger = await p.evaluate(() => JSON.parse(localStorage.getItem('one.v1')).bal);
fs.writeFileSync(`${out}/walk-${mode}.json`, JSON.stringify({ report, ledger, errors: errs }, null, 1)); console.log('ledger', JSON.stringify(ledger)); console.log('console errors', errs.length);
await b.close();
