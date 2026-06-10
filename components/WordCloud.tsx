'use client';

import { useEffect, useRef } from 'react';
import { forceSimulation, forceX, forceY, forceManyBody, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';

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
function weightFor(f: string) {
  if (f === FACES.pop) return 400;
  if (f === FACES.round) return 700;
  if (f === FACES.serif) return 500;
  if (f === FACES.sans) return 600;
  return 500;
}
const easeOutBack = (x: number) => { const c1 = 2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export default function WordCloud({ words }: { words: Word[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !words.length) return;
    let stopped = false;
    let sim: any;

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
      if (stopped || !el) return;
      const W = Math.max(el.clientWidth, 320);
      const H = Math.round(Math.max(340, Math.min(600, W * 0.62)));
      el.style.height = H + 'px';
      el.style.minHeight = H + 'px';
      const SIZE: Record<number, number> = { 5: Math.min(104, W / 11), 4: W / 17, 3: W / 27, 2: W / 42, 1: W / 64 };

      el.innerHTML = '';
      const svg = select(el).append('svg').attr('class', 'cloud-svg')
        .attr('viewBox', `${-W / 2} ${-H / 2} ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');
      const root = svg.append('g');

      const nodes: any[] = words.map((d, i) => {
        const f = face(d.weight, i);
        return { text: d.keyword, w: d.weight, base: SIZE[d.weight] ?? 16, font: f, weight: weightFor(f), fill: CFILL[d.weight] ?? '#888', phase: i * 0.7, amp: 0.035 + (5 - d.weight) * 0.016, x: 0, y: 0, born: 0 };
      });

      const meas = root.append('text').attr('opacity', 0);
      nodes.forEach((n) => {
        meas.attr('font-family', n.font).attr('font-weight', n.weight).attr('font-size', n.base).text(n.text);
        const b = (meas.node() as SVGTextElement).getBBox();
        n.r = Math.max((b.width / 2) * 0.98, b.height / 2) + 8;
      });
      meas.remove();

      let groups: any;
      let tcount = 0;
      const live: any[] = [];

      function ticked() {
        tcount++;
        if (!groups) return;
        for (const n of live) {
          const lx = Math.max(0, W / 2 - 6 - n.r), ly = Math.max(0, H / 2 - 6 - n.r);
          if (n.x < -lx) { n.x = -lx; if (n.vx < 0) n.vx *= -0.4; } else if (n.x > lx) { n.x = lx; if (n.vx > 0) n.vx *= -0.4; }
          if (n.y < -ly) { n.y = -ly; if (n.vy < 0) n.vy *= -0.4; } else if (n.y > ly) { n.y = ly; if (n.vy > 0) n.vy *= -0.4; }
        }
        groups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        groups.select('text').attr('font-size', (d: any) => {
          const grow = easeOutBack(Math.min(1, (tcount - d.born) / 13));
          const pulse = 1 + d.amp * Math.sin(tcount * 0.045 + d.phase);
          return Math.max(2, d.base * grow * pulse);
        });
      }

      sim = forceSimulation([] as any)
        .force('x', forceX(0).strength(0.1 * (H / W)))
        .force('y', forceY(0).strength(0.1))
        .force('charge', forceManyBody().strength(-10))
        .force('collide', forceCollide((d: any) => d.r).strength(1).iterations(5))
        .velocityDecay(0.8).alphaDecay(0.02).on('tick', ticked);

      function render() {
        groups = root.selectAll('g.node').data(live, (d: any) => d.text);
        const enter = groups.enter().append('g').attr('class', 'node');
        enter.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-family', (d: any) => d.font).attr('font-weight', (d: any) => d.weight)
          .attr('fill', (d: any) => d.fill).attr('font-size', (d: any) => d.base).text((d: any) => d.text);
        enter
          .on('mouseenter', function (this: any) { select(this).raise().classed('hot', true); })
          .on('mouseleave', function (this: any) { select(this).classed('hot', false); });
        enter.call(drag<any, any>().container(root.node() as any)
          .subject((ev: any, d: any) => ({ x: d.x, y: d.y }))
          .on('start', function (this: any, ev: any, d: any) { if (!ev.active) sim.alphaTarget(0.32).restart(); d.fx = d.x; d.fy = d.y; select(this).classed('grab', true).raise(); })
          .on('drag', (ev: any, d: any) => { d.fx = ev.x; d.fy = ev.y; })
          .on('end', function (this: any, ev: any, d: any) { if (!ev.active) sim.alphaTarget(0.02).restart(); d.fx = null; d.fy = null; d.vx = (Math.random() - 0.5) * 7; d.vy = (Math.random() - 0.5) * 7; select(this).classed('grab', false); }) as any);
        groups = enter.merge(groups as any);
      }

      let idx = 0;
      (function add() {
        if (stopped) return;
        if (idx >= nodes.length) { sim.alphaTarget(0.02).restart(); return; }
        const n = nodes[idx++];
        n.x = (Math.random() - 0.5) * 12; n.y = (Math.random() - 0.5) * 12; n.born = tcount;
        live.push(n); render();
        sim.nodes(live as any).alpha(0.9).restart();
        setTimeout(add, 38);
      })();
    })();

    return () => { stopped = true; if (sim) sim.stop(); if (el) el.innerHTML = ''; };
  }, [words]);

  return <div className="cloud" ref={ref} />;
}
