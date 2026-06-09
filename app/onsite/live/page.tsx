'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import AggregationView from '@/components/AggregationView';
import HeroType from '@/components/HeroType';
import type { AggregationResult } from '@/lib/types';

type Team = { id: string; name: string; members: string[] };

export default function OnsiteLive() {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
            <span className="eyebrow">spark &amp; minta が分析中</span>
            <h1 style={{ fontSize: 32, marginTop: 6 }}><HeroType /></h1>
          </div>
          <button className="btn btn-primary btn-lg" onClick={run} disabled={busy}>
            {busy ? '集約中…' : '全体集約を実行'}
          </button>
        </div>
        {err && <p className="tiny" style={{ color: 'var(--minta)', marginTop: 6 }}>{err}</p>}

        {result ? <AggregationView result={result} /> : (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '50px 20px' }}>
            <p className="muted">各チームの振り返りが集まったら「全体集約を実行」を押してください。</p>
          </div>
        )}

        <div className="track-head" style={{ marginTop: 40 }}><span className="tnum">TEAMS</span><h2>チーム（{teams.length}）</h2><span className="line" /></div>
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
