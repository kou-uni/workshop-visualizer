'use client';

import WordCloud from './WordCloud';
import CountUp from './CountUp';
import Typewriter from './Typewriter';
import type { AggregationResult } from '@/lib/types';

// 集約結果の表示（REMOTE-2/4・ONSITE-2/3・最終結果で共通利用・scope非依存）
export default function AggregationView({ result }: { result: AggregationResult }) {
  return (
    <>
      <div className="stat-strip">
        <Stat n={result.commonStumbles?.length ?? 0} label="つまずき" />
        <Stat n={result.hacks?.length ?? 0} label="ハック" />
        <Stat n={result.currentTroubles?.length ?? 0} label="困りごと" />
        <Stat n={result.wordCloud?.length ?? 0} label="キーワード" />
      </div>

      {result.wordCloud?.length > 0 && (
        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <WordCloud words={result.wordCloud} />
        </div>
      )}
      {result.trendSummary && <p className="lead" style={{ marginTop: 22 }}>{result.trendSummary}</p>}

      <div className="grid-3" style={{ marginTop: 24 }}>
        <ListCard title="共通のつまずき" items={result.commonStumbles.map((s) => ({ t: s.title, n: s.count, ev: s.evidence }))} />
        <ListCard title="役立つハック" items={result.hacks.map((h) => ({ t: h.title, ev: h.evidence }))} />
        <ListCard title="いま困っていること" items={result.currentTroubles.map((s) => ({ t: s.title, n: s.count, ev: s.evidence }))} />
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <AgentCard who="spark" label="spark-agent ・ 技術/アーキ視点" reads={result.interpretations.spark} />
        <AgentCard who="minta" label="minta-agent ・ 要件/価値/UX視点" reads={result.interpretations.minta} />
      </div>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <div className="stat-n"><CountUp value={n} /></div>
      <div className="stat-l">{label}</div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: { t: string; n?: number; ev: string[] }[] }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <ul className="ilist">
        {items.length === 0 && <li className="muted tiny">—</li>}
        {items.map((it, i) => (
          <li key={i}>
            <div className="il-t">{it.t}{it.n != null && <span className="il-n"><CountUp value={it.n} /></span>}</div>
            {it.ev?.[0] && <div className="il-ev">“{it.ev[0]}”</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentCard({ who, label, reads }: { who: 'spark' | 'minta'; label: string; reads: { read: string; evidence: string[] }[] }) {
  return (
    <div className={`agent agent-${who}`}>
      <div className="agent-head"><span className="agent-dot" />{label}</div>
      <ul className="ilist">
        {reads.length === 0 && <li className="muted tiny">—</li>}
        {reads.map((r, i) => (
          <li key={i}>
            <div className="il-t" style={{ fontWeight: 500 }}><Typewriter text={r.read} delay={i * 700} /></div>
            {r.evidence?.[0] && <div className="il-ev">“{r.evidence[0]}”</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
