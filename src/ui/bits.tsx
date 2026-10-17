import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Copy, Check, Lightbulb, Play, Pause } from 'lucide-react';
import { persona } from '../engine/cast';
import { rainWav } from '../engine/track';
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export function Card({ children, className, ...p }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) { return <div {...p} className={cx('rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>{children}</div>; }
export function Button({ children, variant = 'primary', className, ...p }: { variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'subtle' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = { primary: 'bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-400', outline: 'border border-neutral-200 bg-white hover:bg-neutral-50 disabled:text-neutral-400', ghost: 'hover:bg-neutral-100 text-neutral-700', danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50', subtle: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800' }[variant];
  return <button {...p} className={cx('inline-flex items-center justify-center gap-2 rounded-md px-3 h-9 text-[13px] font-medium transition-colors disabled:cursor-not-allowed', v, className)}>{children}</button>;
}
export const COMPLEXITY_STYLE: Record<string, string> = { simplest: 'bg-neutral-900 text-white', easy: 'bg-neutral-800 text-white', medium: 'border border-neutral-300 text-neutral-700', advanced: 'border border-neutral-300 text-neutral-700', expert: 'border border-neutral-900 text-neutral-900' };
export function Pill({ children, className }: { children: ReactNode; className?: string }) { return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4', className)}>{children}</span>; }
export const BADGE: Record<string, { label: string; cls: string; tip: string }> = {
  real: { label: 'REAL CRYPTO', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', tip: 'Signed, hashed or verified for real by the protocol library in your browser.' },
  sim: { label: 'SIMULATED', cls: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200', tip: 'Money movement, network transport, Bitcoin blocks or an app step are simulated. The artefacts inside are still real.' },
  limit: { label: 'HONEST LIMIT', cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', tip: 'Something the protocol cannot do, shown openly.' },
  open: { label: 'OPEN ISSUE', cls: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300', tip: 'A known gap the protocol does not yet stop. Not hidden.' },
  fail: { label: 'CHECK FAILED', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', tip: 'A real check rejected this.' },
  recorded: { label: 'RECORDED PROOF', cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', tip: 'Replay of a real Mutinynet run.' },
};
export function TierBadge({ b }: { b?: string }) { const x = BADGE[b ?? 'sim']; return <span title={x.tip} className={cx('inline-flex shrink-0 items-center rounded px-1.5 py-[1px] text-[10px] font-semibold tracking-wide', x.cls)}>{x.label}</span>; }
export function Avatar({ id, size = 36, ring }: { id: string; size?: number; ring?: boolean }) { const p = persona(id); return <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-100', ring && 'ring-2 ring-white')} style={{ width: size, height: size, fontSize: size * 0.55 }} title={p.name}>{p.emoji}</span>; }
export function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [ok, setOk] = useState(false);
  return <div className="space-y-1"><div className="text-[11px] text-neutral-500">{label}</div>
    <div className="flex gap-2"><div className={cx('min-w-0 flex-1 truncate rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[12px]', mono && 'font-mono')} title={value}>{value}</div>
      {mono && value.length > 16 && <button aria-label={`Copy ${label}`} onClick={() => { navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); }} className="rounded-md border border-neutral-200 px-2 hover:bg-neutral-50">{ok ? <Check size={14} /> : <Copy size={14} />}</button>}</div></div>;
}
export function Bulb({ children, label = 'Learn more' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; addEventListener('click', f); return () => removeEventListener('click', f); }, []);
  return <span ref={ref} className="relative inline-flex"><button aria-label={label} onClick={() => setOpen(!open)} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200"><Lightbulb size={13} /></button>
    {open && <div className="fade-in absolute left-0 top-8 z-30 w-[360px] rounded-lg border border-neutral-200 bg-white p-4 text-[13px] leading-5 text-neutral-700 shadow-lg">{children}</div>}</span>;
}
/** Cover art for "Rain": generated, so there is no third-party image. */
export function Cover({ size = 40, className }: { size?: number; className?: string }) {
  const drops = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, l: 8 + (i % 4) * 4 })), []);
  return <svg viewBox="0 0 100 100" width={size} height={size} className={cx('rounded-md', className)} aria-label="Rain cover art"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#312e81" /><stop offset=".55" stopColor="#7c3aed" /><stop offset="1" stopColor="#0ea5e9" /></linearGradient></defs>
    <rect width="100" height="100" fill="url(#rg)" />{drops.map((d, i) => <line key={i} x1={d.x} y1={d.y} x2={d.x - 3} y2={d.y + d.l} stroke="white" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />)}
    <circle cx="70" cy="30" r="13" fill="white" fillOpacity=".15" /><text x="8" y="90" fontSize="17" fontWeight="700" fill="white" fontFamily="Inter, sans-serif">Rain</text></svg>;
}
let audioUrl: string | null = null;
export function Player({ compact }: { compact?: boolean }) {
  const [playing, setPlaying] = useState(false); const a = useRef<HTMLAudioElement | null>(null);
  const toggle = () => { if (!audioUrl) audioUrl = URL.createObjectURL(new Blob([rainWav() as BlobPart], { type: 'audio/wav' })); if (!a.current) { a.current = new Audio(audioUrl); a.current.onended = () => setPlaying(false); }
    if (playing) { a.current.pause(); setPlaying(false); } else { a.current.currentTime = 0; a.current.play().catch(() => {}); setPlaying(true); } };
  return <button onClick={toggle} aria-label={playing ? 'Pause Rain' : 'Play Rain'} className={cx('inline-flex items-center gap-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-700', compact ? 'h-6 w-6 justify-center' : 'h-8 px-3 text-[12px]')}>{playing ? <Pause size={12} /> : <Play size={12} />}{!compact && (playing ? 'Pause' : 'Play "Rain" (demo)')}</button>;
}
export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) { return <div><div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-semibold">{title}</h3>{right}</div>{children}</div>; }
