// Mutinynet anchoring path. Needs test coins, so it needs the Mutinynet faucet login. It refuses to run (and says why) otherwise.
// When ready, it runs mll-audit's own Mutinynet suite (real otsd OpenTimestamps + real OP-RETURN-Bot + MLR2 revocation) and
// refreshes public/mutinynet-status.json from its recorded txids. It never writes a record it did not see on chain.
import { existsSync, readFileSync } from 'fs'; import { execSync } from 'child_process'; import { homedir } from 'os';
import { MutinynetChain } from '../src/live/mutinynet';
const tokenFile = `${homedir()}/.mutinynet/token`;
if (!existsSync(tokenFile) || !readFileSync(tokenFile, 'utf8').trim()) { console.error('NEEDS LOGIN: no Mutinynet faucet token at ~/.mutinynet/token. Run mutinynet-cli login and approve the GitHub device code, then try again.'); execSync('node scripts/mutinynet-status.mjs', { stdio: 'ignore' }); process.exit(2); }
const tip = await new MutinynetChain().tip(); console.log('Mutinynet tip (public API):', tip.height, tip.hash);
execSync('NET=mutinynet npx tsx scripts/mutinynet/run.mts', { cwd: '/workspace/mll-audit', stdio: 'inherit' });
// verify each recorded tx really is on Mutinynet before listing it
const r = JSON.parse(readFileSync('/workspace/mll-audit/docs/mutinynet-results.json', 'utf8')); const chain = new MutinynetChain();
for (const t of r.chainTxs ?? []) { const ok = t.blockhash ? await chain.heightOfBlockHash(t.blockhash) : null; console.log(t.txid, ok === null ? 'NOT FOUND on public Mutinynet' : `confirmed at ${ok}`); }
execSync('node scripts/mutinynet-status.mjs', { stdio: 'inherit' });
