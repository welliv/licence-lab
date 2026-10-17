// Playlist on the artist-first Stop 1: default 2 clicks, pick another track, buy it (real test money), check payoff, proof and player sync.
// Usage: URL=http://localhost:4180/ OUT=screenshots/artist-first/ node scripts/playlist-check.mjs
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const out = process.env.OUT ?? 'screenshots/artist-first/'; const pick = process.env.PICK ?? 'carol';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const res = {};
const tall = async (p, path, W) => { const h = await p.evaluate(() => document.querySelector('[data-stop=stop1]')?.closest('main')?.scrollHeight ?? 900); await p.setViewportSize({ width: W, height: Math.max(844, h + 140) }); await p.waitForTimeout(300); await p.screenshot({ path }); };
for (const W of [1440, 390]) {
  const p = await b.newPage({ viewport: { width: W, height: W < 600 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '?fresh=1'); await p.click('[data-persona=artist]'); await p.waitForSelector('[data-testid=playlist]');
  res[W] = { songDefault: await p.locator('[data-testid=song-title]').innerText(), playlist: (await p.locator('[data-testid=playlist] li').allInnerTexts()).map(s => s.replace(/\n/g, ' ')) };
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}playlist-${W < 600 ? 'mobile390' : 'desktop'}.png` });
  if (W < 600) { await p.evaluate(() => document.querySelector('[data-testid=playlist] ul').scrollTo({ left: 0 })); await p.locator(`[data-testid=pick-${pick}]`).dispatchEvent('click'); await p.waitForTimeout(800); await p.screenshot({ path: `${out}playlist-mobile390-picked.png` });
    res[W].pickedInView = await p.evaluate(c => { const ul = document.querySelector('[data-testid=playlist] ul'); const li = document.querySelector(`[data-testid=pick-${c}]`).parentElement; return li.offsetLeft >= ul.scrollLeft && li.offsetLeft + li.offsetWidth <= ul.scrollLeft + ul.clientWidth; }, pick);
    const t0 = Date.now(); await p.click('[data-testid=buy]'); await p.waitForSelector('[data-testid=next]', { timeout: 120000 }); res[W].secondsToPayoff = (Date.now() - t0) / 1000; await p.waitForTimeout(1500); await p.screenshot({ path: `${out}playlist-mobile390-payoff.png` });
    res[W].payoff = (await p.locator('[data-testid=payoff]').innerText()).replace(/\n/g, ' | '); res[W].errs = errs; await p.close(); continue; }
  // sync: player dropdown -> card; card pick -> player
  await p.selectOption('[aria-label="Choose track"]', { label: 'Paper Boats · Erin' }); await p.waitForTimeout(200); res[W].afterDropdown = await p.locator('[data-testid=song-title]').innerText();
  await p.click(`[data-testid=pick-${pick}]`); await p.waitForTimeout(200);
  res[W].picked = await p.locator('[data-testid=song-title]').innerText(); res[W].pickedPrice = await p.locator('[data-testid=price]').innerText(); res[W].shares = await p.locator('[data-testid=shares]').innerText();
  res[W].playerAfterPick = (await p.locator('[data-testid=mini-player]').innerText()).split('\n')[0]; res[W].dropdown = await p.$eval('[aria-label="Choose track"]', s => s.options[s.selectedIndex].text);
  await p.click(`[data-testid=pick-${pick}] button`); await p.waitForTimeout(1500); res[W].previewPlaying = await p.evaluate(() => [...document.querySelectorAll('[data-testid=mini-player]')][0].innerText.includes('preview'));
  const t0 = Date.now(); await p.click('[data-testid=buy]'); await p.waitForSelector('[data-testid=next]', { timeout: 120000 }); res[W].secondsToPayoff = (Date.now() - t0) / 1000; await p.waitForTimeout(1500);
  res[W].payoff = (await p.locator('[data-testid=payoff]').innerText()).replace(/\n/g, ' | ');
  await tall(p, `${out}playlist-payoff-other-track.png`, W); await p.setViewportSize({ width: W, height: 900 });
  await p.click('[data-testid=see-proof]'); await p.waitForTimeout(400);
  res[W].demoRate = await p.locator('[data-testid=demo-rate]').innerText(); res[W].realCard = (await p.locator('[data-testid=real-card]').count()) ? (await p.locator('[data-testid=real-card]').innerText()).split('\n')[0] : 'none';
  if (await p.locator('[data-testid=real-card] summary').count()) { await p.click('[data-testid=real-card] summary'); res[W].realOfferSha = (await p.locator('[data-testid=real-card] details').innerText()).match(/offer fingerprint \(SHA-256 of the file\) ([0-9a-f]{64})/)?.[1]; }
  res[W].ownership = await p.locator('[data-testid=ownership-plain]').innerText(); res[W].fingerprint = await p.locator('[data-testid=file-fingerprint]').innerText();
  res[W].expectedSha = await p.evaluate(async (c) => (await (await fetch('./music/tracks.json')).json()).tracks.find(t => t.cast === c).sha256, pick);
  res[W].playerAfterBuy = (await p.locator('[data-testid=mini-player]').innerText()).replace(/\n/g, ' ');
  await tall(p, `${out}playlist-proof-other-track.png`, W);
  res[W].errs = errs; await p.close();
}
console.log(JSON.stringify(res, null, 1)); await b.close();
