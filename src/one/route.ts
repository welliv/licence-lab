// Hash routes (works on any static host). Old links from the two earlier versions land on their new home.
import { useSyncExternalStore } from 'react';
import { SCENARIOS } from './data/scenarios';
const get = () => location.hash.replace(/^#\/?/, '');
export function useRoute() { const h = useSyncExternalStore(f => { addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, get); const [path, q = ''] = h.split('?'); return { path, params: new URLSearchParams(q) }; }
export const go = (p: string) => { location.hash = '/' + p; };
const slug = (n: number) => SCENARIOS[n - 1].slug;
/** Old engine scenario ids (s1–s29) → the scenario that now tells that story. Anything else moved to the GitHub docs. */
const OLD_SC: Record<string, number> = { s1: 1, s3: 1, s28: 2, s19: 3, s2: 4, s8: 4, s11: 5, s25: 6, s26: 6, s27: 6, s4: 7, s29: 8, s6: 10, s12: 11, s15: 11 };
const OLD_ATTACK: Record<string, number> = { A4: 2, A1: 3, A3: 4, A12: 5, A20: 6, A8: 7, A11: 10, A7: 11, A14: 11 };
const GUIDE = ['s3', 's2', 's19', 's28', 's8', 's6', 's4', 's5', 's29', 's11', 's25', 's26', 's12', 's15', 's20'];
export function redirect(path: string): string | null {
  if (!path || ['start', 'home', 'stop1', 'c1', 'hood', 'live'].includes(path)) return path === 'live' ? `${slug(1)}?tab=proof` : path === '' ? null : slug(1);
  if (['stop2', 'c2'].includes(path)) return slug(8); if (['stop3', 'c3'].includes(path)) return slug(3); if (['rights', 'c4'].includes(path)) return slug(6);
  if (path === 'verify') return `${slug(3)}?tab=proof`; if (path === 'hood/runs') return `${slug(1)}?tab=proof`; if (path === 'redteam' || path.startsWith('about/')) return 'done';
  const a = /^attack\/(A\d+)$/.exec(path); if (a) return OLD_ATTACK[a[1]] ? slug(OLD_ATTACK[a[1]]) : `done?moved=${a[1]}`;
  const h = /^hood\/(\d+)$/.exec(path); if (h) { const id = GUIDE[Number(h[1]) - 1]; return id && OLD_SC[id] ? slug(OLD_SC[id]) : 'done?moved=1'; }
  const s = /^s(\d+)$/.exec(path); if (s) return OLD_SC[path] ? slug(OLD_SC[path]) : `done?moved=${path}`;
  return null;
}
