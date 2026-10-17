// WCAG contrast of the dark theme's main text/background pairs.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = h => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const card = '#16171b', page = '#0d0e11';
const pairs = [['body text (neutral-900) on card', '#f3f4f6', card], ['secondary (neutral-600) on card', '#bcbec6', card], ['muted (neutral-500) on card', '#a3a6af', card], ['faint (neutral-400) on card', '#8b8e98', card], ['faint (neutral-400) on page', '#8b8e98', page],
  ['primary button text on button', card, '#f3f4f6'], ['green text (emerald-700) on green tint', '#6ee7b7', '#0f2a20'], ['red text (red-700) on red tint', '#fca5a5', '#2d1215'], ['amber text (amber-800) on amber tint', '#fde68a', '#2a210e'], ['orange text (orange-800) on orange tint', '#fed7aa', '#2d1b0e'], ['link (sky-700) on page', '#7dd3fc', page]];
for (const [n, f, b] of pairs) console.log(`| ${n} | ${cr(f, b).toFixed(1)}:1 | ${cr(f, b) >= 4.5 ? 'AA' : cr(f, b) >= 3 ? 'AA large only' : 'fail'} |`);
