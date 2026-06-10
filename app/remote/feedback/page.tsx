'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Memo = { id: string; body: string; created_at: string };

export default function RemoteFeedback() {
  const [input, setInput] = useState('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const seenRef = useRef<Set<string>>(new Set());
  const initedRef = useRef(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const res = await fetch('/api/insights', { cache: 'no-store' });
      const j = await res.json();
      const list: Memo[] = j.memos ?? [];
      const newOnes = list.filter((m) => !seenRef.current.has(m.id)).map((m) => m.id);
      if (newOnes.length && initedRef.current) {
        setFresh(new Set(newOnes));
        setTimeout(() => setFresh(new Set()), 700);
      }
      list.forEach((m) => seenRef.current.add(m.id));
      initedRef.current = true;
      setMemos(list);
    } catch { /* noop */ }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 3000); // 全員で共有・3秒ごとにライブ更新
    return () => clearInterval(iv);
  }, []);

  const add = async () => {
    const text = input.trim();
    if (!text) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '追加に失敗しました');
      setInput('');
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const fmtTime = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <Link href="/?to=online" className="icon-close" aria-label="戻る">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <Link href="/" className="logo-dot">8</Link>
            <span className="app-head-title">気づきメモ</span>
            <span className="badge badge-gray" style={{ fontSize: 10, padding: '3px 8px' }}>REMOTE-4</span>
          </div>
        </header>

        <div className="phase-pill phase-pill-full">
          <span><span className="dot" /> ブレイクアウト中</span>
          <span className="synced">ライブ · 自動更新</span>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <div className="field-head"><label>今の気づきをメモしてみましょう</label></div>
          <textarea className="textarea" style={{ minHeight: 64 }} placeholder="いま話して気づいたこと…" value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(); }} />
          <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={add} disabled={busy}>{busy ? <><span className="btn-spin" /> 追加中…</> : 'メモを追加 +'}</button>
        </div>
        {err && <p className="tiny" style={{ color: 'var(--minta)' }}>{err}</p>}

        <div className="group-label">みんなの気づき <span className="muted">（{memos.length}・ライブ）</span></div>
        <div>
          {memos.length === 0 && <p className="tiny muted" style={{ padding: '8px 2px' }}>まだメモはありません。気づいたことを気軽に。</p>}
          {memos.map((m) => (
            <div className={`card memo-card ${fresh.has(m.id) ? 'memo-enter' : ''}`} key={m.id} style={{ padding: '14px 16px' }}>
              <div className="tiny muted mono" style={{ marginBottom: 2 }}>{fmtTime(m.created_at)}</div>
              <div style={{ fontSize: 14 }}>{m.body}</div>
            </div>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: 18, lineHeight: 1.6 }}>※ 全員で共有・3秒ごとに自動更新。メモは全体のワードクラウドに溶け込みます。</p>
      </div>
    </div>
  );
}
