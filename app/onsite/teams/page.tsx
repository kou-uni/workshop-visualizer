'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';

type Team = { id: string; name: string; members: string[] };

export default function OnsiteTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/teams', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { setTeams(j.teams ?? []); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000); // 新しいチームが提出されたら自動で並ぶ
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <div className="topbar">
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">チームの振り返り</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <span className="eyebrow">ONSITE-2 · チームの振り返り</span>
        <h1 style={{ fontSize: 34, marginTop: 6 }}>チームを選んでください</h1>
        <p className="tiny muted" style={{ marginTop: 6 }}>各チームのAI振り返り（議論サマリ／spark &amp; minta）を見られます。提出した順に自動で並びます。</p>

        {loading ? (
          <p className="tiny muted" style={{ marginTop: 24 }}>読み込み中…</p>
        ) : teams.length === 0 ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '50px 20px' }}>
            <p className="muted">まだチームがありません。<br />各チームが ONSITE-1 で提出すると、ここに並びます。</p>
          </div>
        ) : (
          <>
            <div className="track-head" style={{ marginTop: 28 }}><span className="tnum">TEAMS</span><h2>チーム（{teams.length}）</h2><span className="line" /></div>
            <div className="grid-teams" style={{ marginTop: 16 }}>
              {teams.map((t) => (
                <Link key={t.id} href={`/onsite/team/${t.id}`} className="team-chip">
                  <div className="tn">{t.name}</div>
                  <div className="ts"><span className="dotg" />{t.members?.length ? `${t.members.length}名` : '—'}</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
