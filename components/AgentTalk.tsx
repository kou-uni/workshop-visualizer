'use client';

import { useEffect, useState } from 'react';
import Typewriter from './Typewriter';
import type { AgentInterpretation } from '@/lib/types';

// spark/minta の会話モジュール：くるくる → 読み解き(タイプ) → ひと言問いかけ
export default function AgentTalk({ who, label, data }: { who: 'spark' | 'minta'; label: string; data: AgentInterpretation }) {
  const reads = data?.reads ?? [];
  const question = data?.question ?? '';
  const [phase, setPhase] = useState<'analyzing' | 'reveal' | 'question'>('analyzing');

  useEffect(() => {
    setPhase('analyzing');
    const speed = 22, stagger = 700;
    const revealDur = reads.reduce((acc, r, i) => Math.max(acc, i * stagger + r.read.length * speed), 0) + 500;
    const t1 = setTimeout(() => setPhase('reveal'), 1300);
    const t2 = setTimeout(() => setPhase('question'), 1300 + revealDur);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [data]);

  return (
    <div className={`agent agent-${who}`}>
      <div className="agent-head"><span className="agent-dot" />{label}</div>

      {phase === 'analyzing' ? (
        <div className="agent-analyzing"><span className="agent-spin" />読み解いています…</div>
      ) : (
        <ul className="ilist">
          {reads.length === 0 && <li className="muted tiny">—</li>}
          {reads.map((r, i) => (
            <li key={i}>
              <div className="il-t" style={{ fontWeight: 500 }}><Typewriter text={r.read} delay={i * 700} /></div>
              {r.evidence?.[0] && <div className="il-ev">“{r.evidence[0]}”</div>}
            </li>
          ))}
        </ul>
      )}

      {phase === 'question' && question && (
        <div className={`talk-bubble talk-${who}`}>
          <span className="talk-icon">{who === 'minta' ? '🩷' : '💡'}</span>
          <span className="talk-q"><Typewriter text={question} /></span>
        </div>
      )}
    </div>
  );
}
