'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useRef, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import MintaBusy from '@/components/MintaBusy';
import { useOps } from '@/lib/useOps';
import type { AggregationResult } from '@/lib/types';

export default function RemoteAdmin() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const busyRef = useRef(false);
  const ops = useOps();

  // 自己修復ポーリング：保存済みの最新結果を取り続ける（操作端末の通信が落ちても投影は最新を表示）
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (busyRef.current) return;
      fetch('/api/aggregation?scope=online', { cache: 'no-store' })
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
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'online', opsKey: ops }) });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : '集約に失敗しました');
      setResult(j.result); setUpdatedAt(new Date().toISOString());
    } catch (e: any) { setErr(typeof e?.message === 'string' && e.message ? e.message : '集約に失敗しました。少し待って、もう一度お試しください。'); } finally { setBusy(false); busyRef.current = false; }
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
          {ops && (
            <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
              {busy ? '集約中…' : '全体集約を実行'}
            </button>
          )}
        </div>
        {updatedAt && <p className="tiny muted" style={{ marginTop: 6 }}>最終集約 {new Date(updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>}
        {err && <MintaBusy />}

        {!result ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">運営が集約を実行すると、ここに全体像が表示されます。</p>
          </div>
        ) : (
          <AggregationView result={result} />
        )}
      </div>
    </>
  );
}
