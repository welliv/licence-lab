import { useEffect, useState } from 'react';
import { Play, Pause, Lock, CheckCircle2, Music2, X } from 'lucide-react';
import { music, useMusic, type Track } from './music';
import { persona } from '../engine/cast';
import { Cover, cx } from './bits';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const coverColours = (cast: string) => { const c = persona(cast).colour; return ['#111827', c, '#0ea5e9']; };
export function Art({ t, size }: { t?: Track; size: number }) {
  return t?.artwork ? <img src={`./music/${t.artwork}`} width={size} height={size} className="shrink-0 rounded-md object-cover" alt={`${t.demoTitle} artwork`} /> : <Cover size={size} title={t?.demoTitle ?? 'Rain'} colours={t && t.cast !== 'ava' ? coverColours(t.cast) : undefined} />;
}
/** Dark mini-player, always dark (whatever the theme), pinned under the page. */
export function MiniPlayer() {
  useMusic(); const [, tick] = useState(0); const [credits, setCredits] = useState(false);
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(i); }, []);
  const t = music.current() ?? music.hero(); const u = music.unlocked(t?.id); const { t: now, d } = music.time(); const playing = music.isPlaying(t?.id ?? null) || (music.mode === 'tone' && music.isPlaying());
  return <div className="border-t border-white/10 bg-[#0a0a0d] text-[#f3f4f6]" role="region" aria-label="Music player">
    <div className="flex flex-wrap items-center gap-3 px-4 py-2">
      <Art t={t} size={42} />
      <div className="min-w-0 w-[230px]"><div className="truncate text-[13px] font-semibold">{t ? `${t.demoTitle}` : 'Rain'} <span className="font-normal text-[#9ca3af]">· {persona(t?.cast ?? 'ava').name} (demo name)</span></div>
        <div className="truncate text-[11px] text-[#9ca3af]" title={t ? `${t.title} — ${t.artist} — ${t.licence}` : ''}>{t ? `Real recording: ${t.file} · ${t.artist}` : 'No music yet: placeholder tone. Add files to public/music/'}</div></div>
      <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => music.toggle(t?.id ?? null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:bg-[#e5e7eb]">{playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}</button>
      <div className="flex min-w-[200px] flex-1 items-center gap-2 text-[11px] tabular-nums text-[#9ca3af]"><span>{fmt(now)}</span>
        <div role="slider" aria-label="Seek" aria-valuenow={Math.round(now)} aria-valuemax={Math.round(d)} tabIndex={0} className="group relative h-1.5 flex-1 cursor-pointer rounded bg-white/15" onClick={e => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); music.seek((e.clientX - r.left) / r.width); }}>
          <div className="absolute inset-y-0 left-0 rounded bg-white" style={{ width: d ? `${(now / d) * 100}%` : 0 }} /></div><span>{fmt(d)}</span></div>
      {t ? (u ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-[#6ee7b7]" title={u.how}><CheckCircle2 size={12} />Licensed · full track</span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-[#d1d5db]" title="Buy a licence (scenario 3 or Live test wallets) to unlock the full track"><Lock size={11} />30 s preview</span>) : <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-[#d1d5db]">placeholder tone</span>}
      {music.tracks.length > 1 && <select aria-label="Choose track" value={t?.id ?? ''} onChange={e => { const was = playing; music.select(e.target.value); if (was) music.toggle(e.target.value); }} className="h-8 rounded-md border border-white/15 bg-[#16171b] px-2 text-[12px] text-[#f3f4f6]">{music.tracks.map(x => <option key={x.id} value={x.id}>{x.demoTitle} · {persona(x.cast).name}</option>)}</select>}
      <button onClick={() => setCredits(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-[#d1d5db] hover:bg-white/10"><Music2 size={13} />Credits</button>
    </div>
    {credits && <Credits onClose={() => setCredits(false)} />}
  </div>;
}
export function Credits({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}><div className="max-h-[80vh] w-full max-w-[760px] overflow-auto rounded-xl border border-neutral-200 bg-white p-5 text-neutral-800" onClick={e => e.stopPropagation()} role="dialog" aria-label="Music credits">
    <div className="mb-2 flex items-center justify-between"><h2 className="text-[16px] font-semibold">Music credits</h2><button aria-label="Close" onClick={onClose}><X size={16} /></button></div>
    <p className="mb-3 text-[13px] text-neutral-600">Ava, "Rain", Nova, Jay, Lena and Kai are demo names. They are attached to real recordings supplied by the owner of this Lab. The full list is in <code>public/music/CREDITS.md</code>.</p>
    {!music.tracks.length ? <p className="text-[13px] text-neutral-500">No tracks yet. Add audio files to <code>public/music/</code> and run <code>npm run music</code>.</p> :
      <table className="w-full text-[12px]"><thead><tr className="text-left text-neutral-500"><th className="py-1">Demo name</th><th>File</th><th>Title / artist</th><th>Licence</th><th>SHA-256</th></tr></thead><tbody>{music.tracks.map(t => <tr key={t.id} className="border-t border-neutral-100 align-top"><td className="py-1.5 pr-2">{t.demoTitle}<div className="text-neutral-500">{persona(t.cast).name}</div></td><td className="pr-2 font-mono">{t.file}<div className="text-neutral-500">{t.durationSec ? fmt(t.durationSec) : ''} · {(t.bytes / 1e6).toFixed(1)} MB</div></td><td className="pr-2">{t.title}<div className="text-neutral-500">{t.artist}</div></td><td className="pr-2">{t.licence}{t.source && <div className="text-neutral-500">{t.source}</div>}</td><td className="break-all font-mono text-[10px] text-neutral-500">{t.sha256}</td></tr>)}</tbody></table>}</div></div>;
}
