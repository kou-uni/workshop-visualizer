'use client';

import WordCloud from './WordCloud';
import CountUp from './CountUp';
import AgentConversation from './AgentConversation';
import type { AggregationResult } from '@/lib/types';

// 集約結果の表示（モック準拠・REMOTE-2/4・ONSITE-2/3・最終結果で共通）
export default function AggregationView({ result }: { result: AggregationResult }) {
  return (
    <>
      <div className="stat-row" style={{ marginTop: 24 }}>
        <Stat n={result.commonStumbles?.length ?? 0} label="共通のつまずき" />
        <Stat n={result.hacks?.length ?? 0} label="役立つハック" />
        <Stat n={result.currentTroubles?.length ?? 0} label="困っていること" />
        <Stat n={result.wordCloud?.length ?? 0} label="キーワード" />
      </div>

      {result.wordCloud?.length > 0 && (
        <div className="card" style={{ marginTop: 16, padding: '12px 8px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <WordCloud words={result.wordCloud} />
        </div>
      )}
      {result.trendSummary && (
        <p style={{ marginTop: 18, fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.8, maxWidth: 780 }}>{result.trendSummary}</p>
      )}

      <div className="grid-3" style={{ marginTop: 24 }}>
        <IList title="共通のつまずき" items={result.commonStumbles.map((s) => ({ t: s.title, e: s.evidence?.[0], n: s.count }))} />
        <IList title="役立つハック" items={result.hacks.map((h) => ({ t: h.title, e: h.evidence?.[0] }))} />
        <IList title="いま困っていること" items={result.currentTroubles.map((s) => ({ t: s.title, e: s.evidence?.[0], n: s.count }))} />
      </div>

      <div style={{ marginTop: 30 }}>
        <AgentConversation result={result} autoStart />
      </div>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="stat"><div className="n"><CountUp value={n} /></div><div className="l">{label}</div></div>;
}

function IList({ title, items }: { title: string; items: { t: string; e?: string; n?: number }[] }) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>{title}</h2>
      <ul className="ilist">
        {items.length === 0 && <li><div className="body"><div className="e muted">—</div></div></li>}
        {items.map((it, i) => (
          <li key={i}>
            <span className="rank mono-rank">{i + 1}</span>
            <div className="body">
              <div className="t">{it.t}</div>
              {it.e && <div className="e">“{it.e}”</div>}
            </div>
            {it.n != null && <div className="count"><CountUp value={it.n} /></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
