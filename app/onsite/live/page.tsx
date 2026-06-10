'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import MintaBusy from '@/components/MintaBusy';
import type { AggregationResult } from '@/lib/types';

export default function OnsiteLive() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/aggregation?scope=real').then((r) => r.json()).then((j) => { if (j.result) setResult(j.result); }).catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'real' }) });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : '集約に失敗しました');
      setResult(j.result);
    } catch (e: any) { setErr(typeof e?.message === 'string' && e.message ? e.message : '集約に失敗しました。少し待って、もう一度お試しください。'); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">リアル全体集計</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <div className="screen-head">
          <div>
            <span className="eyebrow">ONSITE-3 · 全体集計</span>
            <h1 style={{ fontSize: 34, marginTop: 6 }}>リアル会場の声を、ひとつに</h1>
          </div>
          <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
            {busy ? '集約中…' : '全体集約を実行'}
          </button>
        </div>
        <p className="tiny muted" style={{ marginTop: 4 }}>リアル会場の全チーム（卓）を集約します。</p>
        {err && <MintaBusy />}

        {result ? <AggregationView result={result} /> : (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '50px 20px' }}>
            <p className="muted">各チームの振り返りが集まったら「全体集約を実行」を押してください。</p>
          </div>
        )}
      </div>
    </>
  );
}
