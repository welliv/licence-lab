// In-page REPL: runs your own JavaScript against this scenario's Lab world, in your browser only.
import { useState } from 'react';
import { Terminal } from 'lucide-react';
import { session, bump } from '../store';
import { Button, Card } from '../bits';
import * as verify from '../../lib/mll/verify';
import * as events from '../../lib/mll/events';
import { SNIPPETS } from '../snippets';
const EXAMPLES = ["Object.keys(w.a)", "w.balances", "await w.verify(w.a[Object.keys(w.a).find(k => k.startsWith('bundle'))])", "w.chain.tip", "w.pub('alice')", "Object.keys(events)"];
const show = (v: unknown) => { try { return typeof v === 'string' ? v : JSON.stringify(v, (_k, x) => typeof x === 'bigint' ? x.toString() : x instanceof Uint8Array ? `Uint8Array(${x.length})` : x, 2) ?? String(v); } catch { return String(v); } };
export function Repl({ sid }: { sid: string }) {
  const s = session(sid); const [code, setCode] = useState(EXAMPLES[0]); const [hist, setHist] = useState<{ code: string; out: string; err?: boolean }[]>([]);
  const run = async () => { try { const fn = new Function('w', 'verify', 'events', `return (async () => { return (${code}); })()`); const r = await fn(s.lab, verify, events); setHist(h => [{ code, out: show(r) }, ...h].slice(0, 20)); bump(); }
    catch (e: any) { setHist(h => [{ code, out: e.message, err: true }, ...h].slice(0, 20)); } };
  const ex = SNIPPETS.find(x => x.id === 'repl')!;
  return <div className="space-y-3"><Card className="p-3"><div className="mb-1 flex items-center gap-2 text-[13px] font-semibold"><Terminal size={14} />REPL</div>
    <div className="mb-2 text-[12px] text-neutral-500">Type an expression. <code>w</code> is this scenario's Lab world, <code>verify</code> and <code>events</code> are the protocol library. It runs only in your browser. {!s.lab && <b>Set up the parties first.</b>}</div>
    <div className="flex gap-2"><input aria-label="REPL input" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 font-mono text-[12px]" /><Button disabled={!s.lab} onClick={run}>Run</Button></div>
    <div className="mt-2 flex flex-wrap gap-1">{EXAMPLES.map(x => <button key={x} onClick={() => setCode(x)} className="rounded-full border border-neutral-200 px-2 py-0.5 font-mono text-[10px] hover:bg-neutral-50">{x.length > 40 ? x.slice(0, 40) + '…' : x}</button>)}</div>
    {hist.map((h, i) => <div key={i} className="mt-2 rounded-md bg-neutral-50 p-2 font-mono text-[11px]"><div className="text-neutral-500">› {h.code}</div><pre className={`scroll-thin max-h-60 overflow-auto whitespace-pre-wrap ${h.err ? 'text-red-700' : 'text-neutral-800'}`}>{h.out}</pre></div>)}</Card>
    <Card className="p-3"><div className="text-[13px] font-semibold">{ex.title}</div><div className="mb-2 text-[12px] text-neutral-500">{ex.desc}</div><pre className="rounded-md bg-neutral-50 p-3 font-mono text-[11.5px]">{ex.code}</pre></Card></div>;
}
