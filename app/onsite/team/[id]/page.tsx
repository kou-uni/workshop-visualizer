'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AgentConversation from '@/components/AgentConversation';
import type { AggregationResult } from '@/lib/types';

type Team = { name: string; members: string[] };

export default function TeamResult() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [team, setTeam] = useState<Team | null>(null);
  const [hasRec, setHasRec] = useState(false);
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [talkStarted, setTalkStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/teams/${id}`).then((r) => r.json()).then((j) => { if (j.team) setTeam(j.team); setHasRec(!!j.recording?.transcript?.trim()); }).catch(() => {});
    fetch(`/api/aggregation?scope=team&teamId=${id}`).then((r) => r.json()).then((j) => { if (j.result) setResult(j.result); }).catch(() => {});
  }, [id]);

  const talk = async () => {
    setRunning(true); setErr('');
    const t0 = Date.now();
    let r = result;
    try {
      if (!r) {
        const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'team', teamId: id }) });
        const j = await res.json();
        if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : '分析に失敗しました');
        r = j.result as AggregationResult; setResult(r);
      }
      const elapsed = Date.now() - t0;
      if (elapsed < 5200) await new Promise((res) => setTimeout(res, 5200 - elapsed)); // 議論中の演出を最低5.2秒見せる（3個ほど）
      setTalkStarted(true);
    } catch (e: any) { setErr(typeof e?.message === 'string' && e.message ? e.message : '分析に失敗しました。少し待って、もう一度お試しください。'); } finally { setRunning(false); }
  };

  const reAnalyze = async () => {
    setRunning(true); setErr('');
    try {
      const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'team', teamId: id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || '分析に失敗しました');
      setResult(j.result as AggregationResult);
    } catch (e: any) { setErr(typeof e?.message === 'string' && e.message ? e.message : '分析に失敗しました。少し待って、もう一度お試しください。'); } finally { setRunning(false); }
  };

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <BackButton /><Link href="/" className="logo-dot">8</Link>
            <span className="app-head-title">チームの振り返り</span>
            <span className="badge badge-gray" style={{ fontSize: 10, padding: '3px 8px' }}>ONSITE-2</span>
          </div>
          <Link href="/" className="icon-close" aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </Link>
        </header>

        <div className="phase-pill phase-pill-full">
          <span><span className="dot" /> {team?.name ?? 'チーム'} ・ {team?.members?.length ?? 0}名</span>
          {hasRec && <span className="synced">録音あり</span>}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>💬 議論のサマリ ・ spark &amp; minta がまとめました</span>
          {result?.discussionSummary
            ? <p style={{ fontSize: 14.5, lineHeight: 1.9, fontWeight: 500 }}>{result.discussionSummary}</p>
            : <p className="tiny muted" style={{ lineHeight: 1.7 }}>「spark &amp; minta と話す」を押すと、録音から議論の概要（どんな議論だったか）をまとめます。</p>}
        </div>

        {err && <p className="tiny" style={{ color: 'var(--minta)', marginTop: 10 }}>{err}</p>}

        {!talkStarted ? (
          <div className="talk-cta" id="talkCta">
            {running ? <DiscussBubbles /> : <div className="talk-bubble">一緒に議論しようよ〜！</div>}
            <button className="btn btn-primary btn-block btn-lg" onClick={talk} disabled={running}>
              {running ? <><span className="btn-spin" /> spark と minta が議論中…</> : '🗨 spark & minta と話す'}
            </button>
          </div>
        ) : (
          result && (
            <div style={{ marginTop: 18 }}>
              <AgentConversation result={result} instant stacked />
              <button className="btn btn-block" style={{ marginTop: 14 }} onClick={reAnalyze} disabled={running}>
                {running ? <><span className="btn-spin" /> 分析中…</> : '🔄 もう一度分析する'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// 議論中の演出：spark と minta が裏で話している吹き出しがポンポン湧き上がる
const DISC = [
  { who: 'minta', t: 'ふむふむ、共通点ありそう！' },
  { who: 'spark', t: 'お、いいハック見つけた' },
  { who: 'minta', t: 'それ面白いね〜' },
  { who: 'spark', t: 'ここテンプレ化できそう' },
  { who: 'minta', t: '“誰のため”が効いてるなぁ' },
  { who: 'spark', t: 'よし、まとめよっか！' },
];

function DiscussBubbles() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setN((x) => x + 1), 1700); // 1個ずつ・1.7秒で出て消える
    return () => clearInterval(iv);
  }, []);
  const b = DISC[n % DISC.length];
  return (
    <div className="discuss-bubbles">
      <div key={n} className={`chat-pop chat-${b.who}`}>{b.t}</div>
    </div>
  );
}

