// Drives every scenario in a real browser: set up all parties, run all steps, check each step behaved as described.
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
let bad = 0; const ids = Array.from({ length: 27 }, (_, i) => `s${i + 1}`);
for (const id of ids) {
  await p.goto(`${base}#/${id}`); await p.waitForTimeout(150);
  const setup = p.getByRole('button', { name: /Set up all/ }); if (await setup.count()) await setup.click();
  await p.getByRole('button', { name: 'Run all steps' }).waitFor({ timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('button[disabled]')?.textContent?.includes('Run all') || true);
  await p.waitForTimeout(100); await p.getByRole('button', { name: 'Run all steps' }).click();
  await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 });
  const res = await p.evaluate(() => { const cards = [...document.querySelectorAll('[data-testid^=step-]')]; return { n: cards.length, good: cards.filter(c => c.querySelector('.lucide-circle-check-big, .lucide-circle-check, .lucide-check-circle-2')).length, err: cards.filter(c => c.textContent.includes('Error:')).map(c => c.textContent.slice(0, 120)) }; });
  const ok = res.n > 0 && res.good === res.n && !res.err.length; if (!ok) bad++;
  console.log(ok ? '✓' : '✗', id, `${res.good}/${res.n}`, res.err.join(' | '));
}

// Free play: on a fresh S3, press step 5 first. It must show a guard, not an error.
await p.goto(`${base}#/start`); await p.evaluate(() => localStorage.clear()); await p.goto(`${base}#/s3`); await p.reload(); await p.waitForTimeout(200);
await p.getByRole('button', { name: /Set up all/ }).click(); await p.getByRole('button', { name: 'Run all steps' }).waitFor(); await p.waitForTimeout(400);
const s3 = await p.locator('[data-testid^=step-]').nth(4); await s3.getByRole('button').first().click(); await p.waitForTimeout(500);
const g = (await s3.textContent()) ?? ''; const guardOk = /Not yet|Refused/.test(g) && !g.includes('Error:'); console.log(guardOk ? '✓' : '✗', 'free play guard:', g.match(/(Not yet|Refused)[^.]*\./)?.[0]); if (!guardOk) bad++;
// Main path: home (hear → license → licensed and proven → full track), then the four chapters
await p.goto(`${base}#/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
const primaries = await p.locator('main button.min-h-14').count(); const headline = await p.locator('h1').innerText();
await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.waitForTimeout(1200);
await p.getByRole('button', { name: /License for 100 sats/ }).click(); await p.waitForSelector('[data-testid=licensed]', { timeout: 30000 }); await p.waitForTimeout(800);
const lic = await p.locator('[data-testid=licensed]').innerText(); const href = await p.locator('[data-testid=proof-link]').getAttribute('href'); const fsrc = await p.evaluate(() => window.lab?.music?.src ?? '');
const homeOk = primaries === 1 && /Artists license their music directly/.test(headline) && /Licensed ✓ Proven on Bitcoin/.test(lic) && /^https:\/\/mutinynet\.com\/tx\/[0-9a-f]{64}$/.test(href ?? '') && /01-ava-rain\.mp3$/.test(fsrc);
console.log(homeOk ? '✓' : '✗', 'home: 1 primary button → licensed, proof link', href, fsrc.split('/').pop()); if (!homeOk) bad++;
const ch = async (c, sel, want) => { await p.goto(`${base}#/${c}`); await p.waitForTimeout(250); await p.locator('main button.min-h-14').first().click(); await p.waitForSelector(sel, { timeout: 30000 }); await p.waitForTimeout(300); const t = await p.locator('main').innerText(); const ok = want.every(w => w.test(t)); console.log(ok ? '✓' : '✗', 'chapter', c, want.map(String).join(' ')); if (!ok) { bad++; console.log(t.slice(0, 800)); } };
await ch('c1', '[data-testid=c1-result]', [/Signed by Ava/, /Jay, her producer, agreed/]);
await ch('c2', '[data-testid=c2-result]', [/No person had to click/, /fits the budget/]);
await ch('c3', '[data-testid=verdict]', [/This licence is real/]);
await p.getByRole('button', { name: /forged copy/ }).click(); await p.waitForFunction(() => document.querySelectorAll('[data-testid=verdict]').length === 2, null, { timeout: 20000 });
{ const t = await p.locator('main').innerText(); const ok = /Not valid: someone changed the offer after the artist signed it/.test(t); console.log(ok ? '✓' : '✗', 'chapter c3 forged copy → Not valid (plain reason)'); if (!ok) bad++; }
await p.getByRole('button', { name: /Show the 9 checks/ }).first().click(); { const n = await p.locator('[data-testid=verdict] ol li').count(); console.log(n >= 9 ? '✓' : '✗', 'verdict: 9 checks behind a tap', n); if (n < 9) bad++; }
await ch('c4', '[data-testid=c4-result]', [/now belongs to Harbour Music/, /Not valid: the artist had already sold the rights/]);
{ const v = await p.locator('[data-testid=verdict]').allInnerTexts(); const ok = v.length === 3 && /real/.test(v[0]) && /Not valid/.test(v[1]) && /real/.test(v[2]); console.log(ok ? '✓' : '✗', 'chapter c4: before ✓, old key ✗, new owner ✓'); if (!ok) bad++; }
await p.goto(`${base}#/hood`); await p.waitForTimeout(300); { const t = await p.locator('main').innerText(); const ok = /Explore all scenarios \(27\)/.test(t) && /Preimage/.test(t) && /OP_RETURN/.test(t) && /x402/.test(t) && /NWC/.test(t); console.log(ok ? '✓' : '✗', 'under the hood: 27 scenarios + glossary'); if (!ok) bad++; }
// Live page, real faucet wallets (only when LIVE=1)
if (process.env.LIVE) { await p.goto(`${base}#/live`); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Create all/ }).click(); await p.waitForFunction(() => !document.body.innerText.includes('missing)'), null, { timeout: 90000 });
  for (const name of [/Publish offer/, /Sign a licence request/, /Make invoice/, /Check and pay/, /Verify the licence/, /Pay the co-owners/]) { await p.getByRole('button', { name }).click(); await p.waitForFunction(() => !document.querySelector('.animate-spin'), null, { timeout: 60000 }); await p.waitForTimeout(300); }
  const t = await p.locator('main').innerText(); const liveOk = /Paid\. Preimage/.test(t) && /stopped at check 2/.test(t) && /Paid: Jay/.test(t); console.log(liveOk ? '✓' : '✗', 'live page: real pay, verify, payout'); if (!liveOk) { bad++; console.log(t.slice(0, 1500)); } }

// Music: preview before buying, real playback, unlock after 9/9, file-hash row
await p.goto(`${base}#/start`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
const bar = p.getByRole('region', { name: 'Music player' }); const pre = /30 s preview/.test(await bar.innerText());
await bar.getByRole('button', { name: 'Play' }).click(); await p.waitForTimeout(2500);
const prog = await bar.getByRole('slider').getAttribute('aria-valuenow'); const src1 = await p.evaluate(() => (window).lab?.music?.src ?? '');
await bar.getByRole('button', { name: 'Pause' }).click();
console.log(pre && Number(prog) >= 1 ? '✓' : '✗', 'player: preview plays', `t=${prog}s`, src1); if (!(pre && Number(prog) >= 1)) bad++;
await p.goto(`${base}#/s3`); await p.waitForTimeout(200); await p.getByRole('button', { name: /Set up all/ }).click(); await p.getByRole('button', { name: 'Run all steps' }).click({ timeout: 20000 });
await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 });
await p.getByRole('tab', { name: 'Nine Checks' }).click(); await p.waitForTimeout(300);
const fileRow = await p.locator('[data-testid=file-check]').first().innerText().catch(() => ''); const unlocked = /Licensed · full track/.test(await bar.innerText());
const src2 = await p.evaluate(() => (window).lab?.music?.src ?? '');
const ok3 = /match/.test(fileRow) && unlocked && /01-ava-rain\.mp3$/.test(src2); console.log(ok3 ? '✓' : '✗', 'S3 9/9 unlocks the full file; file row:', fileRow.replace(/\n/g, ' ').slice(0, 140), src2); if (!ok3) bad++;

for (const a of ['A1', 'A18', 'A12c', 'A20', 'A21', 'A22', 'A23']) { await p.goto(`${base}#/attack/${a}`); await p.waitForTimeout(800); await p.getByRole('button', { name: /Present to the verifier|Run the attack/ }).click(); await p.waitForTimeout(1500); console.log(a, (await p.locator('.fade-in').first().textContent())?.slice(0, 100)); }
console.log('page errors:', errs.length, errs.slice(0, 5)); await b.close(); process.exit(bad || errs.length ? 1 : 0);
