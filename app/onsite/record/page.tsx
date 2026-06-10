'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const SEGMENT_MS = 20000; // 20秒ごとに区切って逐次文字起こし（長尺・上限・タイムアウト対策）
const SHOW_RECORD = false; // 「この場で録音」は機能を残したまま非表示（true で再表示）
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
  const [paste, setPaste] = useState('');
  const [fbOpen, setFbOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [fb, setFb] = useState<string[]>(['', '', '', '']);

  const [recState, setRecState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [sec, setSec] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [segBusy, setSegBusy] = useState(false);
  const [segDone, setSegDone] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const recordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const segTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');
  const pendingRef = useRef(0);

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
        setSegDone((n) => n + 1);
      }
    } catch { /* セグメント単位の失敗は無視して継続 */ }
    finally { pendingRef.current = Math.max(0, pendingRef.current - 1); setSegBusy(pendingRef.current > 0); }
  };

  const startSegment = () => {
    const stream = streamRef.current;
    if (!stream) return;
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(stream, { audioBitsPerSecond: 48000 }); }
    catch { mr = new MediaRecorder(stream); }
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    mr.onstop = () => {
      if (chunks.length) transcribeSegment(new Blob(chunks, { type: chunks[0].type || 'audio/webm' }));
      if (recordingRef.current) startSegment();
      else finalizeStop();
    };
    mr.start();
    mrRef.current = mr;
    segTimeoutRef.current = setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, SEGMENT_MS);
  };

  const start = async () => {
    setErr(''); setNote(''); setTranscript(''); transcriptRef.current = ''; setSec(0); setSegDone(0);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNote('マイクが使えませんでした。①貼り付け か ③テキスト入力で提出してください。');
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
    if (mr && mr.state === 'recording') mr.stop();
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
    if (members.filter((m) => m.trim()).length === 0) { setErr('メンバーを1名以上入力してください'); return; }
    if (!text.trim()) { setErr('いずれかの方法で議論の内容を入力してください'); return; }
    setErr(''); setBusy(true);
    try {
      const r1 = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, members: members.filter((m) => m.trim()) }) });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || 'チーム作成に失敗しました');
      await fetch(`/api/teams/${j1.id}/transcript`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: text }) });
      router.push(`/onsite/team/${j1.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  const submitFallback = () => submit(FB.map((f, i) => fb[i]?.trim() && `${f.label}：${fb[i].trim()}`).filter(Boolean).join(' / '));
  const canSubmitRec = recState === 'done' && !segBusy && !!transcript.trim();

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
        </header>

        {/* 議論のお題（何を話すか） */}
        <div className="card" style={{ marginTop: 12, padding: '18px 20px' }}>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>💬 このチームで話すこと</span>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
            <li>① 各自のプロダクトを一言で紹介</li>
            <li>② つまずいた点と、どう乗り越えたか</li>
            <li>③ 使えたハック・ちょっとした工夫</li>
            <li>④ いま困っていること</li>
          </ul>
          <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.6 }}>議論したら、下のいずれかの方法で内容を取り込み、AIに振り返ってもらいましょう。</p>
        </div>

        {/* チーム名・メンバー */}
        <div className="field" style={{ marginTop: 16 }}>
          <label>チーム名 <span className="hint">必須・本日限定</span></label>
          <input className="input" placeholder="チーム名を入力（必須）" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>メンバー <span className="hint">（Discord名）・1名以上必須・最大7名</span></label>
          <div id="memberList">
            {members.map((m, i) => (
              <input key={i} className="input member" style={{ marginBottom: 8 }} placeholder="Discord名" value={m} onChange={(e) => setMember(i, e.target.value)} />
            ))}
          </div>
        </div>

        {err && <p className="tiny" style={{ color: 'var(--minta)', margin: '4px 0 10px' }}>{err}</p>}

        {/* ① 文字起こしを貼り付け（おすすめ） */}
        <div className="group-label">① 文字起こしを貼り付け</div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <p className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>iPhoneのボイスメモ等で議論を録音・文字起こしして、その文章をそのまま貼り付け。アプリ側に元データが残るので一番安全です。</p>
          <textarea className="textarea" style={{ minHeight: 120 }} placeholder="文字起こしした議論の内容をここに貼り付け…" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 12 }} disabled={busy || !paste.trim()} onClick={() => submit(paste)}>
            {busy ? <><span className="btn-spin" /> 送信中…</> : 'この内容でAIに振り返ってもらう'}
          </button>
        </div>

        {SHOW_RECORD && (<>
        {/* この場で録音（機能は維持・通常は非表示） */}
        <div className="group-label" style={{ marginTop: 26 }}>② この場で録音 <span className="muted">（20秒ごとに自動文字起こし）</span></div>
        <button className={`accordion-toggle ${recOpen ? 'open' : ''}`} onClick={() => setRecOpen((o) => !o)}>
          <span>このスマホで録音する</span>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div className={`accordion-body ${recOpen ? 'open' : ''}`}>
          <div className="card" style={{ textAlign: 'center', padding: '24px 20px', marginTop: 12 }}>
            <div className="eyebrow">{recState === 'recording' ? '録音中 — タップで停止' : recState === 'done' ? '録音を確認 → 提出' : '録音 — タップで開始'}</div>
            <div className={`record-btn ${recState === 'recording' ? '' : 'idle'}`} onClick={() => (recState === 'recording' ? stop() : start())}><div className="sq" /></div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{fmt(sec)}</div>
            <div className="wave" style={{ display: recState === 'recording' ? 'flex' : 'none' }}>
              {Array.from({ length: 10 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}
            </div>
            <div className="tiny muted" style={{ marginTop: 8 }}>録音 · AI文字起こし</div>
            {recState === 'done' && <button className="btn btn-block" style={{ marginTop: 14 }} onClick={reRecord}>録り直す</button>}
          </div>

          {recState !== 'idle' && (
            <div className="card" style={{ padding: '14px 16px', background: 'var(--gray-100)' }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>文字起こし · 20秒ごとに反映（{segDone}区切り済）{segBusy && ' · 処理中…'}</span>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg)', maxHeight: 200, overflowY: 'auto' }}>
                {transcript || <span className="muted">{recState === 'recording' ? '最初の文字起こしは約20秒後に出ます（以降20秒ごとに追記）…' : note}</span>}
              </div>
            </div>
          )}
          <button className="btn btn-primary btn-block" disabled={busy || !canSubmitRec} style={{ opacity: canSubmitRec ? 1 : 0.5 }} onClick={() => submit(transcript)}>
            {busy ? <><span className="btn-spin" /> 提出中…</> : segBusy && recState === 'done' ? '文字起こし仕上げ中…' : '録音内容で提出'}
          </button>
        </div>
        </>)}

        {/* うまく録音できない場合（テキスト入力） */}
        <div className="group-label" style={{ marginTop: 26 }}>{SHOW_RECORD ? '③' : '②'} うまく録音できない場合 <span className="muted">（テキストで入力）</span></div>
        <button className={`accordion-toggle ${fbOpen ? 'open' : ''}`} onClick={() => setFbOpen((o) => !o)}>
          <span>テキストで入力する</span>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div className={`accordion-body ${fbOpen ? 'open' : ''}`}>
          <div style={{ padding: '14px 2px 4px' }}>
            {FB.map((f, i) => (
              <div className="field" key={f.n}>
                <div className="field-head"><label><span className="num">{f.n}</span> {f.label}</label></div>
                <textarea className="textarea" placeholder={f.ph} value={fb[i]} onChange={(e) => setFb((v) => { const n = [...v]; n[i] = e.target.value; return n; })} />
              </div>
            ))}
            <button className="btn btn-primary btn-block" onClick={submitFallback} disabled={busy}>{busy ? <><span className="btn-spin" /> 送信中…</> : '提出'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
