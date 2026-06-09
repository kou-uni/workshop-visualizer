'use client';

import Link from 'next/link';
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
    let r = result;
    try {
      if (!r) {
        const res = await fetch('/api/aggregate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'team', teamId: id }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || '分析に失敗しました');
        r = j.result as AggregationResult; setResult(r);
      }
      setTalkStarted(true);
    } catch (e: any) { setErr(e.message); } finally { setRunning(false); }
  };

  const memberItems = (result?.members?.length ? result.members : (team?.members ?? []).map((name) => ({ name, summary: '' })));

  return (
    <div className="device">
      <div className="notch" />
      <div className="device-body">
        <header className="app-head">
          <div className="app-head-left">
            <Link href="/" className="logo-dot">8</Link>
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
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>メンバーそれぞれの持ち寄り</span>
          <div>
            {memberItems.length === 0 && <p className="tiny muted">メンバーが登録されていません。</p>}
            {memberItems.map((m, i) => <Macc key={i} name={m.name} summary={m.summary} />)}
          </div>
        </div>

        {err && <p className="tiny" style={{ color: 'var(--minta)', marginTop: 10 }}>{err}</p>}

        {!talkStarted ? (
          <div className="talk-cta" id="talkCta">
            <div className="talk-bubble">一緒に議論しようよ〜！</div>
            <button className="btn btn-primary btn-block btn-lg" onClick={talk} disabled={running}>
              {running ? 'AIが読んでいます…' : '🗨 spark & minta と話す'}
            </button>
          </div>
        ) : (
          result && <div style={{ marginTop: 18 }}><AgentConversation result={result} autoStart /></div>
        )}
      </div>
    </div>
  );
}

function Macc({ name, summary }: { name: string; summary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="macc">
      <button className={`macc-head ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="rank mono-rank">{name.slice(0, 1)}</span>
        <span className="mh"><span className="t">{name}</span><span className="e">{summary || '録音から抽出（下のボタンで分析）'}</span></span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className={`macc-body ${open ? 'open' : ''}`}>
        <div className="inner">{summary || 'この人の持ち寄りは、録音の分析後にここに表示されます。'}</div>
      </div>
    </div>
  );
}
