// Walks the artist path (Home → Stop 1 → Stop 2 → Stop 3 → end) and measures taps, words, jargon per stop. Works on the old and new /next/.
// Usage: URL=https://welliv.github.io/licence-lab/next/ TAG=before|after [W=390] [REAL=0] node scripts/vision-measure.mjs
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const tag = process.env.TAG ?? 'after'; const W = Number(process.env.W ?? 1440); const real = process.env.REAL ?? '1';
const out = 'screenshots/vision-fix/'; const sfx = W < 600 ? `-m${W}` : '';
const JARGON = ['sats?','satoshis?','Nostr','relays?','nodes?','NIP-\\d+','kind \\d+','402','x402','preimage','NWC','binding','OP_RETURN','OpenTimestamps','invoices?','hash','BOLT ?11','secp256k1','merkle','npub','Mutinynet','signatures?','signed','verifyLicence','bundle','fingerprint','SHA-256','faucet','Lightning','key','keys','chain','block','agent','ledger'];
const RE = `\\b(${JARGON.join('|')})\\b`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: W < 600 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const measure = async () => p.evaluate(src => { const m = document.querySelector('main'); const clone = m.cloneNode(true); clone.querySelectorAll('footer').forEach(f => f.remove()); document.body.appendChild(clone); clone.style.cssText = 'position:absolute;left:-99999px;width:' + m.clientWidth + 'px'; const t = clone.innerText; clone.remove();
  const hits = t.match(new RegExp(src, 'gi')) ?? []; const noAgent = hits.filter(h => !/^agents?$/i.test(h)); return { words: t.split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length, jargon: hits.length, jargonExclAgent: noAgent.length, terms: [...new Set(hits.map(h => h.toLowerCase()))].join(',') }; }, RE);
const tall = async (name) => { const h = await p.evaluate(() => document.querySelector('main')?.scrollHeight ?? 900); await p.setViewportSize({ width: W, height: Math.max(W < 600 ? 844 : 900, h + 140) }); await p.waitForTimeout(250); await p.screenshot({ path: `${out}${tag}${sfx}-${name}.png` }); await p.setViewportSize({ width: W, height: W < 600 ? 844 : 900 }); };
const click = async (sels, timeout = 4000) => { for (const s of sels) { const l = p.locator(s).first(); if (await l.count()) { await l.click({ timeout }); return s; } } throw new Error('none of ' + sels.join(' | ')); };
const res = { tag, width: W, url: base, stops: {} }; let taps = 0;
await p.goto(base + `?fresh=1${real === '0' ? '&real=0' : ''}`); await p.waitForSelector('[data-persona=artist]'); res.stops.home = await measure();
await p.click('[data-persona=artist]'); taps++; await p.waitForSelector('[data-stop=stop1]'); await p.waitForTimeout(600);
res.stops.stop1 = { before: await measure() }; await tall('stop1-before');
let t0 = Date.now(); await click(['[data-testid=buy]']); taps++; await p.waitForSelector('[data-testid=next]', { timeout: 120000 }); res.stops.stop1.secondsToPayoff = (Date.now() - t0) / 1000; res.stops.stop1.tapsFromHome = taps; await p.waitForTimeout(2200);
res.stops.stop1.after = await measure(); await tall('stop1-payoff');
await click(['[data-testid=next]']); await p.waitForSelector('[data-stop=stop2]'); await p.waitForTimeout(500); res.stops.stop2 = { before: await measure() }; await tall('stop2-before'); let s2taps = 0;
if (await p.locator('[data-testid=clip-go]').count()) { await click(['[data-testid=clip-go]']); s2taps++; await p.waitForSelector('[data-testid=clip-done]', { timeout: 120000 }); await click(['[data-testid=sub-go]']); s2taps++; await p.waitForSelector('[data-testid=sub-done]', { timeout: 120000 }); }
else { await p.getByRole('button', { name: /Let Bob's agent buy a licence/ }).click(); s2taps++; await p.waitForSelector('[data-testid=s2-one]'); await click(['[data-testid=scale-go]']); s2taps++; await p.waitForSelector('[data-testid=verdict-scale]', { timeout: 120000 }); }
await p.waitForTimeout(1800); res.stops.stop2.taps = s2taps; res.stops.stop2.after = await measure(); await tall('stop2-after');
await click(['[data-testid=next]']); await p.waitForSelector('[data-stop=stop3]'); await p.waitForTimeout(400); res.stops.stop3 = { before: await measure() };
await click(['[data-testid=check-go]', '[data-testid=license-this]']); res.stops.stop3.taps = 1; await p.waitForSelector('[data-testid=verdict]'); await p.waitForTimeout(800); res.stops.stop3.after = await measure(); await tall('stop3-after');
res.nextSteps = await p.evaluate(() => [...document.querySelectorAll('[data-testid=next-steps] a, [data-testid=next-steps] button')].map(x => x.innerText.trim()).filter(Boolean));
res.pageErrors = errs; console.log(JSON.stringify(res)); await b.close();
