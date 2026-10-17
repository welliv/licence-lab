import { describe, it, expect } from 'vitest';
import { Lab } from '../src/engine/lab';
import * as S from '../src/engine/story';
describe('put up your own song (practice mode)', () => {
  it('a file hash becomes a signed offer; Bob\'s agent buys it; check 10 is honestly unverified', async () => {
    const lab = new Lab('own'); const sha = 'ab'.repeat(32); const out = await S.ownSong(lab, { name: 'My Tune.mp3', sha256: sha });
    expect(out.verdict.result.ok).toBe(true); expect(out.offer.tags.find(t => t[0] === 'x')?.[1]).toBe(sha); expect(out.title).toBe('My Tune');
    expect(out.verdict.ownership.status).toBe('skip'); expect(out.verdict.result.ownership?.status).toBe('unverified'); expect(out.verdict.file?.ok).toBe(true);
  });
  it('the copycat is caught by check 10, and only because a distributor the checker trusts vouched for Alice', async () => {
    const lab = new Lab('copy'); const v = await S.fakeCaught(lab); expect(v.result.ok).toBe(false); expect(v.result.code).toBe('rights_not_holder'); expect(v.ownership.status).toBe('fail');
    const real = await lab.verify(lab.a['bundle.you'] ?? (await S.hearAndLicense(lab)).bundle); expect(real.ownership.status).toBe('pass');
    lab.ownerVouches = []; lab.ownerTrust = []; lab.titleOrigin = undefined; const nobody = await lab.verify(lab.a['bundle.fake']); expect(nobody.result.ok).toBe(true); expect(nobody.result.ownership?.status).toBe('unverified');
  });
});
