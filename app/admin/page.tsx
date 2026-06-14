'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useCallback, useEffect, useState } from 'react';
import { useOps } from '@/lib/useOps';
import AggregationView from '@/components/AggregationView';
import type { AggregationResult } from '@/lib/types';

type Counts = { reflections: number; insights: number; teams: number; recordings: number; aggregations: number };
type Detail = { date: string; counts: Counts; aggregations: Record<'online' | 'real' | 'merged', AggregationResult | null> };

const jst = (offsetDays = 0) => new Date(Date.now() + 9 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);

const ACTIONS = [
  { scope: 'remote' as const, label: 'リモート（オンライン）をクリア', desc: '個人の振り返り・気づきメモ・オンライン/統合の集約結果を削除', tone: '' },
  { scope: 'real' as const, label: 'リアル会場をクリア', desc: 'チーム・録音(文字起こし)・チーム/全体/統合の集約結果を削除', tone: '' },
  { scope: 'all' as const, label: 'すべてクリア', desc: '上記すべて＋全集約を削除（セッション枠は残す）', tone: 'danger' },
];

export default function Admin() {
  const ops = useOps();
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<'today' | 'all'>('today');
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirm, setConfirm] = useState<{ scope: 'remote' | 'real' | 'all'; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // 過去データ閲覧
  const [viewFrom, setViewFrom] = useState(jst(14));
  const [viewTo, setViewTo] = useState(jst(0));
  const [days, setDays] = useState<{ date: string; counts: Counts }[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [viewScope, setViewScope] = useState<'online' | 'real' | 'merged'>('online');
  const [vbusy, setVbusy] = useState(false);

  useEffect(() => { setReady(true); }, []);

  const loadOverview = async () => {
    if (!ops) return;
    setVbusy(true); setDetail(null);
    try {
      const r = await fetch(`/api/admin/data?opsKey=${encodeURIComponent(ops)}&from=${viewFrom}&to=${viewTo}`);
      const j = await r.json();
      setDays(j.days ?? []);
    } catch { setDays([]); } finally { setVbusy(false); }
  };
  const loadDetail = async (date: string) => {
    if (!ops) return;
    setVbusy(true);
    try {
      const r = await fetch(`/api/admin/data?opsKey=${encodeURIComponent(ops)}&date=${date}`);
      const j = (await r.json()) as Detail;
      setDetail(j);
      setViewScope((['online', 'real', 'merged'] as const).find((s) => j.aggregations?.[s]) ?? 'online');
    } catch { /* noop */ } finally { setVbusy(false); }
  };

  const loadCounts = useCallback(() => {
    if (!ops) return;
    fetch(`/api/admin/clear?opsKey=${encodeURIComponent(ops)}&target=${target}`)
      .then((r) => r.json())
      .then((j) => { if (j.counts) setCounts(j.counts); })
      .catch(() => {});
  }, [ops, target]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const doClear = async () => {
    if (!confirm || !ops) return;
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/admin/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opsKey: ops, scope: confirm.scope, target }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'クリアに失敗しました');
      const d = j.deleted || {};
      const summary = Object.entries(d).map(([k, v]) => `${k}:${v}`).join(' / ');
      setMsg(`✓ クリア完了（${target === 'today' ? '当日' : '全期間'}）— ${summary || '対象なし'}`);
      setConfirm(null);
      loadCounts();
    } catch (e: any) { setMsg('✕ ' + (e?.message || 'クリアに失敗しました')); } finally { setBusy(false); }
  };

  // 未アンロック
  if (ready && !ops) {
    return (
      <>
        <div className="topbar"><Link href="/" className="logo-dot">8</Link><span className="title">管理</span><span className="spacer" /></div>
        <div className="screen">
          <div className="card" style={{ marginTop: 24, padding: '40px 28px', textAlign: 'center' }}>
            <h1 style={{ fontSize: 24 }}>運営専用ページ</h1>
            <p className="muted" style={{ marginTop: 12, lineHeight: 1.8 }}>このページは運営キーが必要です。<br />URLに <code>?ops=運営キー</code> を付けて開いてください。</p>
            <p className="tiny muted" style={{ marginTop: 14 }}>例：<code>/admin?ops=○○○</code></p>
          </div>
        </div>
      </>
    );
  }
  if (!ready) return <div className="screen" />;

  const C = counts;
  return (
    <>
      <div className="topbar">
        <BackButton /><Link href="/" className="logo-dot">8</Link>
        <span className="title">管理 · データクリア</span>
        <span className="spacer" />
      </div>

      <div className="screen">
        <span className="eyebrow">ADMIN · 非公開</span>
        <h1 style={{ fontSize: 32, marginTop: 6 }}>テストデータのクリア</h1>
        <p className="tiny" style={{ marginTop: 8, color: '#b42318', fontWeight: 600 }}>⚠ 破壊的操作です。削除は取り消せません。本番前のリセット用。</p>

        {/* 対象の選択 */}
        <div className="card" style={{ marginTop: 20, padding: '16px 18px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>クリア対象</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['today', 'all'] as const).map((t) => (
              <button key={t} className={`btn ${target === t ? 'btn-primary' : ''}`} onClick={() => setTarget(t)}>
                {t === 'today' ? '今日のセッション' : '全期間（すべての日）'}
              </button>
            ))}
          </div>
        </div>

        {/* 現在の件数 */}
        <div className="card" style={{ marginTop: 14, padding: '16px 18px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>現在のデータ件数（{target === 'today' ? '当日' : '全期間'}）</div>
          {C ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 }}>
              {[['個人の振り返り', C.reflections], ['気づきメモ', C.insights], ['チーム', C.teams], ['録音(文字起こし)', C.recordings], ['集約結果', C.aggregations]].map(([k, v]) => (
                <div key={k as string} style={{ textAlign: 'center', padding: '12px 6px', border: '1px solid rgba(80,68,54,.1)', borderRadius: 12 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>{v as number}</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{k as string}</div>
                </div>
              ))}
            </div>
          ) : <p className="tiny muted">読み込み中…</p>}
        </div>

        {/* アクション */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ACTIONS.map((a) => (
            <div key={a.scope} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{a.label}</div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.5 }}>{a.desc}</div>
              </div>
              <button className={`btn ${a.tone === 'danger' ? 'btn-danger' : ''}`} disabled={busy} onClick={() => setConfirm({ scope: a.scope, label: a.label })}>
                クリア
              </button>
            </div>
          ))}
        </div>

        {msg && <p className="tiny" style={{ marginTop: 16, fontWeight: 600, color: msg.startsWith('✓') ? '#067647' : '#b42318' }}>{msg}</p>}

        {/* 過去データの閲覧（読み取り専用） */}
        <div className="track-head" style={{ marginTop: 44 }}><span className="tnum">VIEW</span><h2>過去データの閲覧</h2><span className="line" /></div>
        <div className="card" style={{ marginTop: 14, padding: '16px 18px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>期間（日付レンジ）</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" className="input" style={{ width: 'auto' }} value={viewFrom} onChange={(e) => setViewFrom(e.target.value)} />
            <span className="muted">〜</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={viewTo} onChange={(e) => setViewTo(e.target.value)} />
            <button className="btn btn-primary" disabled={vbusy} onClick={loadOverview}>{vbusy ? '読込中…' : '概要を見る'}</button>
          </div>
          {days && (days.length === 0 ? (
            <p className="tiny muted" style={{ marginTop: 12 }}>この期間にデータはありません。</p>
          ) : (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {days.map((d) => (
                <button key={d.date} className="btn" style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => loadDetail(d.date)}>
                  <span style={{ fontWeight: 600 }}>{d.date}</span>
                  <span className="tiny muted">個人{d.counts.reflections}・チーム{d.counts.teams}・集約{d.counts.aggregations}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {detail && (
          <div className="card" style={{ marginTop: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div className="eyebrow">{detail.date} の集約</div>
              <span style={{ flex: 1 }} />
              {(['online', 'real', 'merged'] as const).map((sc) => (
                <button key={sc} className={`btn ${viewScope === sc ? 'btn-primary' : ''}`} disabled={!detail.aggregations[sc]} onClick={() => setViewScope(sc)}>
                  {sc === 'online' ? 'オンライン' : sc === 'real' ? 'リアル' : '統合'}{!detail.aggregations[sc] ? '（なし）' : ''}
                </button>
              ))}
            </div>
            <p className="tiny muted">個人{detail.counts.reflections}・気づき{detail.counts.insights}・チーム{detail.counts.teams}・録音{detail.counts.recordings}・集約{detail.counts.aggregations}</p>
            {detail.aggregations[viewScope] ? (
              <AggregationView result={detail.aggregations[viewScope] as AggregationResult} instant />
            ) : (
              <p className="tiny muted" style={{ marginTop: 12 }}>このスコープの集約はありません。</p>
            )}
          </div>
        )}
      </div>

      {/* 確認モーダル */}
      {confirm && (
        <div className="modal-overlay" onClick={() => !busy && setConfirm(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20 }}>本当にクリアしますか？</h2>
            <p style={{ marginTop: 10, lineHeight: 1.7 }}>
              <strong>{confirm.label}</strong>（{target === 'today' ? '当日' : '全期間'}）を実行します。<br />
              <span style={{ color: '#b42318', fontWeight: 600 }}>この操作は取り消せません。</span>
            </p>
            {C && (
              <p className="tiny muted" style={{ marginTop: 10 }}>
                削除対象の目安：
                {confirm.scope !== 'real' && ` 個人${C.reflections}・メモ${C.insights}`}
                {confirm.scope !== 'remote' && ` チーム${C.teams}・録音${C.recordings}`}
                {` ・集約結果`}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn" disabled={busy} onClick={() => setConfirm(null)}>キャンセル</button>
              <button className="btn btn-danger" disabled={busy} onClick={doClear}>{busy ? '削除中…' : '削除する'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
