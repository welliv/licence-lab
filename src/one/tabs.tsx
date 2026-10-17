// The five tabs under every scenario: What happened · Money flow · Proof · Code · Ask an AI.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Copy, Check, ExternalLink, KeyRound, Upload } from 'lucide-react';
import { CAST, SONGS, nameOf, usd, type Id } from './data/cast';
import type { Licence, Scenario } from './types';
import { world, loadEngine } from './actions';
import { useWorld, type FlowRow } from './world';
import { Rich } from './parts';
import type { CheckRow } from './prove';

export const REPO = 'https://github.com/welliv/licence-lab';
export const DOCS = `${REPO}/blob/one/docs/one/README.md`;
export const REAL_TX = 'https://mutinynet.com/tx/9d7ed8bbb8d8c2d4ff58d9acab928676eae5606b2d89b1b229f5fd7ab99f53bd';
const TABS = [['what', 'What happened'], ['flow', 'Money flow'], ['proof', 'Proof'], ['code', 'Code'], ['ask', 'Ask an AI']] as const;
type TabId = typeof TABS[number][0];

export function Tabs({ sc, initial }: { sc: Scenario; initial?: string }) {
  const [tab, setTab] = useState<TabId>((TABS.find(t => t[0] === initial)?.[0]) ?? 'what'); const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { if (initial && TABS.some(t => t[0] === initial)) setTab(initial as TabId); }, [initial, sc.id]);
  useEffect(() => { const f = (e: Event) => setTab((e as CustomEvent).detail); addEventListener('one:tab', f); return () => removeEventListener('one:tab', f); }, []);
  const key = (e: React.KeyboardEvent, i: number) => { const n = e.key === 'ArrowRight' ? (i + 1) % 5 : e.key === 'ArrowLeft' ? (i + 4) % 5 : e.key === 'Home' ? 0 : e.key === 'End' ? 4 : -1; if (n < 0) return; e.preventDefault(); setTab(TABS[n][0]); refs.current[n]?.focus(); };
  return <section className="mt-6" aria-label="Details">
    <div role="tablist" aria-label="Details" className="noscroll -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      {TABS.map(([id, label], i) => <button key={id} ref={el => { refs.current[i] = el; }} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} tabIndex={tab === id ? 0 : -1} onKeyDown={e => key(e, i)} onClick={() => setTab(id)}
        className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-[14px] font-medium ${tab === id ? 'border-accent text-ink' : 'border-transparent text-mute hover:text-ink'}`}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="pt-3">
      {tab === 'what' && <What sc={sc} />}{tab === 'flow' && <Flow sc={sc} />}{tab === 'proof' && <ProofTab sc={sc} />}{tab === 'code' && <CodeTab sc={sc} />}{tab === 'ask' && <Ask sc={sc} />}
    </div>
  </section>;
}

// ---------- What happened ----------
function What({ sc }: { sc: Scenario }) { useWorld(world); const lines = world.s.log.filter(l => l.sc === sc.id);
  if (!lines.length) return <p className="text-[14px] text-mute">Nothing yet. Tap the first step above.</p>;
  return <ol className="space-y-1.5" data-testid="log">{lines.map(l => <li key={l.id} className={`fade-in flex gap-2 text-[14px] ${l.mark === 'grey' ? 'text-mute' : ''}`}>
    <span aria-hidden className={`w-4 shrink-0 font-bold ${l.mark === 'no' ? 'text-warn' : l.mark === 'grey' ? 'text-mute' : 'text-good'}`}>{l.mark === 'no' ? '✗' : l.mark === 'moon' ? '☾' : l.mark === 'grey' ? '·' : '✓'}</span>
    <span className="w-[62px] shrink-0 font-mono text-[12px] leading-[21px] text-mute">{l.time}</span>
    <span className="min-w-0 flex-1"><span className="sr-only">{l.mark === 'no' ? 'Refused: ' : ''}</span>{l.who && <span className="font-semibold">{l.who}  </span>}{l.cents !== undefined && <span className="font-semibold tabular-nums">{usd(l.cents)}  </span>}<Rich text={l.text} />
      {l.mark !== 'grey' && <button type="button" onClick={() => dispatchEvent(new CustomEvent('one:tab', { detail: 'code' }))} className="ml-1.5 inline-grid min-h-6 min-w-6 place-items-center rounded font-mono text-[11px] text-mute hover:text-ink" aria-label="See the code for this">{'</>'}</button>}</span></li>)}</ol>; }

// ---------- Money flow: lifelines with numbered arrows, then before/after bars ----------
function Flow({ sc }: { sc: Scenario }) { useWorld(world); const rows = world.s.flows.filter(f => f.sc === sc.id); const cast = castOf(sc, rows);
  return <div>
    {rows.length ? <Lifelines cast={cast} rows={rows} /> : <p className="text-[14px] text-mute">Nothing yet. Tap the first step above.</p>}
    <Bars sc={sc} cast={cast} moved={rows.some(r => r.kind === 'money')} />
  </div>; }
const castOf = (sc: Scenario, rows: FlowRow[]) => { const ids = new Set<Id>(); for (const id of sc.cast) ids.add(id); for (const r of rows) for (const x of [r.from, r.to]) if (x in CAST) ids.add(x as Id); return [...ids]; };
function Lifelines({ cast, rows }: { cast: Id[]; rows: FlowRow[] }) {
  const col = 92, top = 54, gap = 46, W = cast.length * col, H = top + rows.length * gap + 14; const x = (id: string) => cast.indexOf(id as Id) * col + col / 2;
  return <div className="noscroll overflow-x-auto rounded-2xl border border-line bg-panel p-2"><svg role="img" aria-label={`Money flow: ${rows.map(r => `${r.n}. ${name(r.from)} to ${name(r.to)}${r.cents ? ' ' + usd(r.cents) : ''}, ${r.label}`).join('; ')}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
    {cast.map(id => <g key={id}><text x={x(id)} y={18} textAnchor="middle" fontSize="16">{CAST[id].emoji}</text><text x={x(id)} y={36} textAnchor="middle" fontSize="11.5" fill="var(--soft)" fontWeight={600}>{short(CAST[id].name)}</text>
      <text x={x(id)} y={49} textAnchor="middle" fontSize="10.5" fill="var(--mute)">{world.s.bal[id] !== undefined ? usd(world.s.bal[id]) : ''}</text><line x1={x(id)} x2={x(id)} y1={top} y2={H - 6} stroke="var(--line)" strokeDasharray="3 4" /></g>)}
    {rows.map((r, i) => { const y = top + 22 + i * gap; const col2 = r.kind === 'no' ? 'var(--warn)' : r.kind === 'key' ? 'var(--accent)' : r.kind === 'money' ? 'var(--good)' : 'var(--mute)';
      const wide = r.from === 'everyone' || r.to === 'everyone' || r.from === 'bitcoin' || r.from === r.to; const x1 = wide ? (r.from === 'bitcoin' || r.from === 'everyone' ? 10 : x(r.from)) : x(r.from); const x2 = wide ? (r.from === r.to && r.from in CAST ? x(r.from) + 30 : W - 10) : x(r.to);
      const lbl = `${r.n}  ${r.cents !== undefined ? usd(r.cents) + '  ' : ''}${r.kind === 'key' ? '🔑 ' : ''}${r.label}`; const mid = Math.max(70, Math.min(W - 70, (x1 + x2) / 2));
      return <g key={i}><line className="draw" x1={x1} x2={x2} y1={y} y2={y} stroke={col2} strokeWidth={r.kind === 'bitcoin' ? 6 : 2} strokeOpacity={r.kind === 'bitcoin' ? .35 : 1} strokeDasharray={r.kind === 'no' ? '5 4' : undefined} markerEnd={r.kind === 'bitcoin' ? undefined : 'url(#arrow)'} style={{ color: col2 }} />
        <text x={mid} y={y - 7} textAnchor="middle" fontSize="11.5" fill="var(--ink)">{r.kind === 'bitcoin' ? '⛓ ' : ''}{lbl}</text></g>; })}
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker></defs>
  </svg></div>; }
const short = (n: string) => n.replace('Harbour Music', 'Harbour').replace("ClipAI's agent", 'ClipAI agent');
const name = (id: string) => id === 'everyone' ? 'everyone' : id === 'bitcoin' ? 'Bitcoin' : nameOf(id);
function Bars({ sc, cast, moved }: { sc: Scenario; cast: Id[]; moved: boolean }) {
  const before = world.s.before[sc.id]; const ids = cast.filter(id => world.s.bal[id] !== undefined);
  if (!moved || !before) return <p className="mt-3 text-[14px] text-mute">{sc.noMoney ?? 'No money has moved yet.'}</p>;
  const max = Math.max(1, ...ids.flatMap(id => [before[id] ?? 0, world.s.bal[id] ?? 0]));
  return <div className="mt-4"><h3 className="text-[14px] font-semibold">Before and after</h3><ul className="mt-2 space-y-2">{ids.map(id => { const a = before[id] ?? 0, b = world.s.bal[id] ?? 0;
    return <li key={id} className="grid grid-cols-[110px_1fr] items-center gap-2 text-[13px]"><span className="truncate">{CAST[id].emoji} {CAST[id].name}</span><span>
      <span className="block h-2 rounded-full bg-panel2"><span className="block h-2 rounded-full bg-mute/50" style={{ width: `${(a / max) * 100}%` }} /></span>
      <span className="mt-0.5 block h-2 rounded-full bg-panel2"><span className={`block h-2 rounded-full ${b >= a ? 'bg-good' : 'bg-warn'}`} style={{ width: `${(b / max) * 100}%`, transition: 'width .6s' }} /></span>
      <span className="tabular-nums text-mute">{usd(a)} → <b className="text-ink">{usd(b)}</b></span></span></li>; })}</ul></div>; }

// ---------- Proof ----------
const USE: Record<Licence['type'], string> = { creator: 'in videos, worldwide, forever', personal: 'just for the buyer, no money made', business: 'in adverts, worldwide, for one year', training: 'AI training, worldwide, forever', subscription: 'any song in the catalogue, in ClipAI\'s videos, for one month' };
const FOR: Partial<Record<Id, string>> = { bobagent: ', for Bob', clipagent: ', for ClipAI' };
const when = (t: number) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function Block({ title, children, tag }: { title?: string; children: ReactNode; tag?: string }) { return <section className="rounded-2xl border border-line bg-panel p-3">{(title || tag) && <h3 className="mb-1 flex items-center gap-2 text-[14px] font-semibold">{tag && <span className="rounded-md bg-warnbg px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-warn">{tag}</span>}{title}</h3>}<div className="text-[14px] text-soft">{children}</div></section>; }
function LicenceCard({ l }: { l: Licence }) { const song = l.song === 'catalogue' ? 'Harbour Music catalogue' : `"${SONGS[l.song].title}" by ${l.song === 'remix' ? 'Frank, with Alice' : nameOf(SONGS[l.song].seller)}`;
  const kind = l.type === 'subscription' ? `Subscription, month ${l.month}` : l.type === 'training' ? 'Training licence' : `${l.type[0].toUpperCase() + l.type.slice(1)} licence`;
  return <div className="rounded-xl bg-panel2 p-3 text-[13.5px]"><div className="text-[14px] font-semibold text-ink"><Rich text={kind} scope="proof" /></div><dl className="mt-1 grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5">
    <dt className="text-mute">Song</dt><dd>{song}</dd><dt className="text-mute">Buyer</dt><dd>{nameOf(l.holder)}{FOR[l.holder] ?? ''}</dd><dt className="text-mute">Use</dt><dd>{USE[l.type]}</dd><dt className="text-mute">Price</dt><dd className="tabular-nums">{usd(l.cents)}</dd>
    <dt className="text-mute">Bought</dt><dd>{when(l.at)}</dd><dt className="text-mute">Dated</dt><dd>on Bitcoin (practice record in this browser; <a className="underline" href={REAL_TX} target="_blank" rel="noreferrer">see the real one<span className="sr-only"> on Mutinynet</span> ↗</a>)</dd></dl></div>; }
function ProofTab({ sc }: { sc: Scenario }) { useWorld(world); const done = (s: string) => world.s.done[`${sc.id}.${s}`];
  const lic = world.s.f.licences.filter(l => l.sc === sc.id);
  return <div className="space-y-3" data-testid="proof">{sc.proof.map((b, i) => { switch (b.kind) {
    case 'licences': return lic.length ? <Block key={i} title={lic.length > 1 ? 'The licences' : 'The licence'}><div className="grid gap-2 sm:grid-cols-2">{lic.map((l, j) => <LicenceCard key={j} l={l} />)}</div></Block> : <Block key={i} title="The licence"><p>Appears here after the purchase.</p></Block>;
    case 'months': return <Block key={i} title="One licence for each month">{lic.length ? <div className="grid gap-2 sm:grid-cols-2">{lic.map((l, j) => <div key={j}><LicenceCard l={l} /><p className="mt-1 text-[12.5px] text-mute">From {new Date(l.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} to {new Date(l.at + 30 * 86400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}{j ? ': it starts the day month 1 ends.' : '.'}</p></div>)}</div> : <p>Appears here after the first month.</p>}</Block>;
    case 'money': return <Block key={i} title="About the money"><p><Rich scope="proof" text="This is test money. $5 here is 100 free test coins (sats), a demo rate of 1 coin = $0.05, not a real price." /></p></Block>;
    case 'thisTime': return <ThisTime key={i} sc={sc} step={b.step} text={b.text} />;
    case 'note': return (!b.step || done(b.step)) ? <Block key={i} title={b.title}><p><Rich scope="proof" text={b.text!} /></p>{b.step && <StepLines k={`${sc.id}.${b.step}`} />}</Block> : null;
    case 'limit': return <Block key={i} title={b.title}><p><Rich scope="proof" text={b.text!} /></p></Block>;
    case 'draft': return <Block key={i} tag="DRAFT"><p><Rich scope="proof" text={b.text!} /></p></Block>;
    case 'cheat': return done(b.step!) ? <Block key={i} title="Cheat caught"><p><Rich scope="proof" text={b.text!} /></p><StepLines k={`${sc.id}.${b.step}`} /></Block> : null;
    case 'file': return <FileCheck key={i} />;
    case 'checks': return <Technical key={i} sc={sc} step={b.step!} highlight={b.highlight} />;
    case 'chain': return <Block key={i} title="Chain of rights">{done('hand') ? <p className="flex flex-wrap items-center gap-2"><span>🎚️ Frank</span><KeyRound size={14} aria-hidden /><span>⚓ Harbour Music</span><span className="text-mute">· {when(done('hand')!.at)} · with Alice's yes (<Rich scope="proof" text="signed" />), dated on Bitcoin</span></p> : <p>Appears here after the handover.</p>}</Block>;
    case 'two': return <Two key={i} sc={sc} />;
    case 'sample': return <Sample key={i} />;
  } return null; })}</div>; }
function StepLines({ k }: { k: string }) { const p = world.s.done[k]?.proof; if (!p) return world.s.done[k] ? <p className="mt-1 text-[13px] text-mute pulse">Checking…</p> : null; return <ul className="mt-1.5 space-y-0.5 text-[13px] text-mute">{p.lines.map((l, i) => <li key={i}><Rich scope="proof" text={l} /></li>)}</ul>; }
function ThisTime({ sc, step, text }: { sc: Scenario; step?: string; text?: string }) {
  const d = step ? world.s.done[`${sc.id}.${step}`] : undefined; const st = step ? sc.steps.find(s => s.id === step) : undefined; const x = st?.real?.(world.ctx());
  let body: ReactNode = <p><Rich scope="proof" text={text ?? 'Test money in your browser.'} /></p>;
  if (st?.real) body = !d ? <p>Run the steps to see whether this sale used a real test payment.</p> : d.real ? <>
    <p><Rich scope="proof" text={`${nameOf(st.who)} paid ${nameOf(x!.seller)} with a real test payment: ${d.real.sats.toLocaleString('en-GB')} test coins in ${(d.real.ms / 1000).toFixed(1)} s, over Lightning.`} /></p>
    <p className="mt-1"><Rich scope="proof" text={`All the free test wallets share one payment server, so the check "the bill came from ${nameOf(x!.seller)}'s own wallet" can't pass here.`} /> It passed in our <a className="underline" href={REAL_TX} target="_blank" rel="noreferrer">full run on Bitcoin's test network ↗</a>.</p>
    {sc.id !== 's1' && <p className="mt-1">The shares were passed on in test money.</p>}</> : d.auto ? <p>This step was done for you, with test money in your browser.</p> : <p>{d.realNote ?? 'Test money in your browser.'}</p>;
  return <Block title="This time">{body}</Block>; }
function Technical({ sc, step, highlight }: { sc: Scenario; step: string; highlight?: number[] }) {
  const d = world.s.done[`${sc.id}.${step}`]; const all = sc.steps.filter(s => !s.hidden).map(s => [s, world.s.done[`${sc.id}.${s.id}`]] as const).filter(([, x]) => x);
  const rows: CheckRow[] | undefined = d?.proof?.checks; const raw = all.map(([s, x]) => ({ step: `${CAST[s.who].name}: ${s.button(world.ctx())}`, ...(x!.proof?.raw ? { record: x!.proof!.raw } : {}), ...(x!.real ? { realTestPayment: x!.real } : {}) }));
  return <details className="rounded-2xl border border-line bg-panel p-3"><summary className="min-h-11 cursor-pointer content-center text-[14px] font-semibold">Show the technical proof</summary>
    {!d ? <p className="mt-2 text-[14px] text-mute">Run the steps first.</p> : !rows ? <p className="mt-2 text-[14px] text-mute pulse">{d.proofError ? `The check could not run: ${d.proofError}` : 'Checking…'}</p> :
      <ol className="mt-2 space-y-1">{rows.map(r => <li key={r.n} className={`flex gap-2 rounded-lg px-2 py-1 text-[13.5px] ${highlight?.includes(r.n) ? 'bg-panel2 ring-1 ring-accent/50' : ''}`}><span aria-hidden className={`w-4 font-bold ${r.ok ? 'text-good' : r.ok === false ? 'text-warn' : 'text-mute'}`}>{r.ok ? '✓' : r.ok === false ? '✗' : '–'}</span><span className="w-5 text-mute">{r.n}.</span><span className="flex-1"><Rich scope="proof" text={r.label} />{r.ok === null && <span className="text-mute"> (not needed here)</span>}</span><span className="sr-only">{r.ok ? 'passes' : r.ok === false ? 'fails' : 'not needed'}</span></li>)}</ol>}
    <div className="mt-3 space-y-1 text-[13px] text-mute">{all.map(([s, x]) => x!.proof && <div key={s.id}><b className="text-soft">{CAST[s.who].name}:</b> {x!.proof.lines.map((l, i) => <span key={i}><Rich scope="proof" text={l} /> </span>)}</div>)}</div>
    <h4 className="mt-3 text-[13px] font-semibold">The raw records (JSON, for developers)</h4>
    <pre className="mt-1 max-h-[320px] overflow-auto rounded-xl bg-panel2 p-2 text-[11.5px] leading-snug text-soft" data-raw="1">{JSON.stringify(raw, null, 1)}</pre></details>; }
function FileCheck() { const [res, setRes] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [over, setOver] = useState(false);
  const check = async (file?: File) => { if (!file) return; setBusy(true); try { const eng = await loadEngine(); const r = await eng.fingerprint(file); const t = r.match ? Object.values(SONGS).find(s => s.cast === r.match!.cast) : undefined;
    setRes(t ? r.match!.preview ? `This is the 30-second preview of "${t.title}", not the full recording. A licence covers the full recording only.` : `✓ This is the exact recording of "${t.title}" that its licences cover. Fingerprint ${r.hash.slice(0, 16)}…` : `✗ This file isn't a recording on sale here. Its fingerprint is ${r.hash.slice(0, 16)}…, which matches no licence.`); } catch (e) { setRes(`Could not read the file: ${(e as Error).message}`); } setBusy(false); };
  return <Block title="Check a file yourself"><p><Rich scope="proof" text="Drop an audio file to see whether it is the exact recording a licence covers. Its fingerprint is worked out on your device; nothing is uploaded." /></p>
    <label onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); void check(e.dataTransfer.files[0]); }} className={`mt-2 flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center ${over ? 'border-accent bg-panel2' : 'border-line'}`}>
      <Upload size={18} aria-hidden /><span className="text-[14px] font-medium text-ink">{busy ? 'Working out the fingerprint…' : 'Drop a file here, or choose one'}</span><input type="file" accept="audio/*" className="sr-only" onChange={e => void check(e.target.files?.[0])} /></label>
    {res && <p role="status" className="mt-2 text-[14px] text-ink">{res}</p>}</Block>; }
function Two({ sc }: { sc: Scenario }) {
  if (sc.id === 's4') { const ok = (s: string) => world.isDone(`s4.${s}`); const Row = ({ n, s, yes }: { n: string; s: string; yes: boolean | null }) => <li className="flex justify-between"><span>{n}</span><span>{s} {yes === null ? '' : yes ? <span className="text-good">✓ agreed</span> : <span className="text-mute">waiting</span>}</span></li>;
    return <Block title="The two sales"><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-panel2 p-3"><div className="font-semibold text-ink">"Night Shift" · Carol · $6.00</div><ul className="mt-1 text-[13.5px]"><Row n="Carol (seller)" s="80%" yes={null} /><Row n="Erin, co-writer" s="20%" yes={ok('erin')} /></ul></div>
      <div className="rounded-xl bg-panel2 p-3"><div className="font-semibold text-ink">"Rain (Frank remix)" · Frank · $7.00</div><ul className="mt-1 text-[13.5px]"><Row n="Frank (seller)" s="60%" yes={null} /><Row n="Alice, original artist" s="40%" yes={ok('alice')} /></ul></div></div></Block>; }
  return <Block title="The two sales"><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-panel2 p-3"><div className="font-semibold text-ink">"Rain" · sold by Alice · $5.00</div><p className="text-[13.5px] text-good">✓ Trent confirms Alice owns it</p></div>
    <div className="rounded-xl bg-panel2 p-3"><div className="font-semibold text-ink">"Rain" as "Alice Official" · sold by Mallory · $2.00</div><p className="text-[13.5px] text-warn">✗ No one confirms the owner</p></div></div></Block>; }
function Sample() { const [all, setAll] = useState(false); const n = world.s.f.videos; const ROUND = ['rain', 'northern', 'nightshift', 'paperboats'] as const;
  if (!n) return <Block title="A sample licence"><p>Appears here after the 500 videos are licensed.</p></Block>;
  const l: Licence = { song: 'rain', type: 'creator', holder: 'clipagent', at: world.s.done['s8.run']?.at ?? Date.now(), cents: 500, sc: 's8' };
  return <Block title="A sample licence"><LicenceCard l={l} /><button type="button" className="mt-2 min-h-11 underline" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Hide the list' : `Show all ${n}`}</button>
    {all && <ol className="mt-1 max-h-[260px] overflow-auto text-[12.5px] tabular-nums text-mute">{Array.from({ length: n }, (_, k) => { const s = SONGS[ROUND[k % 4]]; return <li key={k}>Video {k + 1} · "{s.title}" · {usd(s.priceCents)} · ✓</li>; })}</ol>}</Block>; }

// ---------- Code and Ask an AI ----------
function CopyButton({ text, label }: { text: string; label: string }) { const [ok, setOk] = useState(false);
  return <button type="button" aria-label={label} onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-[13px]">{ok ? <Check size={14} /> : <Copy size={14} />}{ok ? 'Copied' : 'Copy'}</button>; }
function CodeTab({ sc }: { sc: Scenario }) {
  return <div className="space-y-3"><p className="text-[14px] text-soft"><Rich scope="proof" text="The code behind this scenario, simplified. Each record is signed; songs are named by their fingerprint; the buyer pays a bill over Lightning and keeps the receipt; sales are posted on Nostr." /></p>
    <div className="relative"><pre className="overflow-x-auto rounded-2xl border border-line bg-panel p-3 text-[12.5px] leading-relaxed text-soft"><code>{sc.code}</code></pre><div className="absolute right-2 top-2"><CopyButton text={sc.code} label="Copy the code" /></div></div>
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]"><a className="inline-flex min-h-11 items-center gap-1 underline" href={REPO} target="_blank" rel="noreferrer">See the code on GitHub <ExternalLink size={13} aria-hidden /></a><a className="inline-flex min-h-11 items-center gap-1 underline" href={`${REPO}/tree/one/src/lib/mll`} target="_blank" rel="noreferrer">The open music-licence library <ExternalLink size={13} aria-hidden /></a><a className="inline-flex min-h-11 items-center gap-1 underline" href={DOCS} target="_blank" rel="noreferrer">More on GitHub: other scenarios and cheats <ExternalLink size={13} aria-hidden /></a></p></div>; }
function Ask({ sc }: { sc: Scenario }) { return <div className="space-y-2"><p className="text-[14px] text-soft">Copy a prompt into any AI assistant.</p>{sc.prompts.map((p, i) => <div key={i} className="rounded-2xl border border-line bg-panel p-3"><div className="text-[12px] font-semibold text-mute">{i ? 'Build it' : 'Explain it to me'}</div><p className="mt-1 text-[14px]">{p}</p><div className="mt-2"><CopyButton text={p} label={`Copy prompt ${i + 1}`} /></div></div>)}</div>; }
