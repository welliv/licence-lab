// The one cast. Each person is introduced once, here (scenarios.md §0.2).
export type Id = 'alice' | 'carol' | 'dave' | 'erin' | 'frank' | 'harbour' | 'bob' | 'bobagent' | 'grace' | 'clipai' | 'clipagent' | 'modelco' | 'victor' | 'trent' | 'mallory' | 'heidi' | 'ivan' | 'judy';
export interface Person { id: Id; name: string; emoji: string; role: string; start: number | null /* cents; null = no wallet */; noWallet?: string }
export const CAST: Record<Id, Person> = {
  alice: { id: 'alice', name: 'Alice', emoji: '👩🏽‍🎤', role: 'artist ("Rain")', start: 0 },
  carol: { id: 'carol', name: 'Carol', emoji: '🎛️', role: 'producer ("Night Shift")', start: 0 },
  dave: { id: 'dave', name: 'Dave', emoji: '🎙️', role: 'singer ("Northern Lights")', start: 0 },
  erin: { id: 'erin', name: 'Erin', emoji: '✍️', role: 'songwriter ("Paper Boats")', start: 0 },
  frank: { id: 'frank', name: 'Frank', emoji: '🎚️', role: 'remixer ("Rain (Frank remix)")', start: 0 },
  harbour: { id: 'harbour', name: 'Harbour Music', emoji: '⚓', role: 'a label', start: 0 },
  bob: { id: 'bob', name: 'Bob', emoji: '🧑', role: 'makes videos, sets his agent\'s rules', start: null, noWallet: 'no wallet (he funded his agent)' },
  bobagent: { id: 'bobagent', name: 'Bob\'s agent', emoji: '🤖', role: 'buys music for Bob', start: 10_000 },
  grace: { id: 'grace', name: 'Grace', emoji: '🎧', role: 'a fan', start: 1_000 },
  clipai: { id: 'clipai', name: 'ClipAI', emoji: '🏢', role: 'a video app, sets its agent\'s budget', start: null, noWallet: 'no wallet (it funded its agent)' },
  clipagent: { id: 'clipagent', name: 'ClipAI\'s agent', emoji: '🤖', role: 'buys music for ClipAI', start: 500_000 },
  modelco: { id: 'modelco', name: 'ModelCo', emoji: '🧠', role: 'an AI company', start: 50_000 },
  victor: { id: 'victor', name: 'Victor', emoji: '🔎', role: 'anyone who checks: a video site, a regulator', start: null, noWallet: 'no wallet' },
  trent: { id: 'trent', name: 'Trent', emoji: '🏷️', role: 'confirms who owns songs', start: null, noWallet: 'no wallet' },
  mallory: { id: 'mallory', name: 'Mallory', emoji: '😈', role: 'a cheat', start: 0 },
  heidi: { id: 'heidi', name: 'Heidi', emoji: '🤝', role: 'someone Alice trusts', start: null, noWallet: 'no wallet' },
  ivan: { id: 'ivan', name: 'Ivan', emoji: '🤝', role: 'someone Alice trusts', start: null, noWallet: 'no wallet' },
  judy: { id: 'judy', name: 'Judy', emoji: '🤝', role: 'someone Alice trusts', start: null, noWallet: 'no wallet' },
};
export const WALLETS = (Object.values(CAST).filter(p => p.start !== null).map(p => p.id));
export const START: Record<string, number> = Object.fromEntries(Object.values(CAST).filter(p => p.start !== null).map(p => [p.id, p.start!]));
export const nameOf = (id: string) => (CAST as Record<string, Person>)[id]?.name ?? id;

// ---------- The songs (scenarios.md §0.3). Shares in basis points; split with the engine's largest-remainder rule. ----------
export type SongId = 'rain' | 'northern' | 'nightshift' | 'paperboats' | 'remix';
export interface Song { id: SongId; title: string; cast: 'alice' | 'dave' | 'carol' | 'erin' | 'frank'; seller: Id; priceCents: number; shares: { who: Id; role: string; bps: number }[]; cover: string }
export const SONGS: Record<SongId, Song> = {
  rain: { id: 'rain', title: 'Rain', cast: 'alice', seller: 'alice', priceCents: 500, shares: [{ who: 'alice', role: 'artist', bps: 6500 }, { who: 'carol', role: 'producer', bps: 2000 }, { who: 'dave', role: 'singer', bps: 1500 }], cover: 'linear-gradient(135deg,#6d28d9,#0ea5e9)' },
  northern: { id: 'northern', title: 'Northern Lights', cast: 'dave', seller: 'dave', priceCents: 400, shares: [{ who: 'dave', role: 'artist', bps: 10_000 }], cover: 'linear-gradient(135deg,#059669,#1e3a8a)' },
  nightshift: { id: 'nightshift', title: 'Night Shift', cast: 'carol', seller: 'carol', priceCents: 600, shares: [{ who: 'carol', role: 'artist', bps: 8000 }, { who: 'erin', role: 'co-writer', bps: 2000 }], cover: 'linear-gradient(135deg,#1f2937,#7c3aed)' },
  paperboats: { id: 'paperboats', title: 'Paper Boats', cast: 'erin', seller: 'erin', priceCents: 300, shares: [{ who: 'erin', role: 'artist', bps: 10_000 }], cover: 'linear-gradient(135deg,#f59e0b,#be185d)' },
  remix: { id: 'remix', title: 'Rain (Frank remix)', cast: 'frank', seller: 'frank', priceCents: 700, shares: [{ who: 'frank', role: 'remixer', bps: 6000 }, { who: 'alice', role: 'original artist', bps: 4000 }], cover: 'linear-gradient(135deg,#0ea5e9,#db2777)' },
};
export const SONG_LIST = Object.values(SONGS);
/** Largest-remainder split, the same rule as src/engine/catalogue.ts shareCents. */
export function split(cents: number, shares: { bps: number }[]): number[] {
  const raw = shares.map(s => (cents * s.bps) / 10_000); const out = raw.map(Math.floor); let left = cents - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) { if (left <= 0) break; out[i]++; left--; } return out;
}
/** Harbour Music's catalogue plan (DRAFT subscription): Harbour 42 (30 + 12 from the remix it bought), Dave 25, Erin 25, Alice 8. */
export const PLAN = { priceCents: 9_900, songs: ['northern', 'paperboats', 'remix'] as SongId[], shares: [{ who: 'harbour' as Id, bps: 4200 }, { who: 'dave' as Id, bps: 2500 }, { who: 'erin' as Id, bps: 2500 }, { who: 'alice' as Id, bps: 800 }] };
export const usd = (c: number) => (c < 0 ? '−' : '') + '$' + (Math.abs(c) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usd0 = (c: number) => '$' + (c / 100).toLocaleString('en-GB', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
