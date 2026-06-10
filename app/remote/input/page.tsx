'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const MIC = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
);
const STOP = (
  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
);
const FIELDS = [
  { key: 'pr', label: '自身のプロダクトの簡単な紹介', ph: '誰に何を作っている？　例：社会人向けの学習記録アプリ' },
  { key: 'stumble', label: 'つまずいた点 ＋ 乗り越えた話', ph: 'どこで詰まり、どう抜けた？　例：環境変数でハマり、Secret設定を直した' },
  { key: 'hack', label: 'ちょびっとしたハック', ph: '共有したい小ワザを。例：CLAUDE.mdに「結論を先に」' },
  { key: 'trouble', label: 'いま困っていること', ph: '助けてほしいことを具体的に。例：音声の話者分離が知りたい' },
] as const;

export default function RemoteInput() {
  const router = useRouter();
  const [discordName, setDiscordName] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [err, setErr] = useState('');
  const [t, setT] = useState(5 * 60); // 黙々タイム 5分
  const [recField, setRecField] = useState<number | null>(null);
  const [txField, setTxField] = useState<number | null>(null);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    ivRef.current = setInterval(() => setT((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, []);
  const timer = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

  // 各項目の音声入力：マイク→録音→停止→文字起こし→その欄に反映
  const toggleMic = async (i: number, key: string) => {
    if (recField === i) { mrRef.current?.stop(); return; }
    if (recField !== null || txField !== null) return;
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        setRecField(null); setTxField(i);
        try {
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
          const fd = new FormData();
          fd.append('audio', blob, 'voice.webm');
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
          const j = await res.json();
          if (res.ok && j.text) setVals((v) => ({ ...v, [key]: (v[key] ? v[key] + ' ' : '') + j.text }));
          else setErr('文字起こしに失敗しました。もう一度お試しください。');
        } catch { setErr('文字起こしに失敗しました。'); }
        setTxField(null);
      };
      mr.start();
      mrRef.current = mr;
      setRecField(i);
    } catch { setErr('マイクが使えませんでした（ブラウザの許可をご確認ください）。'); }
  };

  const submit = async () => {
    if (!discordName.trim()) { setErr('Discord名は必須です'); return; }
    setErr(''); setState('sending');
    try {
      const res = await fetch('/api/reflections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discordName, ...vals }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '送信に失敗しました');
      router.push('/?to=online'); // トップのオンライン（REMOTE）セクションへ
    } catch (e: any) { setErr(e.message); setState('idle'); }
  };

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
            <span className="app-head-title">第7回振り返り（個人作業）</span>
            <span className="badge badge-gray" style={{ fontSize: 10, padding: '3px 8px' }}>REMOTE-1</span>
          </div>
        </header>

        <div className="phase-pill phase-pill-full">
          <span><span className="dot" /> 黙々タイム</span>
          <span className="mono">{timer}</span>
        </div>

        <div className="field" style={{ marginTop: 20 }}>
          <div className="field-head"><label>Discord名 <span className="hint">必須</span></label></div>
          <input className="input" placeholder="Discordの表示名を入力（例：spark）" value={discordName} onChange={(e) => setDiscordName(e.target.value)} />
        </div>

        <div className="group-label">振り返り <span className="muted">（マイクで音声入力もできます）</span></div>

        {FIELDS.map((f, i) => (
          <div className="field" key={f.key}>
            <div className="field-head">
              <label><span className="num">{i + 1}</span> {f.label}</label>
              <button className={`mic-btn ${recField === i ? 'rec' : ''}`} type="button" aria-label="音声入力"
                onClick={() => toggleMic(i, f.key)} disabled={(recField !== null && recField !== i) || txField !== null}>
                {txField === i ? <span className="mic-spin" /> : recField === i ? STOP : MIC}
              </button>
            </div>
            <textarea className="textarea" placeholder={recField === i ? '録音中… もう一度マイクで停止' : f.ph} value={vals[f.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
          </div>
        ))}

        {err && <p className="tiny" style={{ color: 'var(--minta)', marginBottom: 8 }}>{err}</p>}
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={submit} disabled={state === 'sending'}>
          {state === 'sending' ? <><span className="btn-spin" /> 送信中…</> : '提出'}
        </button>
      </div>
    </div>
  );
}
