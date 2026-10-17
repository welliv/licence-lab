import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://127.0.0.1:5190/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto(url + '?fresh=1#/sell'); await p.waitForSelector('[data-testid="run-s1.buy"]'); const t0 = Date.now();
await p.click('[data-testid="run-s1.buy"]');
for (let i = 0; i < 60; i++) { const s = await p.locator('[role=status]').allTextContents().catch(() => []); if (await p.locator('[data-testid=result]').count()) break; if (i % 4 === 0) console.log(((Date.now() - t0) / 1000).toFixed(1), s.join(' | ')); await p.waitForTimeout(500); }
console.log('Paid after', (Date.now() - t0) / 1000, 's');
await p.waitForTimeout(2500); await p.screenshot({ path: '/tmp/one/s1-d-1.png', fullPage: true });
await p.click('#tab-proof'); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/one/s1-d-proof.png', fullPage: true });
console.log('errors', errs); await b.close();
