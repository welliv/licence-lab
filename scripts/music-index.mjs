// Indexes the audio files in public/music/ (any names) and writes public/music/tracks.json and CREDITS.md.
// - sha256 of each ORIGINAL file (the exact bytes the licence offer binds to via its "x" tag)
// - a 30 s MP3 preview in public/music/previews/ (needs ffmpeg; otherwise the full file is the preview)
// - metadata from public/music/music.json (you edit this: title, artist, licence, source, cast); new files get defaults
// Usage: node scripts/music-index.mjs [dir]
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { createHash } from 'crypto'; import { execFileSync } from 'child_process'; import { join, extname, basename } from 'path';
const dir = process.argv[2] ?? 'public/music'; const prevDir = join(dir, 'previews'); mkdirSync(prevDir, { recursive: true });
export const AUDIO = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.webm': 'audio/webm' };
const IMG = ['.jpg', '.jpeg', '.png', '.webp'];
const CAST_ORDER = [['ava', 'Rain'], ['nova', 'Nova Lights'], ['jay', 'Night Shift'], ['lena', 'Paper Boats'], ['kai', 'Rain (Kai remix)'], ['sam', 'Fan Mix']];
const has = b => { try { execFileSync(b, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } };
const ff = has('ffmpeg') && has('ffprobe');
const cfgFile = join(dir, 'music.json'); const cfg = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')) : { tracks: {} };
const files = readdirSync(dir).filter(f => AUDIO[extname(f).toLowerCase()] && statSync(join(dir, f)).isFile()).sort();
const tracks = []; let i = 0;
for (const f of files) {
  const p = join(dir, f); const bytes = readFileSync(p); const sha256 = createHash('sha256').update(bytes).digest('hex');
  const c = cfg.tracks[f] ?? {}; const [castDefault, demoDefault] = CAST_ORDER[i] ?? ['ava', basename(f, extname(f))]; i++;
  let durationSec = null; if (ff) { try { durationSec = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).toString().trim()) || null; } catch {} }
  const id = sha256.slice(0, 12); let preview = f, previewSha256 = sha256;
  if (ff) { const out = join(prevDir, `${id}.mp3`); const len = Math.min(30, durationSec ?? 30); const start = durationSec && durationSec > 60 ? Math.floor(durationSec * 0.25) : 0;
    try { execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(start), '-t', String(len), '-i', p, '-vn', '-ac', '2', '-ar', '44100', '-b:a', '128k', '-af', `afade=t=in:d=1,afade=t=out:st=${Math.max(0, len - 2)}:d=2`, out]);
      preview = `previews/${id}.mp3`; previewSha256 = createHash('sha256').update(readFileSync(out)).digest('hex'); } catch (e) { console.warn('preview failed for', f, e.message); } }
  const art = IMG.map(x => basename(f, extname(f)) + x).find(a => existsSync(join(dir, a)));
  const entry = { title: c.title ?? basename(f, extname(f)), artist: c.artist ?? 'Unknown artist (edit music.json)', licence: c.licence ?? 'Not stated yet (edit music.json)', source: c.source ?? '', notes: c.notes ?? '', cast: c.cast ?? castDefault, demoTitle: c.demoTitle ?? demoDefault };
  cfg.tracks[f] = entry;
  tracks.push({ id, file: f, mime: AUDIO[extname(f).toLowerCase()], bytes: bytes.length, sha256, durationSec, preview, previewSha256, artwork: art ?? null, ...entry });
}
for (const old of readdirSync(prevDir)) if (!tracks.some(t => t.preview === `previews/${old}`)) unlinkSync(join(prevDir, old));
for (const k of Object.keys(cfg.tracks)) if (!files.includes(k)) delete cfg.tracks[k];
writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n');
writeFileSync(join(dir, 'tracks.json'), JSON.stringify({ generatedAt: new Date().toISOString(), ffmpeg: ff, hero: tracks.find(t => t.cast === 'ava')?.id ?? tracks[0]?.id ?? null, tracks }, null, 2) + '\n');
const credits = ['# Music credits', '', 'Licence Lab uses demo names (Ava, "Rain", Nova, Jay, Lena…) for its story. The audio files below are real recordings; this file records who made them and under which licence.', '',
  tracks.length ? '| Demo name | File | Original title | Artist | Licence | Source | SHA-256 |\n|---|---|---|---|---|---|---|\n' + tracks.map(t => `| ${t.demoTitle} (${t.cast}) | ${t.file} | ${t.title} | ${t.artist} | ${t.licence} | ${t.source || '—'} | \`${t.sha256}\` |`).join('\n') : '_No tracks yet. Add audio files to this folder and run `npm run music`._', ''].join('\n');
writeFileSync(join(dir, 'CREDITS.md'), credits);
console.log(`${tracks.length} track(s) indexed in ${dir}${ff ? '' : ' (no ffmpeg: previews are the full files)'}`); for (const t of tracks) console.log(`  ${t.demoTitle} ← ${t.file}  sha256 ${t.sha256}  ${t.durationSec?.toFixed?.(1) ?? '?'} s  preview ${t.preview}`);
