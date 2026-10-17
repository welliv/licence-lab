import { chromium } from 'playwright'; import { readFileSync } from 'fs';
const pairs = [['1-getting-started', 'alby/gs-slide-1.png', '../../screenshots/01-getting-started.png'], ['1b-getting-started-last-slide', 'alby/gs-after-slides.png', '../../screenshots/01c-getting-started-slide-3.png'],
  ['8-live-wallets-real-payment', 'alby/fc-3-paid.png', '../../screenshots/16-live-paid-balances.png'], ['9-free-play-guards', 'alby/fc-2-garbage-pay.png', '../../screenshots/02b-s3-free-play-guard.png'], ['2-gating-and-parties', 'alby/03-x402.png', '../../screenshots/02-s3-set-up-parties.png'],
  ['3-steps-after-run', 'alby/04-after-payment-log.png', '../../screenshots/03-s3-steps-done.png'], ['4-flow-diagram', 'alby/05-flow-diagram.png', '../../screenshots/04-s3-flow-diagram.png'],
  ['5-balance-chart', 'alby/06-balance-chart.png', '../../screenshots/12-s5-balance-chart.png'], ['6-code-tab', 'alby/04-tab-code.png', '../../screenshots/08-s11-code-tab.png'], ['7-production-tab', 'alby/04-tab-production.png', '../../screenshots/09-production-tab.png']];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 2000, height: 760 } });
const d = u => `data:image/png;base64,${readFileSync(new URL(u, new URL('../docs/compare/', import.meta.url))).toString('base64')}`;
for (const [n, a, o] of pairs) { await p.setContent(`<body style="margin:0;font:600 16px Inter,sans-serif;background:#f4f4f5"><div style="display:flex;gap:16px;padding:12px">${[['Alby Sandbox', a], ['Licence Lab', o]].map(([t, s]) => `<div style="flex:1"><div style="margin:0 0 6px">${t}</div><img src="${d(s)}" style="width:100%;border:1px solid #ddd;border-radius:6px"></div>`).join('')}</div></body>`);
  await p.waitForTimeout(200); await p.screenshot({ path: `docs/compare/side-by-side/${n}.png`, fullPage: true }); console.log(n); }
await b.close();
