// A tiny syntax highlighter for TypeScript and shell snippets (no dependency).
import type { ReactNode } from 'react';
const RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|await|async|return|if|else|try|catch|new|function|throw|for|of|true|false|null|undefined)\b|\b(\d[\d_]*)\b/g;
export function highlight(code: string, json = false): ReactNode[] {
  if (json) return [code];
  const out: ReactNode[] = []; let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = RE.exec(code))) { if (m.index > last) out.push(code.slice(last, m.index));
    const [t, c, s, kw, n] = m; const lineStart = m.index === 0 || /\n\s*$/.test(code.slice(0, m.index)); const isComment = !!c && (!c.startsWith('#') || lineStart);
    const cls = isComment ? 'text-neutral-400 italic' : s ? 'text-emerald-700' : kw ? 'text-violet-700 font-medium' : n ? 'text-amber-700' : '';
    if (c && !isComment) { out.push(c[0]); last = m.index + 1; RE.lastIndex = last; continue; }
    out.push(cls ? <span key={k++} className={cls}>{t}</span> : t); last = m.index + t.length; }
  out.push(code.slice(last)); return out;
}
