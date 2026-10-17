// Small shared pieces: tap-to-explain words, wallet cards with the coin animation, buttons.
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GLOSSARY, type Term as T } from './data/glossary';
import { CAST, usd, type Id } from './data/cast';
import { onMoves, world } from './actions';
import { useWorld } from './world';

// ---------- Tap-to-explain: the first time a term appears on a page it gets a dotted underline ----------
type Reg = { map: Map<string, string> };
export const TermScope = createContext<Reg>({ map: new Map() });
export const newScope = (): Reg => ({ map: new Map() });
function TermButton({ term, children }: { term: T; children: ReactNode }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLSpanElement>(null); const id = useId();
  useEffect(() => { if (!open) return; const off = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc); return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); }; }, [open]);
  return <span ref={ref} className="relative inline">
    <button type="button" className="term inline p-0 text-inherit" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{children}</button>
    {open && <span id={id} role="note" className="fade-in absolute left-0 top-full z-50 mt-1 block w-[min(280px,80vw)] rounded-xl border border-line bg-panel2 p-3 text-[13px] font-normal leading-snug text-soft shadow-xl"><b className="text-ink">{term.key[0].toUpperCase() + term.key.slice(1)}:</b> {term.text}</span>}
  </span>;
}
/** Text with glossary words made tappable (first use per page). `scope` "proof" also allows the Proof/Code-only words. */
export function Rich({ text, scope = 'main' }: { text: string; scope?: 'main' | 'proof' }) {
  const reg = useContext(TermScope); const me = useId(); const terms = GLOSSARY.filter(t => scope === 'proof' || !t.proofOnly);
  const parts: ReactNode[] = []; let rest = text; let k = 0; const used = new Set<string>();
  while (rest) { let best: { i: number; len: number; t: T } | null = null;
    for (const t of terms) { if (used.has(t.key)) continue; const owner = reg.map.get(t.key); if (owner && owner !== me + ':' + t.key) continue; const m = t.match.exec(rest); if (m && (!best || m.index < best.i)) best = { i: m.index, len: m[0].length, t }; }
    if (!best) { parts.push(rest); break; }
    parts.push(rest.slice(0, best.i)); const word = rest.slice(best.i, best.i + best.len); reg.map.set(best.t.key, me + ':' + best.t.key); used.add(best.t.key); parts.push(<TermButton key={k++} term={best.t}>{word}</TermButton>); rest = rest.slice(best.i + best.len); }
  return <>{parts}</>;
}

// ---------- Wallet cards ----------
function useCountUp(target: number) { const [v, setV] = useState(target); const from = useRef(target);
  useEffect(() => { const start = performance.now(); const a = from.current; if (a === target) return; const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; let raf = 0;
    const tick = (t: number) => { const p = reduce ? 1 : Math.min(1, (t - start) / 600); const x = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3))); setV(x); if (p < 1) raf = requestAnimationFrame(tick); else from.current = target; };
    raf = requestAnimationFrame(tick); return () => { cancelAnimationFrame(raf); from.current = target; }; }, [target]); return v; }
export function WalletCard({ id, compact }: { id: Id; compact?: boolean }) {
  useWorld(world); const p = CAST[id]; const bal = world.s.bal[id]; const shown = useCountUp(bal ?? 0); const last = useRef(bal); const [chip, setChip] = useState<{ d: number; k: number } | null>(null);
  useEffect(() => { if (bal !== undefined && last.current !== undefined && bal !== last.current) setChip({ d: bal - last.current, k: Date.now() }); last.current = bal; }, [bal]);
  return <div data-wallet={id} className={`relative shrink-0 rounded-2xl border border-line bg-panel px-3 py-2 ${compact ? 'min-w-[128px] max-w-[176px]' : 'min-w-[150px]'}`}>
    <div className="flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden className="text-[18px]">{p.emoji}</span><span className="text-[14px] font-semibold">{p.name}</span></div>
    <div className="truncate text-[12px] text-mute" title={p.role}>{p.role}</div>
    <div className={`mt-0.5 flex items-center gap-1.5 ${bal === undefined ? '' : 'whitespace-nowrap'}`}><span className="text-[16px] font-semibold tabular-nums" data-balance={id}>{bal === undefined ? <span className="block whitespace-normal text-[12px] font-normal leading-tight text-mute">{p.noWallet}</span> : usd(shown)}</span>
      {chip && <span key={chip.k} className={`chip rounded-full px-1.5 text-[12px] font-semibold tabular-nums ${chip.d > 0 ? 'bg-goodbg text-good' : 'bg-panel2 text-mute'}`}>{chip.d > 0 ? '+' : '−'}{usd(Math.abs(chip.d)).replace('−', '')}</span>}</div>
  </div>;
}
/** Coins fly from card to card when money moves (they fade in place with reduced motion). Also announces each payment. */
export function CoinLayer() {
  const [say, setSay] = useState('');
  useEffect(() => onMoves((moves) => { const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; const texts: string[] = [];
    moves.slice(0, 8).forEach((m, i) => { texts.push(`${CAST[m.to].name} received ${usd(m.cents)}.`);
      const a = document.querySelector(`main [data-wallet="${m.from}"]`), b = document.querySelector(`main [data-wallet="${m.to}"]`); if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); const c = document.createElement('div'); c.className = 'coin'; c.textContent = '$'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
      const x0 = ra.left + ra.width / 2 - 11, y0 = ra.top + ra.height / 2 - 11, x1 = rb.left + rb.width / 2 - 11, y1 = rb.top + rb.height / 2 - 11;
      const anim = reduce ? c.animate([{ opacity: 0, transform: `translate(${x1}px,${y1}px)` }, { opacity: 1, transform: `translate(${x1}px,${y1}px)` }, { opacity: 0, transform: `translate(${x1}px,${y1}px)` }], { duration: 700, delay: i * 250 })
        : c.animate([{ transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 40}px) scale(1)`, opacity: 1, offset: .5 }, { transform: `translate(${x1}px,${y1}px) scale(.7)`, opacity: 0 }], { duration: 750, delay: i * 250, easing: 'ease-in-out', fill: 'both' });
      anim.onfinish = () => c.remove(); });
    if (moves.length > 8) texts.splice(8, Infinity, `and ${moves.length - 8} more payments.`); setSay(texts.join(' ')); }), []);
  return <div aria-live="polite" className="sr-only">{say}</div>;
}
export function Primary({ children, onClick, disabled, busy, testid }: { children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; testid?: string }) {
  return <button type="button" data-primary="1" data-testid={testid} onClick={onClick} disabled={disabled || busy} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-[15px] font-semibold text-accentink shadow-sm transition hover:brightness-110 disabled:opacity-70 ${busy ? 'pulse' : ''}`}>{children}</button>;
}
export function Secondary({ children, onClick, disabled, dashed, label }: { children: ReactNode; onClick?: () => void; disabled?: boolean; dashed?: boolean; label?: string }) {
  return <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[14px] font-medium text-ink transition hover:bg-panel2 disabled:opacity-50 ${dashed ? 'border-dashed border-warn/70' : 'border-line'}`}>{children}</button>;
}
export function useScrollIntoViewOnce(dep: unknown, ref: React.RefObject<HTMLElement | null>) { useLayoutEffect(() => { if (dep) ref.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [dep]); }
