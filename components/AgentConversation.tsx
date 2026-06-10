'use client';

import { useEffect, useState } from 'react';
import Typewriter from './Typewriter';
import type { AggregationResult, AgentInterpretation } from '@/lib/types';

// spark と minta が議論しているような掛け合い（ポンポン出る）
const DISC_SCRIPT = [
  { who: 'spark', t: 'ふむふむ、共通点ありそう！' },
  { who: 'minta', t: 'それ面白いね〜' },
  { who: 'spark', t: 'ここ、テンプレ化できそう' },
  { who: 'minta', t: '“誰のため”が効いてるなぁ' },
  { who: 'spark', t: 'よし、まとめよっか！' },
  { who: 'minta', t: 'いくよ〜！' },
];

export default function AgentConversation({ result, autoStart = false, stacked = false }: { result: AggregationResult; autoStart?: boolean; stacked?: boolean }) {
  const [phase, setPhase] = useState<'cta' | 'analyzing' | 'revealed'>(autoStart ? 'analyzing' : 'cta');
  const context = result.trendSummary || '';

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const t = setTimeout(() => setPhase('revealed'), 3400);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'cta') {
    return (
      <div className="talk-cta">
        <div className="talk-bubble">spark &amp; minta に聞いてみよ〜！</div>
        <div><button className="btn btn-primary btn-lg" onClick={() => setPhase('analyzing')}>2人に読み解いてもらう</button></div>
      </div>
    );
  }

  if (phase === 'analyzing') return <Discussing />;

  return (
    <div className={stacked ? 'agent-stack' : 'grid-2'}>
      <AgentCard who="spark" lens="技術 / アーキ" data={result.interpretations.spark} context={context} />
      <AgentCard who="minta" lens="要件 / 価値 / UX" data={result.interpretations.minta} context={context} />
    </div>
  );
}

function Discussing() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setN((x) => (x < DISC_SCRIPT.length ? x + 1 : x)), 470);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="discussing">
      <div className="discussing-head"><span className="agent-spin" /> spark と minta が議論中…</div>
      <div className="dbubbles">
        {DISC_SCRIPT.slice(0, n).map((b, i) => (
          <div className={`dbubble dbubble-${b.who} pop`} key={i}>{b.t}</div>
        ))}
      </div>
    </div>
  );
}

function AgentCard({ who, lens, data, context }: { who: 'spark' | 'minta'; lens: string; data: AgentInterpretation; context: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [turns, setTurns] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const reads = data?.reads ?? [];

  const send = async () => {
    const a = answer.trim();
    if (!a || asking) return;
    setAnswer('');
    const idx = turns.length;
    setTurns((t) => [...t, { q: a, a: '' }]);
    setAsking(true);
    try {
      const res = await fetch('/api/agent/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who, question: data.question, answer: a, context }) });
      const j = await res.json();
      setTurns((t) => t.map((x, i) => (i === idx ? { ...x, a: j.reply || '…' } : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === idx ? { ...x, a: 'うまく返せなかった…もう一度送ってみて！' } : x)));
    } finally { setAsking(false); }
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
            <div className="ask-q"><span className="qi">{who === 'minta' ? '💡' : '🛠'}</span>{data.question}</div>

            {turns.map((t, i) => (
              <div className="ask-turn" key={i}>
                <div className="ask-you">{t.q}</div>
                {t.a ? <div className="ask-reply"><Typewriter text={t.a} /></div> : <div className="ask-reply muted">考え中…</div>}
              </div>
            ))}

            <div className="ask-row" style={{ marginTop: turns.length ? 11 : 0 }}>
              <input className="input ask-input" placeholder="ひとことで答えてみて（何回でもOK）" value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) { e.preventDefault(); send(); } }}
                disabled={asking} />
              <button className="btn ask-send" onClick={send} disabled={asking || !answer.trim()}>{asking ? '…' : '送る'}</button>
            </div>
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
