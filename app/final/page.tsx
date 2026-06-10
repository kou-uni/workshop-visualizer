'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useRef, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import MintaBusy from '@/components/MintaBusy';
import type { AggregationResult } from '@/lib/types';

export default function FinalResult() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const busyRef = useRef(false);

  // 自己修復ポーリング：保存済みの最新結果を取り続ける（投影が常に最新・通信断にも強い）
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (busyRef.current) return;
      fetch('/api/aggregation?scope=merged', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => { if (alive && j.result) { setResult(j.result); setUpdatedAt(j.updatedAt); } })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const run = async () => {
    setBusy(true); busyRef.current = true; setErr('');
    try {
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'merged' }) });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : '集約に失敗しました');
      setResult(j.result); setUpdatedAt(new Date().toISOString());
    } catch (e: any) { setErr(typeof e?.message === 'string' && e.message ? e.message : '集約に失敗しました。少し待って、もう一度お試しください。'); } finally { setBusy(false); busyRef.current = false; }
  };

  return (
    <>
      <div className="topbar">
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">最終結果</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <div className="screen-head">
          <div>
            <span className="eyebrow">ALL · リアル＆オンライン統合</span>
            <h1 style={{ fontSize: 36, marginTop: 6 }}>今日の棚卸し、みんなの声</h1>
          </div>
          <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
            {busy ? '統合中…' : '統合集約を実行'}
          </button>
        </div>
        {updatedAt && <p className="tiny muted" style={{ marginTop: 6 }}>統合 {new Date(updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>}
        {err && <MintaBusy />}

        {result ? <AggregationView result={result} /> : (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">オンラインとリアルが揃ったら「統合集約を実行」を押してください。</p>
          </div>
        )}
      </div>
    </>
  );
}
