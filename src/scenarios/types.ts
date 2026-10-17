import type { Lab } from '../engine/lab';
import type { Out } from '../engine/actions';
export type Complexity = 'simplest' | 'easy' | 'medium' | 'advanced' | 'expert';
export interface Input { key: string; label: string; type: 'number' | 'text' | 'select'; default: string | number; options?: string[]; hint?: string }
export interface Step {
  id: string; actor: string; to?: string; title: string; button: string; narration: string;
  inputs?: Input[]; expectFail?: boolean; /** the protocol does NOT stop this today: shown as a known open issue */ openIssue?: boolean; run: (lab: Lab, input: Record<string, any>) => Promise<Out> | Out;
}
export interface Scenario {
  id: string; n: number; part: 1 | 2 | 3 | 4 | 5 | 6; emoji: string; title: string; complexity: Complexity; status: 'v1' | 'v1 + later' | 'later' | 'not in v1';
  summary: string; situation: string; education: string; how: { title: string; description: string }[];
  cast: string[]; setup?: (lab: Lab) => Promise<void> | void; steps: Step[];
  proven: string; canGoWrong: { text: string; attack?: string }[]; limits?: string[]; prompts: { title: string; prompt: string }[];
}
export const PARTS: Record<number, string> = { 1: 'Setting up', 2: 'Buying', 3: 'Changing things', 4: 'Disputes and attacks', 5: 'Growing the network', 6: 'Rights change hands' };
