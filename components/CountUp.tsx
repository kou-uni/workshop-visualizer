'use client';

import { useEffect, useRef, useState } from 'react';

// 0 → value をふわっとカウントアップ
export default function CountUp({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(value * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{n}</>;
}
