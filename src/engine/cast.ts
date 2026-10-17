// The cast. Global, neutral names only.
export type Role = 'artist' | 'agent' | 'collaborator' | 'buyer' | 'fan' | 'platform' | 'attacker' | 'infra' | 'checker';
export interface Persona { id: string; name: string; emoji: string; role: Role; blurb: string; colour: string; startSats: number; agentOf?: string; lud16?: string }
const P = (id: string, name: string, emoji: string, role: Role, blurb: string, colour: string, startSats = 0, agentOf?: string): Persona =>
  ({ id, name, emoji, role, blurb, colour, startSats, agentOf, lud16: `${id}@lab.test` });
export const CAST: Record<string, Persona> = Object.fromEntries([
  P('alice', 'Alice', '👩🏽‍🎤', 'artist', 'Independent artist. Owns the recording of "Rain".', '#7c3aed', 1_000),
  P('echo', 'Echo', '🤖', 'agent', "Alice's AI agent. Runs her licensing within rules she signed.", '#8b5cf6', 0, 'alice'),
  P('carol', 'Carol', '🎛️', 'collaborator', 'Producer. Co-owns the recording (20%).', '#0ea5e9'),
  P('dave', 'Dave', '🎙️', 'collaborator', 'Singer. Features on "Rain" (15%) and has his own song, "Northern Lights".', '#ec4899'),
  P('erin', 'Erin', '✍️', 'collaborator', 'Songwriter. Agreed share of recording income (15%).', '#14b8a6'),
  P('bob', 'Bob', '🎬', 'buyer', 'Video creator. Wants "Rain" without a copyright claim.', '#f59e0b', 50_000),
  P('grace', 'Grace', '🎧', 'fan', 'A fan. Wants to support Alice and get early access.', '#22c55e', 20_000),
  P('streamco', 'StreamCo', '📺', 'platform', 'Music and video platform with many users.', '#2563eb', 2_000_000),
  P('clipai', 'ClipAI', '🎞️', 'platform', 'AI video tool. Holds the wallet Bob\'s agent spends from.', '#0891b2', 200_000),
  P('bobagent', 'Bob\'s agent', '🛰️', 'agent', "Bob's AI agent, on ClipAI's wallet. Spends only inside its NWC budget.", '#06b6d4', 0, 'clipai'),
  P('clipagent', "ClipAI's agent", '🤖', 'agent', "ClipAI's buying agent. Licenses songs for its users' videos inside a monthly budget a person set.", '#22d3ee', 0, 'clipai'),
  P('frank', 'Frank', '🎚️', 'artist', 'A producer who remixes "Rain".', '#f97316', 5_000),
  P('modelco', 'ModelCo', '🧠', 'buyer', 'AI music company. Licenses tracks for training.', '#4f46e5', 500_000),
  P('distributor', 'Distributor', '📦', 'platform', "Alice's distributor. Vouches that her key is really her.", '#64748b'),
  P('studio', 'Game studio', '🎮', 'buyer', 'Wants "Rain" in a trailer and in the game.', '#be123c', 300_000),
  P('brand', 'Brand', '🏷️', 'buyer', 'Wants "Rain" only for itself in adverts.', '#a16207', 500_000),
  P('label', 'Label', '🏢', 'artist', 'A small label with 40 artists.', '#334155', 0),
  P('site', 'Video site', '🖥️', 'platform', 'Adds a "License this" button and checks uploads.', '#0f766e'),
  P('auditor', 'Auditor', '🔍', 'checker', 'Samples bundles and re-checks them.', '#475569'),
  P('regulator', 'Regulator', '⚖️', 'checker', 'Asks AI companies to prove permission.', '#1e293b'),
  P('host', 'HostCo', '🏠', 'infra', 'Runs hosted Lightning nodes for artists.', '#78716c'),
  P('relays', 'Relays', '📡', 'infra', 'Store and pass on signed Nostr events.', '#a855f7'),
  P('indexes', 'Indexes', '🗂️', 'infra', 'Search offers and track revocations.', '#6366f1'),
  P('ots', 'OTS calendar', '🕰️', 'infra', 'OpenTimestamps calendar. Batches digests into one Bitcoin commitment.', '#ea580c'),
  P('bitcoin', 'Bitcoin', '⛓️', 'infra', 'Fixes when things happened (simulated blocks here).', '#f7931a'),
  P('eve', 'Eve', '👁️', 'checker', 'An eavesdropper. Reads public relays and tries to link purchases.', '#525252'),
  P('harbour', 'Harbour Music', '⚓', 'artist', 'A music publisher. Buys the rights to "Rain" from Alice.', '#0e7490', 0),
  P('heidi', 'Heidi', '👧🏾', 'collaborator', "Alice's daughter. Named heir in Alice's succession plan.", '#db2777'),
  P('ivan', 'Ivan', '👨🏻', 'collaborator', "Alice's brother. Named heir in Alice's succession plan.", '#65a30d'),
  P('judy', 'Judy', '⚖️', 'collaborator', "Alice's executor (her lawyer). Third key in the plan.", '#7c2d12'),
  P('estate', "Alice's estate", '🏛️', 'artist', 'The new key that sells "Rain" after Alice has died.', '#57534e', 0),
  P('court', 'Court registry', '🏛', 'checker', 'Publishes signed notes that a court order exists.', '#44403c'),
  P('mallory', 'Mallory', '🦹', 'attacker', 'Tries every trick to cheat.', '#dc2626', 10_000),
  P('thief', '"Alice Official"', '🎭', 'attacker', 'A fake account that copies Alice\'s song.', '#b91c1c', 1_000),
].map(p => [p.id, p]));
export const persona = (id: string) => CAST[id] ?? { id, name: id, emoji: '•', role: 'infra', blurb: '', colour: '#999', startSats: 0 } as Persona;
