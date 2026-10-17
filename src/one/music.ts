// Light music layer: the track list (a tiny JSON) and one shared <audio> that loads nothing until you press play.
import { useSyncExternalStore } from 'react';
export interface Track { id: string; file: string; bytes: number; sha256: string; durationSec: number | null; preview: string; previewSha256: string; cast: string; demoTitle: string }
const subs = new Set<() => void>(); let v = 0; const bump = () => { v++; subs.forEach(f => f()); };
export const useMusic = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => v);
const base = './music/';
let tracks: Track[] = []; let audio: HTMLAudioElement | null = null; let current: string | null = null; let full = false; let loading: Promise<Track[]> | null = null;
function el() { if (!audio) { audio = new Audio(); audio.preload = 'none'; for (const e of ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended', 'waiting', 'playing']) audio.addEventListener(e, bump); } return audio; }
export const music = {
  load(): Promise<Track[]> { return loading ??= fetch(base + 'tracks.json').then(r => r.ok ? r.json() : { tracks: [] }).then(j => { tracks = j.tracks ?? []; bump(); return tracks; }).catch(() => tracks); },
  get tracks() { return tracks; },
  byCast: (c: string) => tracks.find(t => t.cast === c),
  get current() { return current; }, get full() { return full; },
  /** Play or pause the 30-second preview (about 0.5 MB, loaded only now). */
  toggle(cast: string) { const t = music.byCast(cast); if (!t) return; const a = el();
    if (current === cast) { if (a.paused) a.play().catch(() => {}); else a.pause(); return; }
    current = cast; full = false; a.src = base + t.preview; a.play().catch(() => {}); bump(); },
  /** After a licence: the full recording, carrying on from where the preview was (or from 0:30). */
  playFull(cast: string, opts: { onlyIfPlaying?: boolean } = {}) { const t = music.byCast(cast); if (!t) return; const a = el(); const wasPlaying = !a.paused && current === cast;
    if (opts.onlyIfPlaying && !wasPlaying) return; const at = wasPlaying ? Math.max(30, a.currentTime) : 30;
    current = cast; full = true; a.src = base + t.file; const go = () => { a.currentTime = at; a.removeEventListener('loadedmetadata', go); }; a.addEventListener('loadedmetadata', go); a.play().catch(() => {}); bump(); },
  pause() { audio?.pause(); },
  get playing() { return !!audio && !audio.paused; },
  get time() { return audio?.currentTime ?? 0; }, get duration() { return audio?.duration || (full ? 200 : 30); },
  seek(f: number) { if (audio && audio.duration) audio.currentTime = f * audio.duration; },
};
