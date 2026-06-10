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
const SZ: Record<number, number> = { 5: 44, 4: 33, 3: 25, 2: 19, 1: 14 };
const NS = 'http://www.w3.org/2000/svg';

// 3D 回転スフィア（球面に文字＋中心に淡く輝くコア＋各ワード中心へ放射状の細い線）
export default function WordCloud({ words }: { words: Word[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !words.length) return;
    let tc: any;
    let cancelled = false;
    let rafId = 0;

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
      const radius = Math.round(Math.min(W * 0.42, 400));
      el.innerHTML = '';

      const texts = words.map((w) => w.keyword);
      // TagCloud は el を 2*radius 四方に整形し、items は中心(=radius,radius)からの相対座標 item.x/y を持つ
      tc = TagCloud(el, texts, { radius, maxSpeed: 'fast', initSpeed: 'normal', direction: 135, keep: true });
      try { (tc as any).depth = radius * 1.05; } catch {} // 遠近感

      const u = radius / 300;
      const apply = () => {
        el.querySelectorAll('.tagcloud--item').forEach((node, i) => {
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

      // --- 中心コア＋放射状の線（中心は (radius, radius) ＝球の真の中心）---
      const SW = 2 * radius;
      const c = radius;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'cloud-lines');
      svg.setAttribute('viewBox', `0 0 ${SW} ${SW}`);
      svg.innerHTML =
        `<defs><radialGradient id="coreG" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="rgba(255,255,255,.95)"/>` +
        `<stop offset="28%" stop-color="rgba(150,170,215,.45)"/>` +
        `<stop offset="100%" stop-color="rgba(150,170,215,0)"/></radialGradient></defs>`;
      const linesG = document.createElementNS(NS, 'g');
      svg.appendChild(linesG);
      const glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('cx', String(c)); glow.setAttribute('cy', String(c));
      glow.setAttribute('r', String(Math.round(radius * 0.36)));
      glow.setAttribute('fill', 'url(#coreG)'); glow.setAttribute('class', 'core-glow');
      svg.appendChild(glow);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', String(c)); dot.setAttribute('cy', String(c)); dot.setAttribute('r', '5');
      dot.setAttribute('fill', 'rgba(110,130,180,.85)');
      svg.appendChild(dot);
      el.insertBefore(svg, el.firstChild); // ワードの背面

      const its: any[] = (tc as any).items || [];
      const lines = its.map(() => {
        const ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', String(c)); ln.setAttribute('y1', String(c));
        ln.setAttribute('stroke', 'rgb(95,108,140)'); ln.setAttribute('stroke-width', '1');
        linesG.appendChild(ln);
        return ln;
      });

      const tick = () => {
        if (cancelled) return;
        const cur: any[] = (tc as any).items || [];
        for (let i = 0; i < lines.length && i < cur.length; i++) {
          const item = cur[i];
          const x = c + item.x; // ワードの中心 ＝ 球中心 + item.x
          const y = c + item.y;
          lines[i].setAttribute('x2', x.toFixed(1));
          lines[i].setAttribute('y2', y.toFixed(1));
          const op = parseFloat(item.el?.style.opacity || '1');
          lines[i].setAttribute('stroke-opacity', (op * op * 0.22).toFixed(3)); // 奥は薄く
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      try { tc?.destroy?.(); } catch {}
      if (el) el.innerHTML = '';
    };
  }, [words]);

  return <div className="cloud cloud3d" ref={ref} />;
}
