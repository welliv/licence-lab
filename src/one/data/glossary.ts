// Tap-to-explain. The only technical words allowed (scenarios.md §0.5). Main-surface terms first, then Proof/Code-only terms.
export interface Term { key: string; match: RegExp; text: string; proofOnly?: boolean }
const t = (key: string, match: RegExp, text: string, proofOnly = false): Term => ({ key, match, text, proofOnly });
export const GLOSSARY: Term[] = [
  t('test money', /\btest money\b/i, 'Pretend dollars for this demo. The real test payments use free test coins with no value.'),
  t('subscription', /\bsubscri(?:ption|bed|be)s?\b/i, 'Pay every month for a whole catalogue, and stop whenever you like.'),
  t('catalogue', /\bcatalogues?\b/i, 'A label\'s whole list of songs.'),
  t('Personal', /\bPersonal\b/, 'Just for you, with no money made from it ($1).'),
  t('Creator', /\bCreator\b/, 'Use the song in your own videos, forever ($5).'),
  t('Business', /\bBusiness\b/, 'Use the song in adverts, for one year ($50).'),
  t('licence', /\blicen[cs]es?\b|\blicensed\b/i, 'Written permission to use a song in a certain way, at a certain price.'),
  t('agent', /\bagents?\b/i, 'A computer program that buys or sells for a person, inside rules that person sets.'),
  t('budget', /\bbudgets?\b/i, 'The most an agent may spend, set by a person.'),
  t('wallet', /\bwallets?\b/i, 'Where each person\'s money sits. Here it\'s test money.'),
  t('share', /\bshares?\b/i, 'The part of each sale that goes to each person who made the song.'),
  t('proof', /\bproof\b/i, 'A record anyone can check that this licence was bought, by whom and when.'),
  t('Bitcoin', /\bBitcoin\b/, 'A public record no one can change. We save the date of each sale there.'),
  t('rights', /\brights\b/i, 'Ownership of the song itself, which can be sold or passed on.'),
  t('Lightning', /\bLightning\b/, 'The way Bitcoin payments arrive in seconds.', true),
  t('Nostr', /\bNostr\b/, 'An open network where Alice posts her songs for sale, so no company owns her shop.', true),
  t('signature', /\bsignatures?\b|\bsigned\b|\bsigns\b/i, 'A mark only that person\'s account can make, so nobody can fake their yes.', true),
  t('fingerprint', /\bfingerprints?\b/i, 'A short code made from the exact song file. Change one note and the code changes.', true),
  t('bill', /\bbills?\b/i, 'What the seller sends and the buyer pays.', true),
  t('receipt', /\breceipts?\b/i, 'Proof that the bill was paid.', true),
  t('timestamp', /\btimestamp(?:s|ed)?\b/i, 'The date saved on Bitcoin.', true),
  t('sats', /\bsats\b/, 'Bitcoin\'s smallest unit. Here they are free test coins.', true),
  t('402', /\b402\b/, 'The web\'s "payment required" code, which agents understand.', true),
  t('Mutinynet', /\bMutinynet\b/, 'A Bitcoin test network, used for our real proof run.', true),
];
/** Words that must never reach the screen (checked by the jargon test). */
export const NEVER = ['bundle', 'binding', 'node', 'OP_RETURN', 'verifyLicence', 'NIP', 'kind', 'npub', 'preimage', 'invoice', 'relay', 'NWC', 'faucet', 'hash', 'REPL', 'Echo', 'Eve', 'Under the hood'];
