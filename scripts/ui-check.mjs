// Drives every scenario in a real browser: set up all parties, run all steps, check each step behaved as described.
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
let bad = 0; const ids = Array.from({ length: 27 }, (_, i) => `s${i + 1}`); await p.goto(base); await p.evaluate(() => localStorage.setItem('ll.theme', 'dark'));
for (const id of ids) {
  await p.goto(`${base}#/${id}`); await p.waitForTimeout(150);
  await p.getByRole('button', { name: 'Run all steps' }).waitFor({ timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('button[disabled]')?.textContent?.includes('Run all') || true);
  await p.waitForTimeout(100); await p.getByRole('button', { name: 'Run all steps' }).click();
  await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 });
  const res = await p.evaluate(() => { const cards = [...document.querySelectorAll('[data-testid^=step-]')]; return { n: cards.length, good: cards.filter(c => c.querySelector('.lucide-circle-check-big, .lucide-circle-check, .lucide-check-circle-2')).length, err: cards.filter(c => c.textContent.includes('Error:')).map(c => c.textContent.slice(0, 120)) }; });
  const ok = res.n > 0 && res.good === res.n && !res.err.length; if (!ok) bad++;
  console.log(ok ? '✓' : '✗', id, `${res.good}/${res.n}`, res.err.join(' | '));
}

// Free play: on a fresh S3, press step 5 first. It must show a guard, not an error. No set-up gate: the cast is set up silently.
await p.goto(`${base}#/start`); await p.evaluate(() => localStorage.clear()); await p.goto(`${base}#/s3`); await p.reload(); await p.waitForTimeout(200);
await p.getByRole('button', { name: 'Run all steps' }).waitFor(); await p.waitForTimeout(400);
{ const t = await p.locator('main').innerText(); const tabs = await p.getByRole('tab').allInnerTexts(); const sel = await p.locator('[role=tab][aria-selected=true]').innerText();
  const ok = !/Set up all|Create test party|Nostr key/.test(t) && (await p.locator('[data-testid=cast-strip]').count()) === 1 && tabs.length === 3 && /What happened/.test(sel);
  console.log(ok ? '✓' : '✗', 'scenario page: no set-up gate, cast strip, 3 tabs, opens on "What happened"', tabs.join(' / ')); if (!ok) bad++; }
const s3 = await p.locator('[data-testid^=step-]').nth(4); await s3.getByRole('button').first().click(); await p.waitForTimeout(500);
const g = (await s3.textContent()) ?? ''; const guardOk = /Not yet|Refused/.test(g) && !g.includes('Error:'); console.log(guardOk ? '✓' : '✗', 'free play guard:', g.match(/(Not yet|Refused)[^.]*\./)?.[0]); if (!guardOk) bad++;
// ---------- Main path ----------
const T = (cond, label) => { console.log(cond ? '✓' : '✗', label); if (!cond) bad++; };
const main = () => p.locator('main').innerText();
await p.goto(`${base}#/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
T((await p.locator('[data-persona]').count()) === 3 && /Artists license their music directly/.test(await p.locator('h1').innerText()), 'home: headline + one choice of three');
await p.click('[data-persona=artist]'); await p.waitForTimeout(300); T(/#\/stop1$/.test(p.url()) && /Your song, licensed in seconds/.test(await main()), 'artist → stop 1 framed as selling');
await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.waitForTimeout(800);
await p.getByRole('button', { name: /License for 100 sats/ }).click(); await p.waitForSelector('[data-testid=fanout]', { timeout: 30000 }); await p.waitForTimeout(1300);
{ const v = await p.locator('[data-testid=verdict]').first().innerText(); const href = await p.locator('[data-testid=proof-link]').first().getAttribute('href'); const note = await p.locator('[data-testid=proven]').first().innerText();
  const shares = await Promise.all(['alice', 'carol', 'dave'].map(k => p.locator(`[data-testid=share-${k}]`).innerText())); const fsrc = await p.evaluate(() => window.lab?.music?.src ?? '');
  T(/Licensed/.test(v) && /Proven on Bitcoin/.test(note) && /practice chain/.test(note) && /^https:\/\/mutinynet\.com\/tx\/[0-9a-f]{64}$/.test(href ?? ''), 'stop 1: Licensed ✓ Proven on Bitcoin, real Mutinynet link with the practice-chain note beside it');
  T(shares.join(',') === '65,20,15' && /01-alice-rain\.mp3$/.test(fsrc) && /Full track/.test(await p.locator('[data-testid=track-state]').innerText()), `stop 1: full track unlocks; 100 sats fans out ${shares.join('/')}`); }
await p.getByRole('button', { name: /Change the price/ }).click(); await p.waitForSelector('[data-testid=cheat-price]'); await p.getByRole('button', { name: /Change one byte/ }).click(); await p.waitForSelector('[data-testid=cheat-audio]', { timeout: 20000 });
T(/someone changed the offer/.test(await p.locator('[data-testid=cheat-price]').innerText()) && /Not the licensed file/.test(await p.locator('[data-testid=cheat-audio]').innerText()) && /fingerprint matches the offer/.test(await p.locator('[data-testid=cheat-audio]').innerText()), 'stop 1 try to cheat: price edit and one changed byte both fail');
await p.click('[data-testid=next]'); await p.waitForTimeout(200); T(/#\/stop2$/.test(p.url()), 'Next → stop 2');
await p.getByRole('button', { name: /Let Bob's agent buy/ }).click(); await p.waitForSelector('[data-testid=s2-one]');
await p.getByRole('button', { name: /poisoned/ }).click(); await p.waitForSelector('[data-testid=cheat-poison]'); T(/Blocked: order ignored/.test(await p.locator('[data-testid=cheat-poison]').innerText()) && /0 sats/.test(await p.locator('[data-testid=cheat-poison]').innerText()), 'stop 2 try to cheat (A7): poisoned prompt refused, 0 sats paid');
await p.click('[data-testid=scale-go]'); await p.waitForSelector('[data-testid=counter]', { timeout: 5000 }).catch(() => {}); await p.waitForSelector('[data-testid=verdict-scale]', { timeout: 120000 });
{ const t = await p.locator('[data-testid=verdict-scale]').innerText(); T(/1,000 licences ✓ inside budget/.test(t) && /20 of 20/.test(t) && /100,100 of 150,000/.test(t), 'stop 2: 1,000 licences, one timestamp, inside budget, sample re-checked'); }
await p.click('[data-testid=next]'); await p.waitForTimeout(200); T(/#\/stop3$/.test(p.url()), 'Next → stop 3');
await p.click('[data-testid=license-this]'); await p.waitForSelector('[data-testid=verdict]'); T(/This licence is real/.test(await p.locator('[data-testid=verdict]').innerText()) && (await p.locator('[data-testid=practice-note]').count()) === 1, 'stop 3: "License this" button → one verdict, proof link + practice note');
await p.getByRole('button', { name: /ModelCo/ }).click(); await p.waitForSelector('text=Permission proven'); await p.getByRole('button', { name: /copycat/ }).click(); await p.waitForSelector('[data-testid=cheat-fake]');
T(/Fake ✗ Caught/.test(await p.locator('[data-testid=cheat-fake]').innerText()) && (await p.locator('[data-testid=finale]').count()) === 1, 'stop 3: regulator proof; "Alice Official" caught; finale offers the extra');
await p.click('[data-testid=next]'); for (const [n, sel] of [[/Show what happens/, 'x-stolen'], [/old account/, 'cheat-old']]) { await p.getByRole('button', { name: n }).click(); await p.waitForSelector(`[data-testid=${sel}]`, { timeout: 60000 }); }
{ const v = async id => p.locator(`[data-testid=${id}]`).innerText(); T(/real/.test(await v('verdict-earlier')) && /real/.test(await v('verdict-harbour')) && /already sold/.test(await v('cheat-old')) && /keeps paying/.test(await v('verdict-heirs')) && /retired after a theft/.test(await v('verdict-thief')) && /real/.test(await v('verdict-before-theft')), 'extra: sale ✓, old account ✗ (A23), heirs 2 of 3 ✓, stolen key ✗, earlier licences ✓'); }
T((await p.locator('main button:visible').count()) <= 4, `extra: at most 4 buttons (${await p.locator('main button:visible').count()})`);
await p.evaluate(() => { location.hash = '/stop1'; }); await p.waitForSelector('[data-testid=verdict]'); await p.getByRole('button', { name: /Show the 9 checks/ }).first().click(); T((await p.locator('[data-testid=verdict] ol li').count()) >= 9, 'verdict: 9 checks behind a tap');
// persona order, remembered, changeable
await p.reload(); await p.goto(`${base}#/`); await p.waitForTimeout(300); T((await p.locator('[data-persona=artist].border-neutral-900').count()) === 1, 'choice remembered after reload');
await p.click('[data-persona=buyer]'); await p.waitForTimeout(300); T(/#\/stop2$/.test(p.url()) && /Stop 1 of 3/i.test(await main()), 'buyer → agents stop first');
await p.goto(`${base}#/`); await p.click('[data-persona=builder]'); await p.waitForTimeout(300); T(/#\/stop3$/.test(p.url()), 'builder → verify stop first');
await p.click('[data-testid=license-this]'); await p.waitForSelector('[data-testid=verdict]', { timeout: 30000 }); T((await p.locator('[data-testid=code-drawer]').count()) === 1, 'builder: code drawer open by default');
await p.goto(`${base}#/hood`); await p.waitForTimeout(300); { const t = await main(); const n = await p.locator('[data-testid=hood-groups] li button').count(); const groups = await p.locator('[data-group]').count();
  T(groups === 9 && /Getting set up/.test(t) && /Honest limits/.test(t) && /Try to break it/.test(t) && (await p.locator('[data-testid=s22-line]').count()) === 1 && /Preimage/.test(t) && /x402/.test(t), `under the hood: 9 groups, ${n} links, S22 as one line, glossary`); }
await p.goto(`${base}#/redteam`); await p.waitForTimeout(300); { const t = await main(); const nums = await p.locator('[data-attack] span.tabular-nums').allInnerTexts();
  T((await p.locator('[data-game-group]').count()) === 5 && nums.join(',') === Array.from({ length: 24 }, (_, i) => i + 1).join(',') && !/Expected|level \d|check \d/.test(t), 'red team: 5 groups, numbered 1–24 with no gaps, no result shown before trying'); }
await p.click('[data-attack=A1]'); await p.waitForTimeout(800); T(!/expected|Blocked/.test(await main()), 'attack page: no expected result before trying');
await p.getByRole('button', { name: /Present to the verifier/ }).click(); await p.waitForTimeout(1200); T(/Blocked by check 1/.test(await main()) && /Lab expected this/.test(await main()), 'attack page: result and expectation after trying');
// user-test kit: only with ?test=1; local only
await p.goto(`${base}#/`); await p.waitForTimeout(300); T((await p.locator('[data-testid=test-panel]').count()) === 0, 'test panel hidden without ?test=1');
// Live page, real faucet wallets (only when LIVE=1)
if (process.env.LIVE) { await p.goto(`${base}#/live`); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Create all/ }).click(); await p.waitForFunction(() => !document.body.innerText.includes('missing)'), null, { timeout: 90000 });
  for (const name of [/Publish offer/, /Sign a licence request/, /Make invoice/, /Check and pay/, /Verify the licence/, /Pay the co-owners/]) { await p.getByRole('button', { name }).click(); await p.waitForFunction(() => !document.querySelector('.animate-spin'), null, { timeout: 60000 }); await p.waitForTimeout(300); }
  const t = await p.locator('main').innerText(); const liveOk = /Paid\. Preimage/.test(t) && /stopped at check 2/.test(t) && /Paid: Carol/.test(t); console.log(liveOk ? '✓' : '✗', 'live page: real pay, verify, payout'); if (!liveOk) { bad++; console.log(t.slice(0, 1500)); } }

// Music: preview before buying, real playback, unlock after 9/9, file-hash row
await p.goto(`${base}#/start`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
const bar = p.getByRole('region', { name: 'Music player' }); const pre = /30 s\s*preview/.test(await bar.innerText());
await bar.getByRole('button', { name: 'Play' }).click(); await p.waitForTimeout(2500);
const prog = await bar.getByRole('slider').getAttribute('aria-valuenow'); const src1 = await p.evaluate(() => (window).lab?.music?.src ?? '');
await bar.getByRole('button', { name: 'Pause' }).click();
console.log(pre && Number(prog) >= 1 ? '✓' : '✗', 'player: preview plays', `t=${prog}s`, src1); if (!(pre && Number(prog) >= 1)) bad++;
await p.goto(`${base}#/s3`); await p.waitForTimeout(200); await p.getByRole('button', { name: 'Run all steps' }).click({ timeout: 20000 });
await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 });
await p.getByRole('tab', { name: 'Nine checks' }).click(); await p.waitForTimeout(300);
const fileRow = await p.locator('[data-testid=file-check]').first().innerText().catch(() => ''); const unlocked = /Licensed\s*·\s*full track/.test(await bar.innerText());
const src2 = await p.evaluate(() => (window).lab?.music?.src ?? '');
const ok3 = /match/.test(fileRow) && unlocked && /01-alice-rain\.mp3$/.test(src2); console.log(ok3 ? '✓' : '✗', 'S3 9/9 unlocks the full file; file row:', fileRow.replace(/\n/g, ' ').slice(0, 140), src2); if (!ok3) bad++;

for (const a of ['A1', 'A18', 'A12c', 'A20', 'A21', 'A22', 'A23']) { await p.goto(`${base}#/attack/${a}`); await p.waitForTimeout(800); await p.getByRole('button', { name: /Present to the verifier|Run the attack/ }).click(); await p.waitForTimeout(1500); console.log(a, (await p.locator('.fade-in').first().textContent())?.slice(0, 100)); }
{ await p.goto(`${base}?test=1#/`); await p.evaluate(() => localStorage.removeItem('ll.test.current')); await p.reload(); await p.waitForTimeout(400); await p.click('[data-persona=artist]'); await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.getByRole('button', { name: /License for 100 sats/ }).click(); await p.waitForSelector('[data-testid=fanout]', { timeout: 30000 });
  const j = JSON.parse(await p.evaluate(() => window.__testkit?.exportJson() ?? '{}')); const c = j.sessions?.at(-1); console.log(c?.firstLicenceMs > 0 && c.stops.stop1 > 0 ? '✓' : '✗', 'test kit (?test=1): local timer recorded time-to-first-licence', c?.firstLicenceMs, 'ms'); if (!(c?.firstLicenceMs > 0)) bad++; }
console.log('page errors:', errs.length, errs.slice(0, 5)); await b.close(); process.exit(bad || errs.length ? 1 : 0);
