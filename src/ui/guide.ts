// Under the hood, Alby-style: 15 numbered scenarios in 5 plain groups, simplest first. Everything else stays reachable under "More scenarios".
// Each guide item points at an engine scenario (routes stay #/sN, so old links still work) and gives it a plain title, one line, plain step
// buttons (the page adds who acts: "Bob: pay the bill") and a plain result. The technical text stays in the scenario and shows under "See the proof / code".
export interface GuideItem { n: number; id: string; group: string; title: string; line: string; result: string; steps?: Record<string, string> }
export interface GuideGroup { id: string; title: string }
export const GUIDE_GROUPS: GuideGroup[] = [
  { id: 'start', title: 'Getting started' }, { id: 'types', title: 'Licence types' }, { id: 'companies', title: 'Companies and agents' },
  { id: 'time', title: 'Rights over time' }, { id: 'safety', title: 'Attacks and safety' },
];
const G = (group: string, id: string, title: string, line: string, result: string, steps?: Record<string, string>) => ({ group, id, title, line, result, steps });
export const GUIDE: GuideItem[] = [
  G('start', 's3', 'One sale', 'Bob buys a licence for "Rain" from Alice, and Alice\'s co-writers are paid at once.', 'Bob holds a licence anyone can check, and every co-writer got their share the moment he paid.',
    { find: 'find "Rain"', request: 'tap "License this"', invoice: 'send the bill', pay: 'pay the bill', bundle: 'keep the licence and check it', split: 'pay the co-writers', anchor: 'date the sales on Bitcoin', claim: 'answer a copyright claim' }),
  G('start', 's2', 'Splits', 'Alice puts "Rain" on sale, and Carol, Dave and Erin each agree to their share first.', 'The offer names the exact recording and the shares, and every co-writer signed their yes.',
    { hash: 'take the song\'s fingerprint', offer: 'put "Rain" on sale', 'consent-carol': 'agree to her share', 'consent-dave': 'agree to his share', 'consent-erin': 'agree to her share', ots: 'date the release on Bitcoin', changed: 'try it: sell a changed copy' }),
  G('start', 's19', 'Check a licence', 'A video site adds a "License this" button and checks every upload by itself.', 'The site checked the licence alone, in milliseconds, and spotted the edited copy.',
    { embed: 'add a "License this" button', tap: 'tap it and buy', upload: 'check the upload', cache: 'try it: upload an edited copy' }),
  G('types', 's28', 'Personal, Creator or Business', 'One song, three licences: $1 just for you, $5 for your videos, $50 for ads.', 'Each licence names its own use and price, the split follows the price, and a licence cannot be stretched to another use.',
    { offers: 'put "Rain" on sale three ways', personal: 'buy Personal, $1', creator: 'buy Creator, $5', business: 'buy Business, $50', stretch: 'try it: use Personal in an advert' }),
  G('types', 's8', 'A remix pays the original', 'Frank remixes "Rain". When Bob buys the remix, Alice gets her share too.', 'The remix offer carries Alice\'s share and her yes, so the original artist is paid on every sale.',
    { buy: 'buy a remix licence', frankoffer: 'put the remix on sale', aliceok: 'agree to her share', bob: 'buy the remix', cheat: 'try it: leave Alice out' }),
  G('types', 's6', 'AI training', 'ModelCo licenses "Rain" to train a model, and later a regulator asks for proof.', 'ModelCo proved it had permission before training began, with a date nobody can move.',
    { buy: 'buy a training licence', stamp: 'date it before training', train: 'start training', reg: 'ask for proof', late: 'try it: buy after training' }),
  G('companies', 's4', 'Bob\'s agent and a budget', 'A person sets a budget, and Bob\'s agent finds, checks and pays for a licence on its own.', 'The agent bought the licence alone, and checked the bill before paying, inside the budget a person set.',
    { budget: 'set Bob\'s agent\'s budget', read: 'read the offer', negotiate: 'ask for a lower price', request: 'ask to buy', invoice: 'send the bill', pay: 'check the bill and pay', verify: 'check the licence' }),
  G('companies', 's5', 'StreamCo at scale', 'StreamCo\'s users add "Rain" to their posts, and every post gets its own licence.', 'Every post was licensed and paid, and an auditor re-checked a random sample alone.',
    { caps: 'set the budget', run: 'license its users\' posts', batch: 'date them all at once', ledger: 'export the sales record', audit: 'check 20 at random', delete: 'a user deletes a post' }),
  G('companies', 's29', 'ClipAI and a subscription', 'ClipAI\'s agent licenses 500 videos inside a monthly budget, then subscribes to Harbour Music for $99 a month.', 'The agent bought and renewed inside the budget, and the wallet refused it once the budget was too small.'),
  G('time', 's11', 'Withdraw an offer', 'Alice stops selling ad licences, and later her phone is stolen.', 'New sales stop at once, licences sold earlier still count, and the thief cannot sell with the old link.',
    { revoke: 'stop selling for ads', after: 'check which licences still count', nonew: 'try it: buy an ad licence now', stolen: 'phone stolen: unlink her wallet', 'thief-sells': 'try it: sell with the old link', 'before-ok': 'check an earlier licence', newbinding: 'open issue: link a new wallet', recover: 'move Alice to a new key' }),
  G('time', 's25', 'Sell the rights', 'Alice sells the rights to "Rain" to Harbour Music. Her co-writers must agree.', 'Harbour now sells "Rain", Bob\'s older licence still counts, and Alice\'s old key can no longer sell.',
    { sign: 'sign the rights over to Harbour', early: 'try it: sell before the co-writers agree', cosign: 'co-sign with Dave and Erin', new: 'sell a licence', before: 'check his older licence', old: 'try it: sell with her old key' }),
  G('time', 's26', 'Inheritance', 'Alice signs a plan for after she dies: two of three people she trusts must agree to take over.', 'Her estate sells in her place, no one can take over alone, and licences from her lifetime still count.',
    { plan: 'sign her plan', one: 'try it: take over alone', takeover: 'take over with Heidi (2 of 3)', estate: 'sell a licence', frozen: 'try it: sell with Alice\'s old key', before: 'check a licence from her lifetime' }),
  G('safety', 's12', 'A copycat', 'Someone calling themself "Alice Official" lists Alice\'s song as their own.', 'The copy is found and reported, and a buyer can tell it is not Alice\'s.',
    { list: 'list "Rain" as their own', spot: 'find the copy', report: 'report it', index: 'compare the two', fooled: 'check the copycat\'s licence' }),
  G('safety', 's15', 'Mallory\'s hidden order', 'Mallory hides an order in her offer text, hoping Bob\'s agent will overpay.', 'Bob\'s agent ignored the hidden order and refused to overpay.',
    { publish: 'put up an offer with a hidden order', read: 'read the offer', bigask: 'try it: over-charge', naive: 'compare a careless agent', report: 'report the offer' }),
  G('safety', 's20', 'Eve watches', 'Bob buys three licences. Eve, a stranger, tries to work out what he bought.', 'Eve cannot link Bob\'s licences to him, and Bob can still show one when he wants to.',
    { buy3: 'buy three licences', observe: 'look at what anyone can see', prove: 'show one licence', forge: 'try it: claim Bob\'s licence', timing: 'honest limit: look at the timing' }),
].map((x, k) => ({ ...x, n: k + 1 }));
/** Still here, in the order of the spec: reachable under "More scenarios" (and by their old #/sN links). */
export const MORE: { id: string; title: string }[] = [
  { id: 's1', title: 'Alice gets set up' }, { id: 's7', title: 'Grace the fan' }, { id: 's9', title: 'A game soundtrack' }, { id: 's10', title: 'A price change' },
  { id: 's13', title: 'Carol finds under-reporting' }, { id: 's14', title: 'Lost and double payments' }, { id: 's16', title: 'A server goes down' }, { id: 's17', title: 'A refund' },
  { id: 's18', title: 'A label joins with its artists' }, { id: 's21', title: 'Prices in dollars or euros' }, { id: 's22', title: 'Selling only in some countries' },
  { id: 's23', title: 'An exclusive licence' }, { id: 's24', title: 'People who run the network' }, { id: 's27', title: 'An estate with no plan' },
];
export const guideOf = (id: string) => GUIDE.find(g => g.id === id);
export const moreOf = (id: string) => MORE.find(m => m.id === id);
/** The walk order for Previous / Next: the 15, then More. */
export const WALK: string[] = [...GUIDE.map(g => g.id), ...MORE.map(m => m.id)];
export const groupTitle = (id: string) => GUIDE_GROUPS.find(g => g.id === id)?.title ?? 'More scenarios';
