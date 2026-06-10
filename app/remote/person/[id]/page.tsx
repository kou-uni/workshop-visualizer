'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Refl = { id: string; discord_name: string; pr: string | null; stumble: string | null; hack: string | null; trouble: string | null };

const FIELDS: { key: keyof Refl; label: string }[] = [
  { key: 'pr', label: '① 自身のプロダクトの簡単な紹介' },
  { key: 'stumble', label: '② つまずいた点 ＋ 乗り越えた話' },
  { key: 'hack', label: '③ ちょっとしたハック' },
  { key: 'trouble', label: '④ いま困っていること' },
];

// REMOTE：個人の振り返り 発表ビュー（4項目を見せる・AI解釈なし）
export default function RemotePerson() {
  const id = String(useParams().id);
  const [list, setList] = useState<Refl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reflections', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { setList(j.reflections ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const idx = list.findIndex((r) => r.id === id);
  const cur = idx >= 0 ? list[idx] : null;

  return (
    <>
      <div className="topbar">
        <BackButton href="/remote/people" /><Link href="/" className="logo-dot">8</Link>
        <span className="title">{cur?.discord_name ?? '個人の振り返り'}</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        {loading ? (
          <p className="tiny muted">読み込み中…</p>
        ) : !cur ? (
          <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <p className="muted">この振り返りは見つかりませんでした。</p>
            <Link href="/remote/people" className="btn" style={{ marginTop: 16 }}>一覧へ戻る</Link>
          </div>
        ) : (
          <>
            <span className="eyebrow">REMOTE · 個人の振り返り</span>
            <h1 style={{ fontSize: 40, marginTop: 6 }}>{cur.discord_name}</h1>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {FIELDS.map((f) => {
                const v = (cur[f.key] as string | null)?.trim();
                return (
                  <div className="card" key={f.key} style={{ padding: '22px 24px' }}>
                    <div className="eyebrow">{f.label}</div>
                    <p className="present-text">{v || '（未記入）'}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <Link href="/remote/people" className="btn">← 一覧へ戻る</Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
