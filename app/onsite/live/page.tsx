'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useRef, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import MintaBusy from '@/components/MintaBusy';
import type { AggregationResult } from '@/lib/types';

type Team = { id: string; name: string; members: string[] };

export default function OnsiteLive() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const teamsRef = useRef<HTMLDivElement>(null);
  const toTeams = () => teamsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const loadTeams = () => fetch('/api/teams').then((r) => r.json()).then((j) => setTeams(j.teams ?? [])).catch(() => {});

  useEffect(() => {
    loadTeams();
    fetch('/api/aggregation?scope=real').then((r) => r.json()).then((j) => { if (j.result) setResult(j.result); }).catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'real' }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '集約に失敗しました');
      setResult(j.result); loadTeams();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
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
        <button className="btn" style={{ marginTop: 12 }} onClick={toTeams}>
          チームごとの振り返りはこちら
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </button>
        {err && <MintaBusy />}

        {result ? <AggregationView result={result} /> : (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '50px 20px' }}>
            <p className="muted">各チームの振り返りが集まったら「全体集約を実行」を押してください。</p>
          </div>
        )}

        <div className="track-head" ref={teamsRef} style={{ marginTop: 40, scrollMarginTop: 76 }}><span className="tnum">TEAMS</span><h2>チーム（{teams.length}）</h2><span className="line" /></div>
        {teams.length === 0 ? (
          <p className="tiny muted">まだチームがありません。</p>
        ) : (
          <div className="grid-teams">
            {teams.map((t) => (
              <Link key={t.id} href={`/onsite/team/${t.id}`} className="team-chip">
                <div className="tn">{t.name}</div>
                <div className="ts"><span className="dotg" />{t.members?.length ? `${t.members.length}名` : '—'}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
