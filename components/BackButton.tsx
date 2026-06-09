'use client';

import { useRouter } from 'next/navigation';

// 1つ前の画面に戻る（履歴が無ければトップへ）
export default function BackButton() {
  const router = useRouter();
  const back = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };
  return (
    <button className="icon-close" onClick={back} aria-label="前の画面に戻る" type="button" style={{ marginRight: 2 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
  );
}
