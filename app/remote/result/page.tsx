'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useCallback, useEffect, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import type { AggregationResult } from '@/lib/types';

export default function RemoteResult() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aggregation?scope=online', { cache: 'no-store' });
      const j = await res.json();
      setResult(j.result ?? null);
      setUpdatedAt(j.updatedAt ?? null);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="topbar">
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">黙々タイムの結果</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <div className="screen-head">
          <div>
            <span className="eyebrow">REMOTE-2 · 結果確認</span>
            <h1 style={{ fontSize: 34, marginTop: 6 }}>みんなの振り返り、<br className="sp-br" />いま全体像</h1>
          </div>
          <button className="btn btn-primary btn-lg" onClick={load} disabled={loading}>
            {loading ? '更新中…' : '最新に更新'}
          </button>
        </div>
        {updatedAt && <p className="tiny muted" style={{ marginTop: 6 }}>集約 {new Date(updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 時点</p>}

        {!result ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">まだ集約結果がありません。<br />運営が「全体集約」を実行すると、ここに全体像が出ます。</p>
          </div>
        ) : (
          <AggregationView result={result} />
        )}
      </div>
    </>
  );
}
