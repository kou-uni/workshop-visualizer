'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';

type Refl = { id: string; discord_name: string };

const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// REMOTE：個人（Discord名）ごとの振り返り 一覧（ONSITE-2 と同じトーン）
export default function RemotePeople() {
  const [people, setPeople] = useState<Refl[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/reflections', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { setPeople(j.reflections ?? []); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <div className="topbar">
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">個人の振り返り</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <span className="eyebrow">REMOTE-3 · 個人の振り返り</span>
        <h1 style={{ fontSize: 34, marginTop: 6 }}>振り返った方たち</h1>
        <p className="tiny muted" style={{ marginTop: 6 }}>Discord名ごとに、提出した4つの振り返りを表示します。提出した順に自動で並びます。</p>

        {loading ? (
          <p className="tiny muted" style={{ marginTop: 24 }}>読み込み中…</p>
        ) : people.length === 0 ? (
          <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '50px 20px' }}>
            <p className="muted">まだ提出がありません。<br />REMOTE-1 で振り返りを提出すると、ここに並びます。</p>
          </div>
        ) : (
          <>
            <div className="track-head" style={{ marginTop: 28 }}><span className="tnum">PEOPLE</span><h2>提出者（{people.length}）</h2><span className="line" /></div>
            <div className="team-grid" style={{ marginTop: 18 }}>
              {people.map((p) => (
                <Link key={p.id} href={`/remote/person/${p.id}`} className="team-tile2">
                  <span className="tt2-badge">{(p.discord_name || '?').slice(0, 1)}</span>
                  <span className="tt2-body">
                    <span className="tt2-name">{p.discord_name}</span>
                    <span className="tt2-meta">振り返りを表示</span>
                  </span>
                  <span className="tt2-arrow">{ARROW}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
