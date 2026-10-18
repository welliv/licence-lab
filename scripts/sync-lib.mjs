// Copies the browser-safe core of the protocol library from the protocol library (../mll-audit/src, or $MLL_SRC) into src/lib/mll, unchanged.
// The library is the single source of truth: the Lab never re-implements signing or verification.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const SRC = process.env.MLL_SRC ?? '../mll-audit';
export const FILES = ['util.ts', 'events.ts', 'bolt11.ts', 'lnmsg.ts', 'x402.ts', 'chain.ts', 'ots.ts', 'verify.ts', 'rights.ts', 'nodebind.ts'];
const dst = new URL('../src/lib/mll/', import.meta.url);
for (const f of FILES) fs.copyFileSync(`${SRC}/src/${f}`, new URL(f, dst));
let commit = 'unknown'; try { commit = execSync(`git -C ${SRC} rev-parse --short HEAD`).toString().trim(); } catch {}
fs.writeFileSync(new URL('SOURCE.json', dst), JSON.stringify({ from: `${SRC}/src`, commit, files: FILES, note: 'Byte-for-byte copy. Do not edit here; edit the library and re-run npm run sync-lib.' }, null, 2) + '\n');
console.log(`copied ${FILES.length} files from ${SRC} @ ${commit}`);
