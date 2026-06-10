'use client';

import { useState } from 'react';

const LINES = [
  'ごめんっ💦 いま spark と二人で、他のチームの議論を順番に読んでる最中なの…！ ちょっとだけ待って、もう一回押してくれる？🙏',
  'あちゃ〜、今ちょうど別のチームと白熱した議論中で😆 順番にやってるから、少しだけ待ってね〜！もう一回お願い！',
  'うぅ、ごめんね！spark と二人がかりで順番に読み込んでて、まだ手が回ってないの💦 少し待って、もう一度ポチッとして〜！🙏',
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
