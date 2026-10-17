// The user-test panel. Shown only with ?test=1. Local only: nothing leaves this browser unless you press Export.
import { useEffect, useState } from 'react';
import { useTestkit } from './testkit';
const s = (ms?: number) => ms === undefined ? '–' : `${(ms / 1000).toFixed(1)} s`;
export function TestPanel() {
  const tk = useTestkit(); const [, tick] = useState(0); const [code, setCode] = useState(''); const [min, setMin] = useState(true);
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
  if (!tk.enabled) return null; const c = tk.current();
  const exportIt = () => { const blob = new Blob([tk.exportJson()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `licence-lab-user-test-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`; a.click(); };
  return <div className={`fixed bottom-16 left-3 z-50 rounded-xl border border-amber-400 bg-[#fff7e0] p-2.5 text-[12px] text-[#5b3a00] shadow-lg ${min ? '' : 'w-[260px]'}`} data-testid="test-panel" role="region" aria-label="User test timer">
    <div className="flex items-center justify-between gap-2 font-semibold"><span>Test · {c.participant} · {s(tk.elapsed())}{min && <> · first licence <span data-testid="ttfl-mini">{s(c.firstLicenceMs)}</span></>}</span><button onClick={() => setMin(!min)} className="text-[11px] underline" data-testid="test-toggle">{min ? 'open' : 'hide'}</button></div>
    {!min && <><div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 tabular-nums"><span>Time</span><span>{s(tk.elapsed())}</span><span>First licence</span><span data-testid="ttfl">{s(c.firstLicenceMs)}</span>
      {['stop1', 'stop2', 'stop3', 'rights'].map(k => [<span key={k}>{k === 'rights' ? 'Extra done' : `${k.replace('stop', 'Stop ')} done`}</span>, <span key={k + 'v'}>{s(c.stops[k])}</span>])}<span>Chose</span><span>{c.persona ?? '–'}</span></div>
      <div className="mt-2 flex gap-1"><input value={code} onChange={e => setCode(e.target.value)} placeholder="next code, e.g. A2" aria-label="Participant code" className="w-0 flex-1 rounded border border-amber-300 bg-white px-1.5 py-0.5" />
        <button onClick={() => { tk.newParticipant(code.trim()); setCode(''); location.hash = '/'; }} className="rounded bg-amber-900 px-2 py-0.5 text-white">New</button></div>
      <div className="mt-1.5 flex gap-1"><button onClick={exportIt} className="flex-1 rounded border border-amber-400 bg-white px-2 py-0.5" data-testid="test-export">Export ({tk.sessions().length + 1})</button>
        <button onClick={() => { if (confirm('Delete all test sessions in this browser?')) tk.clearAll(); }} className="rounded px-2 py-0.5 underline">Clear</button></div>
      <p className="mt-1 text-[10px] leading-4 text-amber-800/80">Stored only in this browser. No network, no analytics.</p></>}
  </div>;
}
