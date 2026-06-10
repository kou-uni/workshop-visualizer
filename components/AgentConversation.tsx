'use client';

import { useEffect, useState } from 'react';
import Typewriter from './Typewriter';
import type { AggregationResult, AgentInterpretation } from '@/lib/types';

// spark/minta 会話モジュール：「話す」→ くるくる → 読み解き → Q&A（1往復・AI返信）
export default function AgentConversation({ result, autoStart = false, stacked = false }: { result: AggregationResult; autoStart?: boolean; stacked?: boolean }) {
  const [phase, setPhase] = useState<'cta' | 'analyzing' | 'revealed'>(autoStart ? 'analyzing' : 'cta');
  const context = result.trendSummary || '';

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const t = setTimeout(() => setPhase('revealed'), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  const start = () => setPhase('analyzing');

  if (phase === 'cta') {
    return (
      <div className="talk-cta">
        <div className="talk-bubble">spark &amp; minta に聞いてみよ〜！</div>
        <div>
          <button className="btn btn-primary btn-lg" onClick={start}>2人に読み解いてもらう</button>
        </div>
      </div>
    );
  }

  if (phase === 'analyzing') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 18px' }} />
        <Analyzing />
      </div>
    );
  }

  return (
    <div className={stacked ? 'agent-stack' : 'grid-2'}>
      <AgentCard who="spark" lens="技術 / アーキ" data={result.interpretations.spark} context={context} />
      <AgentCard who="minta" lens="要件 / 価値 / UX" data={result.interpretations.minta} context={context} />
    </div>
  );
}

function Analyzing() {
  const msgs = ['議論を読み込んでいます…', '共通点をさがしています…', 'もうすぐ、まとめます！'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((x) => (x + 1) % msgs.length), 950);
    return () => clearInterval(iv);
  }, []);
  return <div className="muted" style={{ fontSize: 14 }}>{msgs[i]}</div>;
}

function AgentCard({ who, lens, data, context }: { who: 'spark' | 'minta'; lens: string; data: AgentInterpretation; context: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [reply, setReply] = useState('');
  const [asking, setAsking] = useState(false);
  const reads = data?.reads ?? [];

  const send = async () => {
    const a = answer.trim();
    if (!a) return;
    setAsking(true); setReply('');
    try {
      const res = await fetch('/api/agent/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who, question: data.question, answer: a, context }) });
      const j = await res.json();
      setReply(j.reply || '…');
    } catch { setReply('うまく返せなかった…もう一度試してみて！'); }
    finally { setAsking(false); }
  };

  return (
    <div className={`agent ${who}`}>
      <div className="ahead">
        <div className="avatar">{who === 'spark' ? 'S' : 'M'}</div>
        <div style={{ flex: 1 }}>
          <div className="who">{who}-agent</div>
          <div className="lens">{lens}</div>
        </div>
      </div>

      <div className={`agent-collapse ${collapsed ? 'collapsed' : ''}`}>
        {reads.map((r, i) => (
          <div className="read-item" key={i}>
            <div className="read"><Typewriter text={r.read} delay={i * 900} /></div>
            {r.evidence?.[0] && <div className="evidence">{r.evidence[0]}</div>}
          </div>
        ))}

        {data.question && (
          <div className="ask" data-kind={who}>
            <div className="ask-q"><span className="qi">❓</span>{data.question}</div>
            <div className="ask-row">
              <input className="input ask-input" placeholder="ひとことで答えてみて" value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                disabled={asking || !!reply} />
              <button className="btn ask-send" onClick={send} disabled={asking || !!reply}>{asking ? '…' : '送る'}</button>
            </div>
            {reply && <div className="ask-reply"><Typewriter text={reply} /></div>}
          </div>
        )}
      </div>

      <button className={`agent-fold ${collapsed ? 'collapsed' : ''}`} onClick={() => setCollapsed((c) => !c)}>
        <span>{collapsed ? 'ひらく' : '折りたたむ'}</span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
}
