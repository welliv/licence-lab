// Fact-check Alby's sandbox (headless). Creates only the two faucet test wallets needed (Alice, Bob) for one scenario.
import { chromium } from 'playwright';
const out = 'docs/compare/alby'; const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://sandbox.albylabs.com/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
for (let i = 1; i <= 3; i++) { await p.screenshot({ path: `${out}/gs-slide-${i}.png` }); const n = p.getByRole('button', { name: /Next/ }); if (await n.count()) { await n.first().click(); await p.waitForTimeout(600); } }
await p.screenshot({ path: `${out}/gs-after-slides.png` }); console.log('after slides url', p.url(), (await p.locator('main').first().innerText()).slice(0, 300).replace(/\n/g, ' | '));
await p.getByText('Simple Invoice Payment').first().click(); await p.waitForTimeout(1200);
const btns = async () => (await p.locator('main').first().locator('button').evaluateAll(xs => xs.map(x => `${x.textContent.trim()}${x.disabled ? '[disabled]' : ''}`))).filter(Boolean).join(' ; ');
console.log('before wallets:', await btns());
const c = p.getByRole('button', { name: /Create Test Wallet/ }); const n = await c.count(); for (let i = 0; i < n; i++) { await p.getByRole('button', { name: /Create Test Wallet/ }).first().click(); await p.waitForTimeout(5000); }
await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/fc-1-wallets.png` }); console.log('after wallets:', await btns());
// Bob tries to pay before Alice made an invoice
const inputs = await p.locator('main').first().locator('input, textarea').evaluateAll(xs => xs.map(x => `${x.placeholder}|${x.value}|${x.disabled ? 'disabled' : ''}`)); console.log('inputs:', inputs.join(' ; '));
const bolt = p.locator('input[placeholder^="lnbc"], textarea[placeholder^="lnbc"]').first(); if (await bolt.count()) { await bolt.fill('lnbc1garbage'); await p.waitForTimeout(300); console.log('after typing garbage invoice:', await btns()); const pay = p.getByRole('button', { name: /Pay Invoice/ }).first(); if (await pay.isEnabled()) { await pay.click(); await p.waitForTimeout(3000); console.log('garbage pay result:', (await p.locator('main').first().innerText()).match(/(error|fail|invalid)[^\n]{0,120}/i)?.[0]); } await p.screenshot({ path: `${out}/fc-2-garbage-pay.png` }); await bolt.fill(''); }
// Normal order: Alice creates, then Bob pays twice
await p.getByRole('button', { name: /Create Invoice/ }).first().click(); await p.waitForTimeout(4000); console.log('after create:', await btns());
const auto = await p.locator('input[placeholder^="lnbc"], textarea[placeholder^="lnbc"]').first().inputValue().catch(() => ''); console.log('invoice auto-filled into Bob panel:', !!auto, auto.slice(0, 20));
const pay = p.getByRole('button', { name: /Pay Invoice/ }).first(); if (await pay.isEnabled()) { await pay.click(); await p.waitForTimeout(5000); }
await p.screenshot({ path: `${out}/fc-3-paid.png` }); console.log('after pay:', await btns());
if (await pay.isEnabled()) { await pay.click(); await p.waitForTimeout(4000); console.log('second pay:', (await p.locator('main').first().innerText()).match(/(already|error|fail)[^\n]{0,120}/i)?.[0]); }
await p.screenshot({ path: `${out}/fc-4-pay-again.png` });
// Other scenarios: are panels gated by order?
for (const s of ['Lightning Address', 'Hold Invoice', 'Payment Prisms']) { await p.getByText(s).first().click(); await p.waitForTimeout(1500); console.log(s, '→', await btns()); }
await p.screenshot({ path: `${out}/fc-5-hold-invoice.png` });
await b.close();
