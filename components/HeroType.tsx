'use client';

import { useEffect, useState } from 'react';

const DEFAULT = ['みんなの議論を読み込んでいます', 'おもしろい共通点を見つけました', '気づきを、まとめています', 'もうすぐ、シェアします！'];

// 投影用：フレーズを順にループ・タイプ表示（数字なし）
export default function HeroType({ phrases = DEFAULT }: { phrases?: string[] }) {
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      let p = 0;
      while (!cancelled) {
        const txt = phrases[p];
        for (let k = 1; k <= txt.length && !cancelled; k++) { setText(txt.slice(0, k)); await sleep(60); }
        await sleep(1500);
        for (let k = txt.length; k >= 0 && !cancelled; k--) { setText(txt.slice(0, k)); await sleep(24); }
        await sleep(280);
        p = (p + 1) % phrases.length;
      }
    })();
    return () => { cancelled = true; };
  }, [phrases]);

  return <span>{text}<span className="type-caret" /></span>;
}
