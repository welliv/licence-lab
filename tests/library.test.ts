import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import src from '../src/lib/mll/SOURCE.json';
// The Lab must run the real protocol library, unchanged.
describe('vendored protocol library', () => {
  for (const f of src.files) it(`${f} is byte-identical to ${src.from} (${src.commit})`, () => {
    const lib = `${src.from}/${f}`; if (!fs.existsSync(lib)) return; // source repo not on this machine: skip
    expect(fs.readFileSync(new URL(`../src/lib/mll/${f}`, import.meta.url), 'utf8')).toBe(fs.readFileSync(lib, 'utf8'));
  });
});
