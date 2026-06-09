'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OnsiteRecord() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['', '', '', '']);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const setMember = (i: number, v: string) => {
    const next = [...members];
    next[i] = v;
    if (i === next.length - 1 && v.trim() && next.length < 7) next.push('');
    setMembers(next);
  };

  const submit = async () => {
    if (!name.trim()) { setErr('チーム名を入力してください'); return; }
    setErr(''); setBusy(true);
    try {
      const r1 = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, members: members.filter((m) => m.trim()) }) });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || 'チーム作成に失敗しました');
      if (transcript.trim()) {
        await fetch(`/api/teams/${j1.id}/transcript`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript }) });
      }
      router.push(`/onsite/team/${j1.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <Link href="/" className="logo-dot">8</Link>
            <span className="app-head-title">チームの振り返り</span>
            <span className="badge" style={{ fontSize: 10, padding: '3px 8px' }}>ONSITE-1</span>
          </div>
          <Link href="/" className="icon-close" aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </Link>
        </header>

        <p className="memo-lead">代表者のスマホで入力してください。<span className="muted tiny">（録音も後で追加できます）</span></p>

        <div className="field">
          <div className="field-head"><label>チーム名</label></div>
          <input className="input" placeholder="例：いちごの会" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="group-label">メンバー（Discord名・最大7名）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {members.map((m, i) => (
            <input key={i} className="input" placeholder={`メンバー${i + 1}`} value={m} onChange={(e) => setMember(i, e.target.value)} />
          ))}
        </div>

        <div className="field">
          <div className="field-head"><label>議論の記録（テキスト）</label></div>
          <textarea className="textarea" style={{ minHeight: 120 }} placeholder="話した内容の要点を入力（つまずき・乗り越え・ハック・困りごとなど）。後で録音→自動文字起こしにも対応します。" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </div>

        {err && <p className="tiny" style={{ color: 'var(--minta)', marginBottom: 10 }}>{err}</p>}
        <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={busy}>
          {busy ? '送信中…' : '提出してAIに振り返ってもらう'}
        </button>
      </div>
    </div>
  );
}
