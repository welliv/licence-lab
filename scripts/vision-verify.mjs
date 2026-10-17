// Live check for the vision fix: Stop 1 Personal and Business with real test money, Stop 2 videos + subscription (+ renewal), Stop 3, next steps.
// Usage: URL=https://welliv.github.io/licence-lab/next/ [W=390] node scripts/vision-verify.mjs
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const W = Number(process.env.W ?? 1440); const sfx = W < 600 ? `-m${W}` : ''; const out = 'screenshots/vision-fix/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: W < 600 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const tall = async (name) => { const h = await p.evaluate(() => document.querySelector('main')?.scrollHeight ?? 900); await p.setViewportSize({ width: W, height: Math.max(W < 600 ? 844 : 900, h + 140) }); await p.waitForTimeout(250); await p.screenshot({ path: `${out}live${sfx}-${name}.png` }); await p.setViewportSize({ width: W, height: W < 600 ? 844 : 900 }); };
const txt = async s => (await p.locator(s).first().innerText()).replace(/\s+/g, ' ').trim();
const wallets = async () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-wallet]')].map(x => [x.getAttribute('data-wallet'), x.querySelector('[data-cents]')?.getAttribute('data-cents')])));
const R = { url: base, width: W };
await p.goto(base + '?fresh=1'); await p.click('[data-persona=artist]'); await p.waitForSelector('[data-stop=stop1]');
R.walletsBefore = await wallets();
for (const ty of ['personal', 'business']) {
  await p.click(`[data-testid=licence-${ty}]`); R[ty] = { price: await txt('[data-testid=price]'), allows: await txt('[data-testid=licence-allows]') };
  await p.click('[data-testid=buy]'); await p.waitForSelector('[data-testid=log-line]', { timeout: 120000 }); await p.waitForTimeout(2300);
  R[ty].log = await txt('[data-testid=log-line]'); R[ty].wallets = await wallets(); await tall(`stop1-${ty}`);
  await p.click('[data-testid=see-proof]'); await p.waitForSelector('[data-testid=see-proof-panel]');
  R[ty].rate = await txt('[data-testid=demo-rate]'); R[ty].real = (await p.locator('[data-testid=real-card]').count()) ? await txt('[data-testid=real-card]') : 'NO REAL CARD';
  R[ty].draft = await p.locator('[data-testid=draft-personal]').count(); R[ty].capped = await p.locator('[data-testid=real-capped]').count(); R[ty].use = await txt('[data-testid=file-fingerprint]');
  await tall(`stop1-${ty}-proof`);
}
await p.click('[data-testid=next]'); await p.waitForSelector('[data-stop=stop2]');
await p.click('[data-testid=clip-go]'); await p.waitForSelector('[data-testid=clip-done]', { timeout: 120000 }); R.clip = await txt('[data-testid=clip-done]');
await p.click('[data-testid=sub-go]'); await p.waitForSelector('[data-testid=sub-done]', { timeout: 120000 }); R.sub = await txt('[data-testid=sub-log]');
await p.click('[data-testid=renew-go]'); await p.waitForSelector('[data-testid=renew-done], [data-testid=renew-refused]', { timeout: 60000 }); R.renew = await txt('[data-testid=renew-done], [data-testid=renew-refused]');
await p.waitForTimeout(1600); R.stop2wallets = await wallets(); await tall('stop2');
await p.click('[data-testid=see-proof]'); R.subReal = (await p.locator('[data-testid=real-card]').count()) ? await txt('[data-testid=real-card]') : 'NO REAL CARD'; R.subDraft = await p.locator('[data-testid=draft-sub]').count(); await tall('stop2-proof');
await p.click('[data-testid=next]'); await p.waitForSelector('[data-stop=stop3]'); await p.click('[data-testid=check-go]'); await p.waitForSelector('[data-testid=verdict]'); R.verdict = await txt('[data-testid=verdict]');
R.nextSteps = await p.locator('[data-testid=next-steps] > *').count(); R.github = await p.locator('[data-testid=step-github]').getAttribute('href');
await p.click('[data-testid=step-agent]'); R.snippetLines = (await p.locator('[data-testid=connect-agent] pre').innerText()).trim().split('\n').length; await tall('stop3-connect-agent');
await p.click('[data-testid=step-song]'); await p.setInputFiles('[data-testid=own-file]', 'public/music/02-dave-northern-lights.mp3').catch(async () => { const f = (await import('node:fs')).readdirSync('public/music').find(x => x.endsWith('.mp3')); await p.setInputFiles('[data-testid=own-file]', 'public/music/' + f); });
await p.waitForSelector('[data-testid=own-sell]'); await p.click('[data-testid=own-sell]'); await p.waitForSelector('[data-testid=own-verdict]', { timeout: 120000 }); await p.waitForTimeout(1200); R.own = await txt('[data-testid=own-verdict]'); R.ownWallet = await p.getAttribute('[data-testid=wallet-you]', 'data-cents'); await tall('stop3-put-up-song');
R.pageErrors = errs; console.log(JSON.stringify(R, null, 1)); await b.close();
