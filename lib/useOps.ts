'use client';

import { useEffect, useState } from 'react';

// 運営アンロック：URLに ?ops=KEY が付いていたら localStorage に保存（URLからは消す）。
// 以降この端末では運営集約ボタンが表示され、リクエストにキーを添付する。
// 受講生（キーなし）はボタンが出ず、サーバ側でも運営scopeの集約を弾く。
export function useOps(): string | null {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const p = url.searchParams.get('ops');
      if (p) {
        localStorage.setItem('ops', p);
        url.searchParams.delete('ops');
        window.history.replaceState({}, '', url.toString());
      }
      setKey(localStorage.getItem('ops'));
    } catch {}
  }, []);
  return key;
}
