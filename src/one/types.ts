import type { Id, SongId } from './data/cast';
import type { Proof, RealInfo } from './prove';
export type ScId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8' | 's9' | 's10' | 's11';
export interface Move { from: Id; to: Id; cents: number }
export interface Line { mark: 'ok' | 'no' | 'grey' | 'moon'; who?: string; cents?: number; text: string; time?: string }
export interface Arrow { from: Id | 'everyone' | 'bitcoin'; to: Id | 'everyone' | 'bitcoin'; label: string; cents?: number; kind: 'money' | 'info' | 'key' | 'no' | 'bitcoin' }
export interface Licence { song: SongId | 'catalogue'; type: 'personal' | 'creator' | 'business' | 'training' | 'subscription'; holder: Id; at: number; cents: number; month?: number; sc?: ScId }
export interface Facts {
  s1Song: SongId; s1Price: number; s1Round: number;
  bobDay: number; bobSong: number; bobBudgetSet: boolean; bobSpentToday: number;
  clipMonth: number; clipBudgetSet: boolean; clipSpentMonth: number; clipMonthNo: number;
  remixOwner: 'frank' | 'harbour'; businessStopped: boolean; phoneCut: boolean; plan: boolean;
  days: number; licences: Licence[]; firstRunSeen: boolean; videos: number;
}
export interface Ctx { f: Facts; bal: Record<string, number>; now: number }
export interface Outcome { moves?: Move[]; lines: Line[]; arrows?: Arrow[]; facts?: Partial<Facts>; licences?: Licence[]; refused?: boolean }
export interface Need { test: (c: Ctx) => boolean; run: string }
export interface Step {
  id: string; who: Id; button: (c: Ctx) => string; cheat?: boolean; hidden?: boolean;
  /** what a good result looks like: a payment or action that works, a refusal the story wants, or a cheat caught */
  expect: 'ok' | 'refused' | 'caught';
  needs?: Need[]; blocked?: (c: Ctx) => string | undefined;
  run: (c: Ctx) => Outcome; prove: (c: Ctx) => { key: string; cents?: number; cast?: string };
  real?: (c: Ctx) => { sats: number; title: string; cast: string; seller: Id };
  doneText: (c: Ctx) => string; // short ✓ line under the step once done; also the "Done for you" text
  input?: 'price' | 'budget7' | 'budget8';
  /** run the real engine first and show its progress (scenario 8's 500 licences) */
  proveFirst?: boolean;
}
export interface ProofBlock { kind: 'licences' | 'money' | 'thisTime' | 'note' | 'draft' | 'cheat' | 'file' | 'checks' | 'limit' | 'chain' | 'two' | 'sample' | 'months'; title?: string; text?: string; step?: string; highlight?: number[] }
export interface Scenario {
  id: ScId; n: number; slug: string; group: 'START HERE' | 'ARTISTS' | 'AGENTS AND COMPANIES'; emoji: string; title: string; sentence: string; audience: 'artists' | 'agents' | 'companies';
  cast: Id[]; card?: 'song1' | 'three' | 'catalogue' | 'none'; steps: Step[];
  result: { title: string; body: string }; next: { label: string; to: string };
  noMoney?: string; proof: ProofBlock[]; code: string; prompts: [string, string];
}
export interface Done { at: number; auto?: boolean; real?: RealInfo; realNote?: string; proof?: Proof; proofError?: string; refused?: boolean; round?: number }
