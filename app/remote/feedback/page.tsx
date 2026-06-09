'use client';

import Link from 'next/link';
import { useState } from 'react';

type Memo = { id: string; time: string; body: string; fresh?: boolean };

export default function RemoteFeedback() {
  const [input, setInput] = useState('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = async () => {
    const text = input.trim();
    if (!text) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '追加に失敗しました');
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setMemos((m) => [{ id: j.id, time, body: text, fresh: true }, ...m]);
      setInput('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <Link href="/" className="logo-dot">8</Link>
            <span className="app-head-title">気づきメモ</span>
            <span className="badge badge-gray" style={{ fontSize: 10, padding: '3px 8px' }}>REMOTE-3</span>
          </div>
          <Link href="/" className="icon-close" aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </Link>
        </header>

        <div className="phase-pill phase-pill-full">
          <span><span className="dot" /> ブレイクアウト中</span>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <div className="field-head">
            <label>今の気づきをメモしてみましょう</label>
          </div>
          <textarea className="textarea" style={{ minHeight: 64 }} placeholder="いま話して気づいたこと…" value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(); }} />
          <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={add} disabled={busy}>{busy ? '追加中…' : 'メモを追加 +'}</button>
        </div>
        {err && <p className="tiny" style={{ color: 'var(--minta)' }}>{err}</p>}

        <div className="group-label">自分のメモ<span className="muted">（{memos.length}）</span></div>
        <div>
          {memos.length === 0 && <p className="tiny muted" style={{ padding: '8px 2px' }}>まだメモはありません。気づいたことを気軽に。</p>}
          {memos.map((m) => (
            <div className={`card memo-card ${m.fresh ? 'memo-enter' : ''}`} key={m.id} style={{ padding: '14px 16px' }}>
              <div className="tiny muted mono" style={{ marginBottom: 2 }}>{m.time}</div>
              <div style={{ fontSize: 14 }}>{m.body}</div>
            </div>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: 18, lineHeight: 1.6 }}>※ メモはみんなの分とまとめて、全体のワードクラウドに溶け込みます。</p>
      </div>
    </div>
  );
}
