// Measures the Under the hood landing page (old and new): visible list items, groups, words, jargon, and whether a "start here" item exists.
// Usage: URL=https://welliv.github.io/licence-lab/next/ TAG=before|after [W=390] node scripts/hood-measure.mjs
import { chromium } from 'playwright';
const base = process.env.URL ?? 'http://localhost:4180/'; const tag = process.env.TAG ?? 'after'; const W = Number(process.env.W ?? 1440); const sfx = W < 600 ? `-m${W}` : ''; const out = 'screenshots/under-the-hood/';
const JARGON = ['sats?','satoshis?','Nostr','relays?','nodes?','NIP-\\d+','kind \\d+','402','x402','preimage','NWC','binding','OP_RETURN','OpenTimestamps','invoices?','hash','BOLT ?11','secp256k1','merkle','npub','Mutinynet','signatures?','signed','verifyLicence','bundle','fingerprint','SHA-256','faucet','Lightning','key','keys','chain','block','ledger'];
const RE = `\\b(${JARGON.join('|')})\\b`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: W < 600 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(base + '?fresh=1#/hood'); await p.waitForTimeout(1500);
const text = sel => p.evaluate(([s, re]) => { const el = document.querySelector(s); if (!el) return null; const c = el.cloneNode(true); c.querySelectorAll('footer,details:not([open]) > :not(summary)').forEach(f => f.remove()); document.body.appendChild(c); c.style.cssText = 'position:absolute;left:-99999px;width:' + el.clientWidth + 'px'; const t = c.innerText; c.remove();
  const hits = t.match(new RegExp(re, 'gi')) ?? []; return { words: t.split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length, jargon: hits.length, terms: [...new Set(hits.map(h => h.toLowerCase()))].join(',') }; }, [sel, RE]);
const R = { tag, width: W, url: base };
R.landing = await text('main');
R.sidebarVisible = await p.evaluate(() => { const n = document.querySelector('nav[aria-label=Scenarios]'); if (!n) return null; const r = n.getBoundingClientRect(); return r.width > 0 && r.right > 0; });
R.sidebar = await text('nav[aria-label=Scenarios]');
R.sidebarButtons = await p.locator('nav[aria-label=Scenarios] button:visible').count();
R.groupHeadings = await p.locator('nav[aria-label=Scenarios] [data-group-title]').count();
R.numberedItems = await p.locator('nav[aria-label=Scenarios] [data-guide-n]').count();
R.startHere = await p.locator('[data-testid=start-here]').count();
R.landingButtons = await p.locator('main button:visible, main a:visible').count();
await p.screenshot({ path: `${out}${tag}${sfx}-landing.png`, fullPage: false });
const h = await p.evaluate(() => document.querySelector('main')?.scrollHeight ?? 900); await p.setViewportSize({ width: W, height: Math.min(6000, h + 60) }); await p.waitForTimeout(200); await p.screenshot({ path: `${out}${tag}${sfx}-landing-full.png` });
R.pageErrors = errs; console.log(JSON.stringify(R)); await b.close();
