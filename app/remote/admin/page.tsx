'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import MintaBusy from '@/components/MintaBusy';
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
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">オンライン集約</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <div className="screen-head">
          <div>
            <span className="eyebrow">REMOTE-5 · オンライン集約</span>
            <h1 style={{ fontSize: 34, marginTop: 6 }}>みんなの振り返りを、ひとつに</h1>
          </div>
          <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
            {busy ? '集約中…' : '全体集約を実行'}
          </button>
        </div>
        {updatedAt && <p className="tiny muted" style={{ marginTop: 6 }}>最終集約 {new Date(updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>}
        {err && <MintaBusy />}

        {!result ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">まだ集約結果がありません。「全体集約を実行」を押してください。</p>
          </div>
        ) : (
          <AggregationView result={result} />
        )}
      </div>
    </>
  );
}
