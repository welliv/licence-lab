import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto('http://127.0.0.1:4181/#/s3'); await p.waitForTimeout(800);
await p.getByRole('tab', { name: 'Production' }).click(); await p.waitForTimeout(1200);
const h = p.getByRole('heading', { name: 'Recorded runs on Mutinynet' }); await h.scrollIntoViewIfNeeded(); await p.evaluate(() => { const e = [...document.querySelectorAll('h3')].find(x => x.textContent.includes('Recorded runs')); e.scrollIntoView({ block: 'start' }); });
await p.waitForTimeout(400); await p.screenshot({ path: 'screenshots/25-production-mutinynet-proofs.png' });
const sec = p.locator('h3', { hasText: 'Recorded runs on Mutinynet' }).locator('..'); await sec.screenshot({ path: 'screenshots/26-production-mutinynet-proofs-detail.png' });
console.log(await sec.innerText()); await b.close();
