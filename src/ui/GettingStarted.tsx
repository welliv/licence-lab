import { useState } from 'react';
import { Button, Cover, Player, cx } from './bits';
import { CAST } from '../engine/cast';
import { go } from './store';
const Who = ({ id, big }: { id: string; big?: boolean }) => <div className="flex flex-col items-center"><span className={big ? 'text-[56px] leading-none' : 'text-[26px] leading-none'}>{CAST[id].emoji}</span><span className={cx('mt-1.5 text-neutral-700', big ? 'text-[14px] font-medium' : 'text-[12px]')}>{CAST[id].name}</span></div>;
const PARTS = [['📜', 'Offer'], ['🤝', 'Consents'], ['🔗', 'Binding'], ['✍️', 'Request'], ['🧾', 'Invoice'], ['🔑', 'Preimage']];
const SLIDES = [
  { title: 'Meet Ava and "Rain"', body: <>
      <div className="flex items-end justify-center gap-8"><Cover size={96} /><Who id="ava" big /></div>
      <p className="mt-6 text-[16px] text-neutral-600">Ava made a song with Jay, Nova and Lena. She wants anyone to license it in seconds.</p>
      <p className="mt-8 text-[13px] text-neutral-500">…and soon some buyers will join too.</p>
      <div className="mt-3 flex justify-center gap-6"><Who id="mia" /><Who id="sam" /><Who id="streamco" /><Who id="scout" /></div>
      <div className="mt-6 flex justify-center"><Player /></div></> },
  { title: 'One licence, six signed parts', body: <>
      <div className="flex flex-wrap justify-center gap-3">{PARTS.map(([e, t]) => <div key={t} className="flex w-[92px] flex-col items-center rounded-xl border border-neutral-200 bg-white py-3"><span className="text-[30px] leading-none">{e}</span><span className="mt-2 text-[12px] text-neutral-700">{t}</span></div>)}</div>
      <p className="mt-6 text-[16px] text-neutral-600">Anyone can check a licence with nine checks. No company has to be trusted, and no one has to be online.</p></> },
  { title: 'Explore real-world scenarios', body: <>
      <div className="text-[64px] leading-none">🚀</div>
      <p className="mt-6 text-[16px] text-neutral-600">24 scenarios, from Ava's first offer to agents buying at scale, plus 19 attacks to try.</p>
      <p className="mt-3 text-[16px] text-neutral-600">Signatures and checks are real. Try live test wallets for real Lightning payments.</p></> },
];
export function GettingStarted() {
  const [i, setI] = useState(0); const s = SLIDES[i]; const last = i === SLIDES.length - 1;
  return <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-10">
    <div key={i} className="fade-in w-full max-w-[640px] text-center">
      <h1 className="mb-8 text-[30px] font-bold tracking-tight">{s.title}</h1>{s.body}
      <div className="mt-10 flex justify-center">{last ? <Button onClick={() => go('s1')}>Try the first scenario →</Button> : <Button onClick={() => setI(i + 1)}>Next →</Button>}</div>
      <div className="mt-5 flex justify-center gap-1.5">{SLIDES.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={cx('h-1.5 w-1.5 rounded-full', k === i ? 'bg-neutral-900' : 'bg-neutral-300')} />)}</div>
    </div></div>;
}
