'use client';

import { useEffect, useRef, useState } from 'react';

const ONLINE_TILES = [
  { k: 'REMOTE-1', n: '黙々タイム（入力）', d: '自分のプロダクトを個人で振り返り、提出する', href: '/remote/input' },
  { k: 'REMOTE-2', n: '黙々タイムの結果（確認）', d: 'みんなの振り返りをAIが集約した結果を見る', href: '/remote/result' },
  { k: 'REMOTE-3', n: '気づきメモ（ブレイクアウト中）', d: '話しながら気づいたことを、その場でメモする', href: '/remote/feedback' },
  { k: 'REMOTE-4', n: 'オンライン集約', d: 'オンライン全体をAIで集約し、解釈を映す', href: '/remote/admin' },
];
const REAL_TILES = [
  { k: 'ONSITE-1', n: '振り返り録音（代表者）', d: 'チームの議論を代表者が録音して、提出する', href: '/onsite/record' },
  { k: 'ONSITE-2', n: 'チームの振り返り', d: 'AIがチームの議論を分析し、振り返りを返す', href: '/onsite/live' },
  { k: 'ONSITE-3', n: '全体集計（投影）', d: 'ONSITE全体をまとめて、会場に映す', href: '/onsite/live' },
];

const DOWN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);

export default function Home() {
  const onlineRef = useRef<HTMLElement>(null);
  const realRef = useRef<HTMLElement>(null);
  const [flash, setFlash] = useState<'online' | 'real' | null>(null);

  const go = (which: 'online' | 'real', ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFlash(which);
    setTimeout(() => setFlash(null), 1300);
  };

  // 他画面から ?to=online / ?to=real で戻ってきたら、その節へスクロール＆ハイライト
  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get('to');
    if (to === 'online' || to === 'real') {
      setTimeout(() => go(to, to === 'online' ? onlineRef : realRef), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="topbar">
        <a href="/" className="logo-dot">8</a>
        <span className="title">web3・AI概論 — 第8回 ワークショップ</span>
        <span className="spacer" />
      </div>

      <div className="gal">
        <span className="eyebrow">2026/06/11 木 · web3/AI概論 第8回振り返り会</span>
        <h1 style={{ margin: '6px 0 18px', fontSize: 26 }}>
          これまでの取り組みを、プロダクトを中心に意見交換しましょう
        </h1>

        <div className="section-label">STEP1　あなたの参加形態は？（タップで下に移動）</div>
        <div className="entry-grid">
          <a className="entry-card online" onClick={() => go('online', onlineRef)}>
            <span className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
            </span>
            <span className="et"><span className="k">REMOTE</span><span className="v">オンラインの方はこちら</span></span>
            <span className="arrow">{DOWN}</span>
          </a>
          <a className="entry-card real" onClick={() => go('real', realRef)}>
            <span className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" /></svg>
            </span>
            <span className="et"><span className="k">ONSITE</span><span className="v">リアル会場の方はこちら</span></span>
            <span className="arrow">{DOWN}</span>
          </a>
        </div>

        <section className={`track${flash === 'online' ? ' flash' : ''}`} ref={onlineRef}>
          <div className="track-head"><span className="tnum">REMOTE</span><h2>オンライン</h2><span className="line" /></div>
          <div className="gal-grid">
            {ONLINE_TILES.map((t) => (
              <a className="gal-card" href={t.href} key={t.k}><div className="thumb">{t.k}</div><div className="meta"><div className="n">{t.n}</div><div className="d">{t.d}</div></div></a>
            ))}
          </div>
        </section>

        <section className={`track${flash === 'real' ? ' flash' : ''}`} ref={realRef}>
          <div className="track-head"><span className="tnum">ONSITE</span><h2>リアル会場</h2><span className="line" /></div>
          <div className="gal-grid">
            {REAL_TILES.map((t) => (
              <a className="gal-card" href={t.href} key={t.k}><div className="thumb">{t.k}</div><div className="meta"><div className="n">{t.n}</div><div className="d">{t.d}</div></div></a>
            ))}
          </div>
        </section>

        <div className="track-head"><span className="tnum">STEP2</span><h2>集計</h2><span className="line" /></div>
        <a className="final-card" href="/final">
          <div>
            <span className="fc-k">ALL · 投影</span>
            <div className="fc-title">最終結果</div>
            <div className="fc-desc">リアルとオンラインを統合し、全体の声をまとめる</div>
          </div>
          <span className="fc-arrow">→</span>
        </a>
      </div>
    </>
  );
}
