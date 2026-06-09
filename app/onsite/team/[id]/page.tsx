'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import type { AggregationResult } from '@/lib/types';

export default function TeamResult() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [team, setTeam] = useState<{ name: string; members: string[] } | null>(null);
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/teams/${id}`).then((r) => r.json()).then((j) => { if (j.team) setTeam(j.team); }).catch(() => {});
    fetch(`/api/aggregation?scope=team&teamId=${id}`).then((r) => r.json()).then((j) => { if (j.result) setResult(j.result); }).catch(() => {});
  }, [id]);

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'team', teamId: id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '集約に失敗しました');
      setResult(j.result);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <Link href="/" className="logo-dot">8</Link>
        <span className="title">チームの振り返り</span>
        <span className="spacer" />
      </div>

      <div className="screen-wide">
        <div className="screen-head">
          <div>
            <span className="eyebrow">ONSITE-2 · チーム結果</span>
            <h1 style={{ fontSize: 32, marginTop: 6 }}>{team?.name ?? 'チーム'}</h1>
            {team?.members?.length ? <p className="tiny muted" style={{ marginTop: 4 }}>{team.members.join(' ・ ')}</p> : null}
          </div>
          <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
            {busy ? 'AIが振り返り中…' : 'AIで振り返る'}
          </button>
        </div>
        {err && <p className="tiny" style={{ color: 'var(--minta)', marginTop: 6 }}>{err}</p>}

        {!result ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">「AIで振り返る」を押すと、チームの議論を分析します。</p>
          </div>
        ) : (
          <AggregationView result={result} />
        )}
      </div>
    </>
  );
}
