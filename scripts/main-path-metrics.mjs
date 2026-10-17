// Measures the main path headless: time to first licence (from navigation start), taps, words and jargon per page.
// Usage: URL=http://localhost:4180/ MODE=new node scripts/main-path-metrics.mjs   (MODE=old measures the earlier Home + chapters build)
// Also SCEN=1 to count jargon on all 27 scenario pages after "Run all steps". Writes JSON to stdout. Local only.
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const MODE = process.env.MODE ?? 'new';
export const JARGON = ['Nostr', 'relay', 'relays', 'node', 'nodes', 'NIP-\\d+', 'kind \\d+', '402', 'x402', 'preimage', 'NWC', 'binding', 'OP_RETURN', 'OpenTimestamps', 'invoice', 'invoices', 'hash', 'BOLT ?11', 'lntbs\\w*', 'secp256k1', 'merkle', 'npub', 'Mutinynet', 'signature', 'verifyLicence', 'bundle', 'event id', 'description hash', 'SHA-256'];
const RE = new RegExp(`\\b(${JARGON.join('|')})\\b`, 'gi');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = { mode: MODE, url: base, at: new Date().toISOString(), ttfl: {}, pages: {}, scenarios: {} };
async function count(p, label) { const r = await p.evaluate(src => { const re = new RegExp(src, 'gi'); const m = document.querySelector('main'); const all = m?.innerText ?? ''; const drawers = [...document.querySelectorAll('[data-testid=code-drawer]')].map(d => d.innerText).join('\n');
    const hits = (t) => (t.match(re) ?? []); const words = (t) => t.split(/\s+/).filter(Boolean).length; const ha = hits(all), hd = hits(drawers);
    return { words: words(all) - words(drawers), jargon: ha.length - hd.length, jargonInDrawer: hd.length, terms: [...new Set(ha.filter(x => !hd.includes(x)).map(x => x.toLowerCase()))], buttons: m ? [...m.querySelectorAll('button')].filter(x => x.offsetParent).length : 0 }; }, RE.source);
  out.pages[label] = r; return r; }
const fresh = async (vw = { width: 1440, height: 900 }) => { const p = await b.newPage({ viewport: vw }); await p.goto(base); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('ll.theme', 'dark'); }); return p; };
const navMs = p => p.evaluate(() => Math.round(performance.now()));
if (MODE === 'new') {
  for (const who of ['artist', 'buyer', 'builder']) { const p = await fresh(); await p.goto(base + '#/'); await p.reload(); await p.waitForSelector('[data-persona]'); let taps = 0;
    await p.click(`[data-persona=${who}]`); taps++;
    if (who === 'artist') { await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.getByRole('button', { name: /License for 100 sats/ }).click(); taps += 2; await p.waitForSelector('[data-testid=verdict]', { timeout: 30000 }); }
    if (who === 'buyer') { await p.getByRole('button', { name: /Let Scout buy/ }).click(); taps++; await p.waitForSelector('[data-testid=s2-one]', { timeout: 30000 }); }
    if (who === 'builder') { await p.click('[data-testid=license-this]'); taps++; await p.waitForSelector('[data-testid=verdict]', { timeout: 30000 }); }
    out.ttfl[who] = { ms: await navMs(p), taps }; await count(p, `home→first licence (${who})`); await p.close(); }
  const p = await fresh(); await p.goto(base + '#/'); await p.reload(); await p.waitForSelector('[data-persona]'); await count(p, 'Home');
  await p.click('[data-persona=artist]'); await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.getByRole('button', { name: /License for 100 sats/ }).click(); await p.waitForSelector('[data-testid=fanout]');
  await p.getByRole('button', { name: /Change the price/ }).click(); await p.getByRole('button', { name: /Change one byte/ }).click(); await p.waitForSelector('[data-testid=cheat-audio]'); await count(p, 'Stop 1 Hear it, license it');
  await p.click('[data-testid=next]'); await p.getByRole('button', { name: /Let Scout buy/ }).click(); await p.waitForSelector('[data-testid=s2-one]'); await p.getByRole('button', { name: /poisoned/ }).click(); await p.waitForSelector('[data-testid=cheat-poison]');
  const t0 = await navMs(p); await p.click('[data-testid=scale-go]'); await p.waitForSelector('[data-testid=verdict-scale]', { timeout: 120000 }); out.scaleMs = (await navMs(p)) - t0; await count(p, 'Stop 2 Agents buy at scale');
  await p.click('[data-testid=next]'); await p.click('[data-testid=license-this]'); await p.waitForSelector('[data-testid=verdict]'); await p.getByRole('button', { name: /ModelCo/ }).click(); await p.waitForSelector('text=Permission proven'); await p.getByRole('button', { name: /copycat/ }).click(); await p.waitForSelector('[data-testid=cheat-fake]'); await count(p, 'Stop 3 Anyone verifies');
  await p.click('[data-testid=next]'); for (const [n, sel] of [[/Sell the rights/, 'x-sale'], [/old account/, 'cheat-old'], [/heirs act/, 'x-succ'], [/new account/, 'x-stolen']]) { await p.getByRole('button', { name: n }).click(); await p.waitForSelector(`[data-testid=${sel}]`, { timeout: 30000 }); } await count(p, 'Extra Rights change hands');
  await p.goto(base + '#/'); await p.click('[data-persona=builder]'); await p.waitForTimeout(300); await count(p, 'Stop 3 (builder, drawer open)');
} else {
  const p = await fresh(); await p.goto(base + '#/'); await p.reload(); await p.getByRole('button', { name: /Hear "Rain"/ }).click(); await p.getByRole('button', { name: /License for 100 sats/ }).click(); await p.waitForSelector('[data-testid=licensed]', { timeout: 30000 });
  out.ttfl.home = { ms: await navMs(p), taps: 2 }; await count(p, 'Home');
  for (const c of ['c1', 'c2', 'c3', 'c4']) { await p.goto(`${base}#/${c}`); await p.waitForTimeout(250); await p.locator('main button.min-h-14').first().click(); await p.waitForTimeout(1500); if (c === 'c3') { await p.getByRole('button', { name: /forged copy/ }).click(); await p.waitForTimeout(1200); } await count(p, `Chapter ${c}`); }
}
if (process.env.SCEN) { const p = await fresh(); for (let i = 1; i <= 27; i++) { const id = `s${i}`; await p.goto(`${base}#/${id}`); await p.waitForTimeout(200); const s = p.getByRole('button', { name: /Set up all/ }); if (await s.count()) await s.click();
  await p.getByRole('button', { name: 'Run all steps' }).click({ timeout: 20000 }); await p.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent?.includes('Run all steps') && x.disabled) && !document.querySelector('.animate-spin'), null, { timeout: 60000 });
  const r = await p.evaluate(src => { const t = document.querySelector('main')?.innerText ?? ''; return { jargon: (t.match(new RegExp(src, 'gi')) ?? []).length, words: t.split(/\s+/).filter(Boolean).length }; }, RE.source); out.scenarios[id] = r; } }
console.log(JSON.stringify(out, null, 2)); await b.close();
