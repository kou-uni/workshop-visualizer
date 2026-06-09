'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function OnsiteRecord() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['', '', '', '']);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // recording
  const [recState, setRecState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [sec, setSec] = useState(0);
  const [recErr, setRecErr] = useState('');
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setMember = (i: number, v: string) => {
    const next = [...members];
    next[i] = v;
    if (i === next.length - 1 && v.trim() && next.length < 7) next.push('');
    setMembers(next);
  };

  const startRec = async () => {
    setRecErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => transcribe();
      mr.start();
      mrRef.current = mr;
      setSec(0); setRecState('recording');
      timerRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    } catch {
      setRecErr('マイクが使えませんでした');
    }
  };

  const stopRec = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mrRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecState('transcribing');
  };

  const transcribe = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('audio', blob, 'rec.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '文字起こしに失敗');
      setTranscript((t) => (t.trim() ? `${t}\n${j.text}` : j.text));
    } catch (e: any) {
      setRecErr(e.message + '（テキスト入力で提出できます）');
    } finally {
      setRecState('idle');
    }
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

        <p className="memo-lead">代表者のスマホで入力してください。</p>

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

        <div className="group-label">議論を録音 → 自動で文字起こし</div>
        <div className="rec-card">
          <button className={`rec-btn ${recState === 'recording' ? 'rec' : ''}`} onClick={recState === 'recording' ? stopRec : startRec} disabled={recState === 'transcribing'} aria-label="録音">
            {recState === 'recording'
              ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>}
          </button>
          <div className="rec-info">
            <div className="rec-label">{recState === 'idle' ? '録音して自動文字起こし' : recState === 'recording' ? '録音中… タップで停止' : '文字起こし中…'}</div>
            <div className="rec-time mono">{recState === 'recording' ? fmt(sec) : recState === 'transcribing' ? <span className="mini-spin" /> : '録音 · AI文字起こし'}</div>
          </div>
        </div>
        {recErr && <p className="tiny" style={{ color: 'var(--minta)', margin: '8px 0 0' }}>{recErr}</p>}

        <div className="field" style={{ marginTop: 18 }}>
          <div className="field-head"><label>議論の記録（編集できます）</label></div>
          <textarea className="textarea" style={{ minHeight: 120 }} placeholder="録音で自動入力されます。手入力・修正もOK（つまずき・乗り越え・ハック・困りごと）。" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </div>

        {err && <p className="tiny" style={{ color: 'var(--minta)', marginBottom: 10 }}>{err}</p>}
        <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={busy || recState !== 'idle'}>
          {busy ? '送信中…' : '提出してAIに振り返ってもらう'}
        </button>
      </div>
    </div>
  );
}
