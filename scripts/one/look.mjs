import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://127.0.0.1:5190/'; const out = process.argv[3] ?? '/tmp/one';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [w, h, tag] of [[1280, 860, 'd'], [390, 844, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url + '?fresh=1#/sell'); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/s1-${tag}-0.png` });
  console.log(tag, 'errors', errs);
}
await b.close();
