'use client';

import { useEffect, useRef } from 'react';

type Word = { keyword: string; weight: number };

const CFILL: Record<number, string> = { 5: '#16130f', 4: '#2c2823', 3: '#56514a', 2: '#8b857b', 1: '#c2bdb4' };
const FACES = { serif: 'Fraunces', pop: 'Mochiy Pop One', round: 'Zen Maru Gothic', sans: 'Geist', mono: 'Geist Mono' };
function face(w: number, i: number) {
  if (w >= 5) return i % 2 ? FACES.pop : FACES.serif;
  if (w === 4) return i % 2 ? FACES.serif : FACES.round;
  if (w === 3) return i % 3 === 0 ? FACES.round : FACES.sans;
  if (w === 2) return FACES.sans;
  return FACES.mono;
}
function fweight(f: string) {
  if (f === FACES.pop) return 400;
  if (f === FACES.round) return 700;
  if (f === FACES.serif) return 500;
  if (f === FACES.sans) return 600;
  return 500;
}
const SZ: Record<number, number> = { 5: 48, 4: 35, 3: 26, 2: 20, 1: 15 };

// 3D 回転スフィア（球面に文字が張り付く・グリグリ回せる・多書体）
export default function WordCloud({ words }: { words: Word[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !words.length) return;
    let tc: any;
    let cancelled = false;

    (async () => {
      try {
        const f = (document as any).fonts;
        if (f?.load) {
          await Promise.all([
            f.load('500 40px Fraunces'),
            f.load('400 60px "Mochiy Pop One"'),
            f.load('700 40px "Zen Maru Gothic"'),
            f.load('600 24px Geist'),
            f.load('500 16px "Geist Mono"'),
          ]).catch(() => {});
        }
        await f?.ready;
      } catch {}
      if (cancelled || !el) return;
      const TagCloud = (await import('TagCloud')).default;
      if (cancelled || !el) return;

      const W = Math.max(el.clientWidth, 300);
      const radius = Math.round(Math.min(W * 0.46, 420));
      el.style.height = radius * 2 + 50 + 'px';
      el.innerHTML = '';

      const texts = words.map((w) => w.keyword);
      tc = TagCloud(el, texts, { radius, maxSpeed: 'fast', initSpeed: 'normal', direction: 135, keep: true });

      const u = radius / 300;
      const apply = () => {
        const items = el.querySelectorAll('.tagcloud--item');
        items.forEach((node, i) => {
          const wd = words[i]?.weight ?? 2;
          const f = face(wd, i);
          const s = node as HTMLElement;
          s.style.fontFamily = `'${f}', sans-serif`;
          s.style.fontWeight = String(fweight(f));
          s.style.color = CFILL[wd] ?? '#888';
          s.style.fontSize = Math.round((SZ[wd] ?? 18) * u) + 'px';
        });
      };
      requestAnimationFrame(apply);
      setTimeout(apply, 80);
    })();

    return () => { cancelled = true; try { tc?.destroy?.(); } catch {} if (el) el.innerHTML = ''; };
  }, [words]);

  return <div className="cloud cloud3d" ref={ref} />;
}
