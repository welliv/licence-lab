// After scenario 11: what to do next. "Put up your own song" reuses the own-song sale (hashed on your device, never uploaded).
import { useMemo, useState } from 'react';
import { ExternalLink, Upload, RotateCcw } from 'lucide-react';
import { Rich, TermScope, newScope, Primary, Secondary } from './parts';
import { loadEngine, startAgain } from './actions';
import { go } from './route';
import { REPO, DOCS } from './tabs';
import { usd } from './data/cast';

const AGENT_CODE = `// Your agent, in a few lines (open music-licence library):
const offer   = await findOffer(songUrl);             // a signed sale, found on Nostr or from a 402 reply
const request = makeRequest(myAgentKey, { offer, use: ['creator-video'] });
const bill    = await askForBill(offer, request);
if (bill.amount > budget.maxPerSong) throw new Error('over budget');
const receipt = await wallet.pay(bill);               // any Lightning wallet with a budget
const licence = { offer, request, bill, receipt };
console.log(verifyLicence(licence).ok);               // anyone can check it, forever`;
const AGENT_PROMPT = 'Connect my AI agent to the open music-licence library from github.com/welliv/licence-lab. It should find a song\'s sale, check who owns it, buy a Creator licence inside my budget of $15 a day and at most $10 a song, and keep every licence so anyone can check it.';

export function EndCard({ moved }: { moved: string | null }) { const scope = useMemo(newScope, []); const [panel, setPanel] = useState<'song' | 'agent' | null>(null);
  return <TermScope.Provider value={scope}><article className="mx-auto max-w-[760px] px-4 py-6 md:px-8 md:py-10">
    {moved && <p className="mb-3 rounded-xl bg-panel2 px-3 py-2 text-[14px] text-soft">That page has moved to the <a className="underline" href={DOCS} target="_blank" rel="noreferrer">guides on GitHub ↗</a>.</p>}
    <h1 className="text-[26px] font-bold">You've seen it all.</h1>
    <p className="mt-1 text-[16px] text-soft"><Rich text="Artists set the price and the rules. Anyone, or any agent, can buy in seconds, and anyone can check, forever." /></p>
    <div className="mt-5 grid gap-3">
      <Choice title="Put up your own song" text="Upload a song, set a price and see a test sale." onClick={() => setPanel(panel === 'song' ? null : 'song')} open={panel === 'song'} primary />
      {panel === 'song' && <OwnSong />}
      <Choice title="Connect your agent" text="Copy the code and the prompt for your agent." onClick={() => setPanel(panel === 'agent' ? null : 'agent')} open={panel === 'agent'} />
      {panel === 'agent' && <div className="space-y-2 rounded-2xl border border-line bg-panel p-3"><pre className="overflow-x-auto rounded-xl bg-panel2 p-2 text-[12.5px] text-soft"><code>{AGENT_CODE}</code></pre><p className="text-[14px]">{AGENT_PROMPT}</p></div>}
      <a href={REPO} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-panel p-4"><span><span className="block text-[16px] font-semibold">See the code on GitHub</span><span className="text-[14px] text-mute">github.com/welliv/licence-lab</span></span><ExternalLink size={16} aria-hidden /></a>
    </div>
    <p className="mt-5 flex flex-wrap gap-4 text-[14px]"><a className="inline-flex min-h-11 items-center underline" href={`${REPO}/blob/one/docs/one/paper.md`} target="_blank" rel="noreferrer">Read the paper ↗</a>
      <button type="button" className="inline-flex min-h-11 items-center gap-1.5 underline" onClick={() => { if (confirm('Start again? Every wallet, licence and step goes back to the start.')) { startAgain(); go('sell'); } }}><RotateCcw size={14} aria-hidden />Start again</button></p>
  </article></TermScope.Provider>; }
function Choice({ title, text, onClick, open, primary }: { title: string; text: string; onClick: () => void; open: boolean; primary?: boolean }) {
  return <button type="button" aria-expanded={open} onClick={onClick} data-primary={primary ? '1' : undefined} className={`flex min-h-11 w-full items-center justify-between rounded-2xl border p-4 text-left ${primary ? 'border-accent bg-accent text-accentink' : 'border-line bg-panel'}`}><span><span className="block text-[16px] font-semibold">{title}</span><span className={`text-[14px] ${primary ? '' : 'text-mute'}`}>{text}</span></span><span aria-hidden>{open ? '–' : '+'}</span></button>; }
function OwnSong() { const [file, setFile] = useState<File | null>(null); const [price, setPrice] = useState(500); const [busy, setBusy] = useState(false); const [out, setOut] = useState<string[] | null>(null);
  const sell = async () => { if (!file) return; setBusy(true); try { const eng = await loadEngine(); const r = await eng.ownSong(file, price); setOut(r); } catch (e) { setOut([`Something went wrong: ${(e as Error).message}`]); } setBusy(false); };
  return <div className="space-y-3 rounded-2xl border border-line bg-panel p-3">
    <label className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line p-3 text-center"><Upload size={18} aria-hidden /><span className="text-[14px] font-medium">{file ? file.name : 'Choose a song file'}</span><span className="text-[12.5px] text-mute">It stays on your device.</span><input type="file" accept="audio/*" className="sr-only" onChange={e => { setFile(e.target.files?.[0] ?? null); setOut(null); }} /></label>
    <div className="flex flex-wrap items-center gap-2"><span className="text-[14px]"><Rich text="Creator licence price" /></span><Secondary label="Lower the price" onClick={() => setPrice(Math.max(100, price - 100))}>–</Secondary><output className="w-16 text-center font-semibold tabular-nums">{usd(price)}</output><Secondary label="Raise the price" onClick={() => setPrice(Math.min(2000, price + 100))}>+</Secondary></div>
    <Primary onClick={sell} disabled={!file} busy={busy}>{busy ? 'Selling…' : 'Sell it: see a test sale'}</Primary>
    {out && <ul role="status" className="space-y-1 text-[14px]">{out.map((l, i) => <li key={i}>{l}</li>)}</ul>}</div>; }
