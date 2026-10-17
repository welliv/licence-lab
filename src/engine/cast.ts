// The cast. Global, neutral names only.
export type Role = 'artist' | 'agent' | 'collaborator' | 'buyer' | 'fan' | 'platform' | 'attacker' | 'infra' | 'checker';
export interface Persona { id: string; name: string; emoji: string; role: Role; blurb: string; colour: string; startSats: number; agentOf?: string; lud16?: string }
const P = (id: string, name: string, emoji: string, role: Role, blurb: string, colour: string, startSats = 0, agentOf?: string): Persona =>
  ({ id, name, emoji, role, blurb, colour, startSats, agentOf, lud16: `${id}@lab.test` });
export const CAST: Record<string, Persona> = Object.fromEntries([
  P('ava', 'Ava', '👩🏽‍🎤', 'artist', 'Independent artist. Owns the recording of "Rain".', '#7c3aed', 1_000),
  P('echo', 'Echo', '🤖', 'agent', "Ava's AI agent. Runs her licensing within rules she signed.", '#8b5cf6', 0, 'ava'),
  P('jay', 'Jay', '🎛️', 'collaborator', 'Producer. Co-owns the recording (20%).', '#0ea5e9'),
  P('nova', 'Nova', '🎙️', 'collaborator', 'Featured singer. Co-owns the recording (15%).', '#ec4899'),
  P('lena', 'Lena', '✍️', 'collaborator', 'Songwriter. Agreed share of recording income (15%).', '#14b8a6'),
  P('mia', 'Mia', '🎬', 'buyer', 'Video creator. Wants "Rain" without a copyright claim.', '#f59e0b', 50_000),
  P('sam', 'Sam', '🎧', 'fan', 'A fan. Wants to support Ava and get early access.', '#22c55e', 20_000),
  P('streamco', 'StreamCo', '📺', 'platform', 'Music and video platform with many users.', '#2563eb', 2_000_000),
  P('clipai', 'ClipAI', '🎞️', 'platform', 'AI video tool. Funds Scout\'s wallet.', '#0891b2', 200_000),
  P('scout', 'Scout', '🛰️', 'agent', "ClipAI's buyer agent. Spends only inside its NWC budget.", '#06b6d4', 0, 'clipai'),
  P('kai', 'Kai', '🎚️', 'artist', 'A producer who remixes "Rain".', '#f97316', 5_000),
  P('modelco', 'ModelCo', '🧠', 'buyer', 'AI music company. Licenses tracks for training.', '#4f46e5', 500_000),
  P('distributor', 'Distributor', '📦', 'platform', "Ava's distributor. Vouches that her key is really her.", '#64748b'),
  P('studio', 'Game studio', '🎮', 'buyer', 'Wants "Rain" in a trailer and in the game.', '#be123c', 300_000),
  P('brand', 'Brand', '🏷️', 'buyer', 'Wants "Rain" only for itself in adverts.', '#a16207', 500_000),
  P('label', 'Label', '🏢', 'artist', 'A small label with 40 artists.', '#334155', 0),
  P('site', 'Video site', '🖥️', 'platform', 'Adds a "License this" button and checks uploads.', '#0f766e'),
  P('auditor', 'Auditor', '🔍', 'checker', 'Samples bundles and re-checks them.', '#475569'),
  P('regulator', 'Regulator', '⚖️', 'checker', 'Asks AI companies to prove permission.', '#1e293b'),
  P('host', 'HostCo', '🏠', 'infra', 'Runs hosted Lightning nodes for artists.', '#78716c'),
  P('relays', 'Relays', '📡', 'infra', 'Store and pass on signed Nostr events.', '#a855f7'),
  P('indexes', 'Indexes', '🗂️', 'infra', 'Search offers and track revocations.', '#6366f1'),
  P('bitcoin', 'Bitcoin', '⛓️', 'infra', 'Fixes when things happened (simulated blocks here).', '#f7931a'),
  P('observer', 'Observer', '👁️', 'checker', 'A stranger reading public relays.', '#525252'),
  P('mallory', 'Mallory', '🦹', 'attacker', 'Tries every trick to cheat.', '#dc2626', 10_000),
  P('thief', '"Ava Official"', '🎭', 'attacker', 'A fake account that copies Ava\'s song.', '#b91c1c', 1_000),
].map(p => [p.id, p]));
export const persona = (id: string) => CAST[id] ?? { id, name: id, emoji: '•', role: 'infra', blurb: '', colour: '#999', startSats: 0 } as Persona;
