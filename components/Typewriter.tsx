'use client';

import { useEffect, useState } from 'react';

// テキストを1文字ずつタイプ表示（spark/minta の読みの演出）
export default function Typewriter({ text, speed = 22, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const begin = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, delay);
    return () => { clearTimeout(begin); if (interval) clearInterval(interval); };
  }, [text, speed, delay]);

  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="type-caret" />}
    </span>
  );
}
