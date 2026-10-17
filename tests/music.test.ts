import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { registerTrackFile, clearTrackFiles } from '../src/engine/track';
import { runScenario } from '../src/engine/runner';
import { byId } from '../src/scenarios';
import { tagv } from '../src/engine/lab';
const manifest = existsSync('public/music/tracks.json') ? JSON.parse(readFileSync('public/music/tracks.json', 'utf8')) : { tracks: [] };
const hero = manifest.tracks.find((t: any) => t.cast === 'ava');
const h = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
afterAll(() => clearTrackFiles());
describe.skipIf(!hero)('real audio files bind to the licence', () => {
  it('manifest hashes are the SHA-256 of the full files; previews exist and are short', () => {
    for (const t of manifest.tracks) { expect(h(readFileSync(`public/music/${t.file}`))).toBe(t.sha256); expect(existsSync(`public/music/${t.preview}`)).toBe(true); }
  });
  it('the offer carries the hero file hash, verifyLicence passes 9/9, and the extra file check matches', async () => {
    const bytes = new Uint8Array(readFileSync(`public/music/${hero.file}`)); registerTrackFile({ role: 'rain', sha256: hero.sha256, label: hero.file, bytes }, h);
    const { lab, runs } = await runScenario(byId('s3')!); const v = [...runs].reverse().find(r => r.out.verdict)!.out.verdict!;
    const offer = lab.a['offer.creator']; expect(tagv(offer, 'x')).toBe(hero.sha256);
    expect(v.result.ok).toBe(true); expect(v.passed).toBe(9); expect(v.file?.ok).toBe(true); expect(v.file?.recomputed).toBe(true);
  });
  it('a changed file does not register, so it cannot pass as the licensed track', () => {
    const bytes = new Uint8Array(readFileSync(`public/music/${hero.file}`)); bytes[5000] ^= 1;
    expect(() => registerTrackFile({ role: 'rain', sha256: hero.sha256, label: 'tampered', bytes }, h)).toThrow(/do not match/);
  });
});
