'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const SEGMENT_MS = 45000; // 45秒ごとに区切って逐次文字起こし（長尺・上限・タイムアウト対策）
const FB = [
  { n: 1, label: 'プロダクトの簡単な紹介', ph: '誰に何を作っている？　例：社会人向けの学習記録アプリ' },
  { n: 2, label: 'つまずいた点 ＋ 乗り越えた話', ph: 'どこで詰まり、どう抜けた？　例：環境変数でハマり、Secret設定を直した' },
  { n: 3, label: 'ちょびっとしたハック', ph: '共有したい小ワザを。例：CLAUDE.mdに「結論を先に」' },
  { n: 4, label: 'いま困っていること', ph: '助けてほしいことを具体的に。例：音声の話者分離が知りたい' },
];

export default function OnsiteRecord() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['', '', '', '']);
  const [fbOpen, setFbOpen] = useState(false);
  const [fb, setFb] = useState<string[]>(['', '', '', '']);

  const [recState, setRecState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [sec, setSec] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [segBusy, setSegBusy] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const recordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const segTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');
  const pendingRef = useRef(0); // 文字起こし未完のセグメント数

  const setMember = (i: number, v: string) => {
    const next = [...members];
    next[i] = v;
    if (i === next.length - 1 && v.trim() && next.length < 7) next.push('');
    setMembers(next);
  };

  const transcribeSegment = async (blob: Blob) => {
    pendingRef.current += 1; setSegBusy(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'seg.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const j = await res.json();
      if (res.ok && j.text) {
        transcriptRef.current = (transcriptRef.current + ' ' + j.text).trim();
        setTranscript(transcriptRef.current);
      }
    } catch { /* セグメント単位の失敗は無視して継続 */ }
    finally { pendingRef.current = Math.max(0, pendingRef.current - 1); setSegBusy(pendingRef.current > 0); }
  };

  const startSegment = () => {
    const stream = streamRef.current;
    if (!stream) return;
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(stream, { audioBitsPerSecond: 48000 }); } // 低ビットレートでセグメントを小さく
    catch { mr = new MediaRecorder(stream); }
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    mr.onstop = () => {
      if (chunks.length) transcribeSegment(new Blob(chunks, { type: chunks[0].type || 'audio/webm' }));
      if (recordingRef.current) startSegment(); // 次のセグメントへ（録音は途切れさせない）
      else finalizeStop();
    };
    mr.start();
    mrRef.current = mr;
    segTimeoutRef.current = setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, SEGMENT_MS);
  };

  const start = async () => {
    setErr(''); setNote(''); setTranscript(''); transcriptRef.current = ''; setSec(0);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNote('マイクが使えませんでした。「うまく録音できない場合」からテキストで提出してください。');
      setFbOpen(true);
      return;
    }
    recordingRef.current = true;
    setRecState('recording');
    elapsedRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    startSegment();
  };

  const stop = () => {
    recordingRef.current = false;
    if (segTimeoutRef.current) clearTimeout(segTimeoutRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    const mr = mrRef.current;
    if (mr && mr.state === 'recording') mr.stop(); // 最終セグメント → onstop → finalize
    else finalizeStop();
  };

  const finalizeStop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecState('done');
    setNote('文字起こしの仕上げ中…（数秒）。文字が出そろったら提出できます。');
  };

  const reRecord = () => { setTranscript(''); transcriptRef.current = ''; start(); };

  const submit = async (text: string) => {
    if (!name.trim()) { setErr('チーム名を入力してください'); return; }
    if (!text.trim()) { setErr('録音（自動文字起こし）か、テキスト入力のどちらかを行ってください'); return; }
    setErr(''); setBusy(true);
    try {
      const r1 = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, members: members.filter((m) => m.trim()) }) });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || 'チーム作成に失敗しました');
      await fetch(`/api/teams/${j1.id}/transcript`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: text }) });
      router.push(`/onsite/team/${j1.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  const submitFallback = () => {
    const text = FB.map((f, i) => fb[i]?.trim() && `${f.label}：${fb[i].trim()}`).filter(Boolean).join(' / ');
    submit(text);
  };

  const canSubmit = recState === 'done' && !segBusy && !!transcript.trim();

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <BackButton /><Link href="/" className="logo-dot">8</Link>
            <span className="app-head-title">リアル振り返り</span>
            <span className="badge badge-gray" style={{ fontSize: 10, padding: '3px 8px' }}>ONSITE-1</span>
          </div>
          <Link href="/" className="icon-close" aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </Link>
        </header>
        <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '4px 2px 0' }}>代表者のスマホで実施してください。録音中、文字起こしがリアルタイムで進みます（長時間OK）。</p>

        {/* 録音できない場合のテキストフォーム（アコーディオン） */}
        <button className={`accordion-toggle ${fbOpen ? 'open' : ''}`} style={{ marginTop: 14 }} onClick={() => setFbOpen((o) => !o)}>
          <span>うまく録音できない場合はこちら</span>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div className={`accordion-body ${fbOpen ? 'open' : ''}`}>
          <div style={{ padding: '14px 2px 4px' }}>
            <p className="tiny muted" style={{ marginBottom: 12 }}>録音の代わりに、チームの振り返りをテキストで記録します（内容は最終結果に反映されます）。</p>
            {FB.map((f, i) => (
              <div className="field" key={f.n}>
                <div className="field-head"><label><span className="num">{f.n}</span> {f.label}</label></div>
                <textarea className="textarea" placeholder={f.ph} value={fb[i]} onChange={(e) => setFb((v) => { const n = [...v]; n[i] = e.target.value; return n; })} />
              </div>
            ))}
            <button className="btn btn-primary btn-block" onClick={submitFallback} disabled={busy}>{busy ? <><span className="btn-spin" /> 送信中…</> : 'テキストで提出'}</button>
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>チーム名 <span className="hint">本日限定、自由記入</span></label>
          <input className="input" placeholder="チーム名を入力" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label>メンバー <span className="hint">（Discord名）・最大7名</span></label>
          <div id="memberList">
            {members.map((m, i) => (
              <input key={i} className="input member" style={{ marginBottom: 8 }} placeholder="Discord名" value={m} onChange={(e) => setMember(i, e.target.value)} />
            ))}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <div className="eyebrow">{recState === 'recording' ? '録音中 — タップで停止' : recState === 'done' ? '録音を確認 → 提出' : '録音 — タップで開始'}</div>
          <div className={`record-btn ${recState === 'recording' ? '' : 'idle'}`} onClick={() => (recState === 'recording' ? stop() : start())}><div className="sq" /></div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{fmt(sec)}</div>
          <div className="wave" style={{ display: recState === 'recording' ? 'flex' : 'none' }}>
            {Array.from({ length: 10 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>
            {recState === 'recording' ? (segBusy ? '文字起こし中…（45秒ごとに逐次）' : '録音 · 文字起こし進行中') : '録音 · AI文字起こし'}
          </div>
          {recState === 'done' && <button className="btn btn-block" style={{ marginTop: 14 }} onClick={reRecord}>録り直す</button>}
        </div>

        {(recState !== 'idle' && (transcript || note)) && (
          <div className="card" style={{ padding: '14px 16px', background: 'var(--gray-100)' }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>文字起こし（この内容で分析します）{segBusy && ' · 仕上げ中…'}</span>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg)', maxHeight: 200, overflowY: 'auto' }}>
              {transcript || <span className="muted">{recState === 'recording' ? '話し始めると、ここに文字が出てきます…' : note}</span>}
            </div>
          </div>
        )}

        {err && <p className="tiny" style={{ color: 'var(--minta)', marginBottom: 10 }}>{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || !canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }} onClick={() => submit(transcript)}>
          {busy ? <><span className="btn-spin" /> 提出中…（アップロード）</> : segBusy && recState === 'done' ? '文字起こし仕上げ中…' : '提出'}
        </button>
      </div>
    </div>
  );
}
