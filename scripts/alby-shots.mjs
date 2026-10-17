// Read-only headless screenshots of Alby's public sandbox for the comparison. It never creates wallets.
import { chromium } from 'playwright';
const out = 'docs/compare/alby'; const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://sandbox.albylabs.com/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/01-home.png` });
const items = await p.locator('nav a, aside a, aside button').allTextContents(); console.log('sidebar:', items.map(s => s.trim()).filter(Boolean).slice(0, 60).join(' | '));
for (const [name, label] of [['02-simple-payment', /Simple Payment/i], ['03-x402', /x402/i]]) { const l = p.getByText(label).first(); if (await l.count()) { await l.click(); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${name}.png` }); } }
for (const t of ['Code', 'Production', 'Flow Diagram']) { const l = p.getByRole('button', { name: t }).or(p.getByRole('tab', { name: t })).first(); if (await l.count()) { await l.scrollIntoViewIfNeeded(); await l.click(); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/04-tab-${t.replace(' ', '-').toLowerCase()}.png` }); } }
console.log('url', p.url()); await b.close();
