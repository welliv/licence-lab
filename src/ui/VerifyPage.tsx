import { useState } from 'react';
import { ShieldCheck, Upload } from 'lucide-react';
import { Lab, type LicenceBundle, type Verdict } from '../engine/lab';
import { Button, Card } from './bits';
import { allLabs, extraLabs } from './store';
import { NineChecks } from './tabs/Tabs';
import { honestWorld } from '../engine/attacks';
export function VerifyPage() {
  const [text, setText] = useState(''); const [v, setV] = useState<Verdict | null>(null); const [note, setNote] = useState(''); const [useChain, setUseChain] = useState(true);
  const example = async () => { const lab = new Lab('rain'); const b = await honestWorld(lab); extraLabs.push(lab); setText(JSON.stringify(b, null, 2)); setV(null); setNote('Example loaded: Mia\'s licence from an honest purchase.'); };
  const run = async () => { let b: LicenceBundle; try { b = JSON.parse(text); } catch (e: any) { setNote('Not valid JSON: ' + e.message); return; }
    const labs = [...allLabs(), ...extraLabs]; const h = (b as any).anchor?.height; const lab = labs.find(l => h !== undefined && l.chain.at(h)) ?? labs[0] ?? new Lab('rain');
    const r = await lab.verify(b, { chain: useChain ? undefined : false }); setV(r); setNote(useChain ? `Checked against ${lab.chain.method}.` : 'Checked without a chain: checks 1 to 8 only.'); };
  const onFile = async (f?: File) => { if (f) setText(await f.text()); };
  return <div className="mx-auto max-w-[1100px] px-5 py-6 md:px-8"><h1 className="text-[20px] font-semibold">🛡️ Verify a bundle</h1><p className="mt-1 text-[14px] text-neutral-600">Paste or drop a licence bundle (JSON). The real verifyLicence runs in your browser.</p>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]"><Card className="p-4" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
      <textarea aria-label="Bundle JSON" value={text} onChange={e => setText(e.target.value)} placeholder='{"version":1,"offer":{...},"binding":{...},...}' spellCheck={false} className="h-[420px] w-full rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11.5px]" />
      <div className="mt-2 flex flex-wrap items-center gap-2"><Button disabled={!text} onClick={run}><ShieldCheck size={14} />Verify</Button><Button variant="outline" onClick={example}>Load an example</Button>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[13px] hover:bg-neutral-50"><Upload size={14} />Open file<input type="file" accept="application/json" className="hidden" onChange={e => onFile(e.target.files?.[0])} /></label>
        <label className="ml-auto inline-flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={useChain} onChange={e => setUseChain(e.target.checked)} />Check the timestamp and revocations (simulated chain)</label></div>
      {note && <div className="mt-2 text-[12px] text-neutral-500">{note}</div>}</Card>
      <Card className="p-4"><div className="mb-2 text-[13px] font-semibold">{v ? (v.result.ok ? `✓ Valid licence (${v.passed}/9, ${v.ms.toFixed(0)} ms)` : `✗ Rejected: ${v.result.reason}`) : 'Result'}</div><NineChecks v={v ?? undefined} /></Card></div></div>;
}
