'use client';

import { useState } from 'react';

const LINES = [
  'ごめん💦 spark と順番に議論中！ちょっと待って、もう一回押して〜🙏',
  'いま別のチームと白熱中😆 少し待って、もう一回！',
  '順番に読んでるとこ💦 ちょっとだけ待ってね〜！',
];

// 混雑/一時エラー時に minta が申し訳なさそうに言う吹き出し
export default function MintaBusy() {
  const [i] = useState(() => Math.floor(Math.random() * LINES.length));
  return (
    <div className="minta-busy">
      <div className="mb-avatar">M</div>
      <div className="mb-bubble">{LINES[i]}</div>
    </div>
  );
}
