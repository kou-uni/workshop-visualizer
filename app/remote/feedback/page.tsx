'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

type Memo = { id: string; body: string };

export default function RemoteFeedback() {
  const [input, setInput] = useState('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '追加に失敗しました');
      setMemos((m) => [{ id: j.id, body: text }, ...m]);
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
            <span className="badge" style={{ fontSize: 10, padding: '3px 8px' }}>REMOTE-3</span>
          </div>
          <Link href="/" className="icon-close" aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </Link>
        </header>

        <div className="phase-pill phase-pill-full">
          <span><span className="dot" /> ブレイクアウト中</span>
          <span className="mono">{memos.length} メモ</span>
        </div>

        <p className="memo-lead">今の気づきをメモしてみましょう。<br />
          <span className="muted tiny">みんなのメモは全体のワードクラウドに溶け込みます。</span>
        </p>

        <form className="memo-add" onSubmit={add}>
          <input className="input" placeholder="例：話者分離は割り切る、が学び" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? '…' : '追加'}</button>
        </form>
        {err && <p className="tiny" style={{ color: 'var(--minta)', marginTop: 8 }}>{err}</p>}

        <ul className="memo-list">
          {memos.length === 0 && <li className="memo-empty muted tiny">まだメモはありません。気づいたことを気軽に。</li>}
          {memos.map((m) => (
            <li className="memo-item memo-enter" key={m.id}><span className="memo-bullet" />{m.body}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
