// Under the hood: every scenario sits in one plain group. The main path is built from some of them (STOP_OF).
export interface Group { id: string; title: string; line: string; ids: string[]; to?: string }
export const GROUPS: Group[] = [
  { id: 'setup', title: 'Getting set up', line: 'An artist, her agent, her co-writers and a label get ready to sell.', ids: ['s1', 's2', 's18'] },
  { id: 'deals', title: 'Deals and money', line: 'Buying by hand, by agent, at scale, for AI training, for a remix, for a game, in other currencies.', ids: ['s3', 's4', 's5', 's6', 's8', 's9', 's13', 's19', 's21'] },
  { id: 'offer', title: 'Changing your offer', line: 'New prices, withdrawn offers, exclusive deals, and new owners.', ids: ['s10', 's11', 's23', 's25', 's26'] },
  { id: 'wrong', title: 'When things go wrong', line: 'Copycats, lost payments, refunds, outages and poisoned prompts.', ids: ['s12', 's14', 's15', 's16', 's17'] },
  { id: 'privacy', title: 'Privacy', line: 'Buying without being followed.', ids: ['s20'] },
  { id: 'fans', title: 'Fans', line: 'Tips and early access, outside licensing.', ids: ['s7'] },
  { id: 'network', title: 'Running the network', line: 'For the people who run the servers and search sites.', ids: ['s24'] },
  { id: 'limits', title: 'Honest limits', line: 'What this cannot do on its own, said plainly.', ids: ['s27'] },
  { id: 'break', title: 'Try to break it', line: 'Play the cheat. Every attack runs against the real checks.', ids: [], to: 'redteam' },
];
/** S22 is one line, not a page. */
export const S22_LINE = 'Selling only in some countries works the same way: the offer names where the licence may be used, and a use anywhere else is refused.';
export const STOP_OF: Record<string, string> = { s2: 'Stop 1', s3: 'Stop 1', s8: 'Stop 1', s13: 'Stop 1', s4: 'Stop 2', s5: 'Stop 2', s15: 'Stop 2', s6: 'Stop 3', s12: 'Stop 3', s19: 'Stop 3', s11: 'Extra', s25: 'Extra', s26: 'Extra', s27: 'Extra' };
export const groupOf = (id: string) => GROUPS.find(g => g.ids.includes(id));
