// Part 7: the two scenarios added with the vision fix, so the hood matches the main path.
// S28: one song, three licence types (Personal is a DRAFT type). S29: ClipAI's agent inside a monthly budget, plus the Harbour Music catalogue subscription (DRAFT).
import type { Scenario } from './types';
import { F, short } from './common';
import { tagv, sha256hex } from '../engine/lab';
import { CATALOGUE, LICENCES, licence, defaultPriceCents, ensureOffer, licenseTrack, toSats, type LicenceType } from '../engine/catalogue';
import { setBudget, videoLicences, subscribe, renew, catalogueHash, budgetLeftCents, PLAN, VIDEOS, BUDGET_DEFAULT_CENTS } from '../engine/company';
import { trackFile } from '../engine/track';
import type { Out } from '../engine/actions';
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const RAIN = CATALOGUE[0];
const buy = (type: LicenceType) => async (lab: any): Promise<Out> => {
  const c = defaultPriceCents(RAIN, type); const r = await licenseTrack(lab, RAIN, lab.trackHash, { type }); lab.a[`s28.${type}`] = r.bundle;
  return { ok: r.verdict.result.ok, badge: 'real', verdict: r.verdict, summary: `${licence(type).label} licence bought for ${usd(c)} (${toSats(c)} sats). ${r.split.map(s => `${s.who} ${usd(s.sats * 5)}`).join(', ')}.`,
    fields: [F('use', r.bundle.offer.tags.find((t: string[]) => t[0] === 'use')!.slice(1).join(' · ')), F('price', `${toSats(c)} sats (${usd(c)} at 1 test sat = $0.05)`, false), F('offer', short(r.bundle.offer.id))], json: r.bundle.offer };
};
export const S28: Scenario = {
  id: 's28', n: 28, part: 2, emoji: '🏷️', title: 'Personal, Creator or Business', complexity: 'easy', status: 'v1 + later',
  summary: 'Alice sells "Rain" three ways: Personal $1, Creator $5 and Business $50. Bob buys each, and the split follows the price.',
  situation: 'Alice wants fans, video makers and companies to pay different prices for different uses of the same song.',
  education: 'Each licence type is its own signed offer naming a use: personal (a DRAFT use the Lab adds), creator-video, or advert for one year. The co-owners agree to each offer, and the shares are worked out from its price.',
  how: [{ title: 'One offer per use', description: 'The use is inside the signed offer, so a licence cannot be stretched to a use it does not name.' }, { title: 'Draft type', description: '"Personal" is not in the spec yet; the Lab marks it draft.' }],
  cast: ['alice', 'carol', 'dave', 'bob'],
  steps: [
    { id: 'offers', actor: 'alice', title: 'Put "Rain" on sale three ways', button: 'Put it on sale', narration: 'Alice signs three offers for the same recording, one per licence type. Carol and Dave agree to each.',
      run: lab => { const names = LICENCES.map(l => ensureOffer(lab, RAIN, lab.trackHash, l.id, defaultPriceCents(RAIN, l.id)));
        return { ok: true, badge: 'real', summary: `Three signed offers: ${LICENCES.map(l => `${l.label} ${usd(defaultPriceCents(RAIN, l.id))}`).join(', ')}.`, fields: names.map((n, k) => F(`${LICENCES[k].label} offer`, `${short(lab.a[n].id)} · use ${tagv(lab.a[n], 'use')}`)) }; } },
    { id: 'personal', actor: 'bob', title: 'Buy a Personal licence', button: 'Buy Personal, $1', narration: 'Bob buys the Personal licence: just for him, no money made.', run: buy('personal') },
    { id: 'creator', actor: 'bob', title: 'Buy a Creator licence', button: 'Buy Creator, $5', narration: 'Bob buys the Creator licence: use in his videos, forever.', run: buy('creator') },
    { id: 'business', actor: 'bob', title: 'Buy a Business licence', button: 'Buy Business, $50', narration: 'Bob buys the Business licence: use in ads for one year.', run: buy('business') },
    { id: 'stretch', actor: 'bob', title: 'Try it: use the Personal licence in an advert', button: 'Use it in an advert', expectFail: true, narration: 'Bob tries to show his $1 Personal licence to an advert platform.',
      run: lab => { const b = lab.a['s28.personal']; if (!b) throw new Error('no Personal licence yet'); const use = b.offer.tags.find((t: string[]) => t[0] === 'use')![1];
        return { ok: use === 'advert', badge: 'real', summary: `Refused: the licence names the use "${use}", and an advert needs "advert". The use is signed, so it cannot be changed.` }; } },
  ],
  proven: 'One recording can carry several signed offers, each naming its own use and price. Shares are whole cents and whole sats for every price. A licence only covers the use it names.',
  canGoWrong: [{ text: 'Someone edits the signed offer, for example its price: the signature breaks', attack: 'A1' }],
  limits: ['"Personal" is a draft licence type, not in the spec yet.'],
  prompts: [{ title: 'Licence types', prompt: 'Add Personal, Creator and Business licence types to a music shop built on the music-licence library. Each is a separate signed offer with its own use tag and price; co-owners consent to each.' }],
};
const SHAS = () => Object.fromEntries(CATALOGUE.map(c => [c.cast, trackFile(`track:${c.cast}`)?.sha256 ?? sha256hex(`demo track: ${c.title}`)]));
const CAT = () => { const s = SHAS(); return catalogueHash(['dave', 'erin', 'frank'].map(k => s[k])); };
const budgetOf = (lab: any) => (lab.a['s29.budget'] as number | undefined) ?? BUDGET_DEFAULT_CENTS;
const month = async (lab: any, f: typeof subscribe, cents: number): Promise<Out> => { const r = await f(lab, CAT(), cents);
  if (!r.ok) return { ok: false, badge: 'real', summary: `Refused by the wallet: ${r.reason}. ${usd(r.budgetLeftCents)} left this month.` };
  const d = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return { ok: r.verdict.result.ok, badge: 'real', verdict: r.verdict, summary: `Month ${r.month}: paid ${usd(PLAN.priceCents)} on ${d(r.paidAt)}, licence ${d(r.from)} to ${d(r.until)}. ${usd(r.budgetLeftCents)} of the budget left.`,
    fields: [F('use', r.bundle.offer.tags.find((t: string[]) => t[0] === 'use')!.slice(1).join(' · ')), F('catalogue fingerprint', short(r.bundle.offer.tags.find((t: string[]) => t[0] === 'x')![1], 10)), F('split', r.split.map(s => `${s.who} ${usd(s.sats * 5)}`).join(', '), false)] };
};
export const S29: Scenario = {
  id: 's29', n: 29, part: 2, emoji: '🎞️', title: "ClipAI's budget and a catalogue subscription", complexity: 'medium', status: 'v1 + later',
  summary: "ClipAI's agent licenses songs for 500 user videos inside a monthly budget a person set, then subscribes to the Harbour Music catalogue for $99 a month.",
  situation: 'ClipAI makes short videos for its users. Each video needs a licence, and the finance team wants a hard monthly limit.',
  education: 'The budget is a wallet connection that can only pay, with a limit per payment and per month. The subscription is a DRAFT: a one-month catalogue licence that the agent renews before it ends, inside the budget.',
  how: [{ title: 'Budget in the wallet', description: 'The wallet refuses any payment past the limits, whatever the agent wants.' }, { title: 'Draft subscription', description: 'No subscription event exists yet: each month is its own licence with a one-month use.' }],
  cast: ['clipai', 'clipagent', 'harbour', 'dave', 'erin', 'frank'],
  steps: [
    { id: 'budget', actor: 'clipai', title: 'Set the monthly budget', button: 'Set the budget', narration: 'A person at ClipAI sets the monthly budget and a $100 limit per payment.',
      inputs: [{ key: 'usd', label: 'Monthly budget in dollars', type: 'number', default: 3000 }],
      run: (lab, i) => { const c = Math.max(100, Math.round(Number(i.usd) || 3000)) * 100; lab.a['s29.budget'] = c; setBudget(lab, c); const w = lab.nwc['clipagent'];
        return { ok: true, badge: 'sim', summary: `Budget set: ${usd(c)} a month, at most $100 a payment.`, fields: [F('monthly cap', `${w.monthlyCapSat} sats`), F('per payment', `${w.maxPerPaymentSat} sats`)] }; } },
    { id: 'videos', actor: 'clipagent', title: `License songs for ${VIDEOS} user videos`, button: 'License the videos', narration: 'The agent buys one Creator licence per video, across five songs, until the videos are done or the budget says stop.',
      run: async lab => { const r = await videoLicences(lab, SHAS(), budgetOf(lab), VIDEOS);
        return { ok: r.bought > 0, badge: 'real', summary: r.refused ? `${r.bought} videos licensed, then the wallet refused: budget reached. ${r.refused} wait.` : `${r.bought} videos licensed for ${usd(r.spentSats * 5)}. ${r.sampleOk} of ${r.sample} re-checked: all real.`, fields: [F('spent', `${r.spentSats} sats`), F('budget left', usd(budgetLeftCents(lab)), false)] }; } },
    { id: 'subscribe', actor: 'clipagent', title: 'Subscribe to the Harbour Music catalogue', button: 'Subscribe, $99 a month', narration: 'The agent pays Harbour Music $99 for one month of its whole catalogue. Harbour keeps 30% and pays Dave, Erin and Frank.', run: lab => month(lab, subscribe, budgetOf(lab)) },
    { id: 'renew', actor: 'clipagent', title: 'Renew next month', button: 'Renew', narration: 'A month later the budget starts again, and the agent renews the day before the licence ends. The new month starts the day the old one ends.', run: lab => month(lab, renew, budgetOf(lab)) },
    { id: 'cut', actor: 'clipagent', title: 'Try it: renew after the budget is cut to $50', button: 'Renew on $50', expectFail: true, narration: 'The finance team cuts the budget to $50. The agent tries to renew anyway.', run: lab => month(lab, renew, 5_000) },
  ],
  proven: 'An agent can buy at scale and subscribe, but the wallet, not the agent, holds the limit a person set. Each month of the catalogue is a licence anyone can check.',
  canGoWrong: [{ text: 'Many payments at once try to slip past the cap', attack: 'A8' }, { text: 'A seller over-charges the agent', attack: 'A6' }],
  limits: ['The subscription is a draft: the spec has no recurring licence yet.', 'The budget here is enforced by the Lab wallet; a real NWC wallet enforces its own limits.'],
  prompts: [{ title: 'Budgeted agent', prompt: 'Build a buying agent that licenses one song per user video with the music-licence library, pays through an NWC connection with a monthly cap, and renews a one-month catalogue licence before it expires.' }],
};
export const PART7 = [S28, S29];
