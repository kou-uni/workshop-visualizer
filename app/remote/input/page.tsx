'use client';

import Link from 'next/link';
import { useState } from 'react';

const MIC = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const FIELDS = [
  { key: 'pr', label: '自身のプロダクトの簡単な紹介', ph: '誰に何を作っている？　例：社会人向けの学習記録アプリ' },
  { key: 'stumble', label: 'つまずいた点 ＋ 乗り越えた話', ph: 'どこで詰まり、どう抜けた？　例：環境変数でハマり、Secret設定を直した' },
  { key: 'hack', label: 'ちょびっとしたハック', ph: '共有したい小ワザを。例：CLAUDE.mdに「結論を先に」' },
  { key: 'trouble', label: 'いま困っていること', ph: '助けてほしいことを具体的に。例：音声の話者分離が知りたい' },
] as const;

export default function RemoteInput() {
  const [discordName, setDiscordName] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!discordName.trim()) { setErr('Discord名を入力してください'); return; }
    setErr(''); setState('sending');
    try {
      const res = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordName, ...vals }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '送信に失敗しました');
      setState('done');
    } catch (e: any) {
      setErr(e.message); setState('idle');
    }
  };

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <Link href="/" className="logo-dot">8</Link>
            <span className="app-head-title">第7回振り返り（個人作業）</span>
            <span className="badge" style={{ fontSize: 10, padding: '3px 8px' }}>REMOTE-1</span>
          </div>
          <Link href="/" className="icon-close" aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </Link>
        </header>

        {state === 'done' ? (
          <div className="done-banner">
            <div className="check"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
            <h2 style={{ marginBottom: 6 }}>提出しました</h2>
            <p className="muted tiny">みんなの振り返りに反映されます。</p>
            <Link href="/" className="btn btn-block" style={{ marginTop: 18 }}>トップへ戻る</Link>
          </div>
        ) : (
          <>
            <div className="phase-pill phase-pill-full">
              <span><span className="dot" /> 黙々タイム</span>
              <span className="mono">07:32</span>
            </div>

            <div className="field" style={{ marginTop: 20 }}>
              <div className="field-head"><label>Discord名</label></div>
              <input className="input" placeholder="Discordの表示名を入力（例：spark）" value={discordName} onChange={(e) => setDiscordName(e.target.value)} />
            </div>

            <div className="group-label">振り返り</div>

            {FIELDS.map((f, i) => (
              <div className="field" key={f.key}>
                <div className="field-head">
                  <label><span className="num">{i + 1}</span> {f.label}</label>
                  <button className="mic-btn" type="button" aria-label="音声入力">{MIC}</button>
                </div>
                <textarea className="textarea" placeholder={f.ph} value={vals[f.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
              </div>
            ))}

            {err && <p className="tiny" style={{ color: 'var(--minta)', marginBottom: 10 }}>{err}</p>}
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={submit} disabled={state === 'sending'}>
              {state === 'sending' ? '送信中…' : '提出'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
