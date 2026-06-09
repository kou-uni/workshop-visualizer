'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import WordCloud from '@/components/WordCloud';
import type { AggregationResult } from '@/lib/types';

export default function RemoteAdmin() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/aggregation?scope=online')
      .then((r) => r.json())
      .then((j) => { if (j.result) { setResult(j.result); setUpdatedAt(j.updatedAt); } })
      .catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'online' }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '集約に失敗しました');
      setResult(j.result); setUpdatedAt(new Date().toISOString());
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <Link href="/" className="logo-dot">8</Link>
        <span className="title">オンライン集約</span>
        <span className="spacer" />
      </div>

      <div className="screen-wide">
        <div className="screen-head">
          <div>
            <span className="eyebrow">REMOTE-4 · オンライン集約</span>
            <h1 style={{ fontSize: 34, marginTop: 6 }}>みんなの振り返りを、ひとつに</h1>
          </div>
          <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
            {busy ? '集約中…' : '全体集約を実行'}
          </button>
        </div>
        {updatedAt && <p className="tiny muted" style={{ marginTop: 6 }}>最終集約 {new Date(updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>}
        {err && <p className="tiny" style={{ color: 'var(--minta)', marginTop: 6 }}>{err}</p>}

        {!result ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">まだ集約結果がありません。「全体集約を実行」を押してください。</p>
          </div>
        ) : (
          <>
            {result.wordCloud?.length > 0 && (
              <div className="card" style={{ marginTop: 24, padding: 20 }}>
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
        )}
      </div>
    </>
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
            <div className="il-t">{it.t}{it.n != null && <span className="il-n">{it.n}</span>}</div>
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
            <div className="il-t">{r.read}</div>
            {r.evidence?.[0] && <div className="il-ev">“{r.evidence[0]}”</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
