// Music: the owner's tracks from public/music (tracks.json made by `npm run music`), one shared <audio>, preview vs licensed full track.
import { useSyncExternalStore } from 'react';
import { registerTrackFile } from '../engine/track';
import { rainWav } from '../engine/track';
import { sha256hex } from '../lib/mll/util';
export interface Track { id: string; file: string; mime: string; bytes: number; sha256: string; durationSec: number | null; preview: string; previewSha256: string; artwork: string | null; title: string; artist: string; licence: string; source: string; notes: string; cast: string; demoTitle: string }
export interface Unlock { how: string; at: number; fileOk?: boolean; holder?: string }
const subs = new Set<() => void>(); let v = 0; const bump = () => { v++; subs.forEach(f => f()); };
export const useMusic = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => v);
const base = './music/';
let tracks: Track[] = []; let heroId: string | null = null; let loaded = false; let heroStatus = 'not loaded';
let audio: HTMLAudioElement | null = null; let current: string | null = null; let mode: 'preview' | 'full' | 'tone' = 'preview'; let toneUrl: string | null = null;
const UKEY = 'll.unlocked'; const unlocks = (): Record<string, Unlock> => { try { return JSON.parse(localStorage.getItem(UKEY) ?? '{}'); } catch { return {}; } };
function el() { if (!audio) { audio = new Audio(); audio.preload = 'metadata'; for (const e of ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended']) audio.addEventListener(e, bump); } return audio; }
export const music = {
  /** Load tracks.json and the hero file's bytes; register the hero (and remix, Dave) with the engine so offers bind to their hashes. */
  async load() {
    try { const r = await fetch(base + 'tracks.json', { cache: 'no-cache' }); if (r.ok) { const j = await r.json(); tracks = j.tracks ?? []; heroId = j.hero ?? null; } } catch {}
    const hero = tracks.find(t => t.id === heroId);
    if (hero) { try { const b = new Uint8Array(await (await fetch(base + hero.file)).arrayBuffer()); registerTrackFile({ role: 'rain', sha256: hero.sha256, label: `${hero.file} (${(hero.bytes / 1e6).toFixed(1)} MB)`, bytes: b }, sha256hex); heroStatus = 'hash checked'; }
      catch (e: any) { heroStatus = `not used: ${e.message}`; } }
    for (const [cast, role] of [['frank', 'remix'], ['dave', 'dave']] as const) { const t = tracks.find(x => x.cast === cast); if (t) registerTrackFile({ role, sha256: t.sha256, label: t.file }); }
    loaded = true; bump();
  },
  get loaded() { return loaded; }, get tracks() { return tracks; }, get heroStatus() { return heroStatus; },
  hero: () => tracks.find(t => t.id === heroId), byId: (id?: string | null) => tracks.find(t => t.id === id), byCast: (c: string) => tracks.find(t => t.cast === c) ?? tracks.find(t => t.id === heroId),
  bySha: (h?: string) => tracks.find(t => t.sha256 === h),
  current: () => tracks.find(t => t.id === current), get mode() { return mode; }, get currentId() { return current; },
  unlocked: (id?: string | null) => (id ? unlocks()[id] : undefined),
  unlock(id: string | undefined, u: Omit<Unlock, 'at'>) { if (!id) return; try { localStorage.setItem(UKEY, JSON.stringify({ ...unlocks(), [id]: { ...u, at: Date.now() } })); } catch {} if (current === id && mode === 'preview') { const was = !el().paused; this.select(id); if (was) el().play().catch(() => {}); } bump(); },
  relock(id: string) { const u = unlocks(); delete u[id]; try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch {} if (current === id) this.select(id); bump(); },
  select(id?: string | null) { const a = el(); const t = tracks.find(x => x.id === id) ?? this.hero();
    if (!t) { if (!toneUrl) toneUrl = URL.createObjectURL(new Blob([rainWav() as BlobPart], { type: 'audio/wav' })); current = null; mode = 'tone'; a.src = toneUrl; bump(); return; }
    const full = !!this.unlocked(t.id); current = t.id; mode = full ? 'full' : 'preview'; a.src = base + (full ? t.file : t.preview); bump(); },
  isPlaying: (id?: string | null) => !!audio && !audio.paused && (id === undefined || id === current || (!id && mode === 'tone')),
  async toggle(id?: string | null) { const a = el(); const want = id ?? current; if (!a.src || (want && want !== current) || (!want && mode !== 'tone' && !current)) this.select(want); if (a.paused) await a.play().catch(() => {}); else a.pause(); bump(); },
  seek(frac: number) { const a = el(); if (a.duration) a.currentTime = frac * a.duration; },
  src: () => audio?.src ?? '',
  time: () => ({ t: audio?.currentTime ?? 0, d: audio && isFinite(audio.duration) ? audio.duration : 0 }),
};
