// A short, deterministic demo recording of "Rain" (synthesised, about 6 seconds, 8 kHz mono WAV).
// Same bytes every time, so the track hash in every offer is the same.
export function rainWav(): Uint8Array {
  const rate = 8000, secs = 6, n = rate * secs; const pcm = new Int16Array(n);
  const notes = [392, 440, 523.25, 440, 349.23, 392, 329.63, 392]; // a gentle loop
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 0xffffffff) - 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / rate, k = Math.floor(t / 0.75), f = notes[k % notes.length], local = t - k * 0.75;
    const env = Math.min(1, local * 20) * Math.exp(-local * 2.2);
    const tone = Math.sin(2 * Math.PI * f * t) * 0.35 * env + Math.sin(2 * Math.PI * f * 2 * t) * 0.08 * env;
    const drop = (i % 977 < 40 ? rnd() * 0.25 : 0) + rnd() * 0.03; // light rain
    pcm[i] = Math.max(-1, Math.min(1, tone + drop)) * 32767;
  }
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf); const w = (o: number, s: string) => [...s].forEach((c, j) => v.setUint8(o + j, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  new Int16Array(buf, 44).set(pcm); return new Uint8Array(buf);
}
/** A remix: the same file with a changed tail, so it hashes differently. */
export function remixWav(): Uint8Array { const b = rainWav().slice(); for (let i = b.length - 4000; i < b.length; i++) b[i] = b[i] ^ 0x5a; return b; }

// ---------- Real audio files (the owner's tracks in public/music). When registered, offers bind to their SHA-256. ----------
export interface TrackFile { role: 'rain' | 'remix' | 'nova' | string; sha256: string; label: string; bytes?: Uint8Array }
const FILES: Record<string, TrackFile> = {};
/** Register a real file. If bytes are given, their hash is recomputed here and must match. */
export function registerTrackFile(f: TrackFile, hash?: (b: Uint8Array) => string) {
  if (f.bytes && hash && hash(f.bytes) !== f.sha256) throw new Error(`${f.label}: file bytes do not match the expected SHA-256`);
  FILES[f.role] = f;
}
export const trackFile = (role: string): TrackFile | undefined => FILES[role];
export const clearTrackFiles = () => { for (const k of Object.keys(FILES)) delete FILES[k]; };
