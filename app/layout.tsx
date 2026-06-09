import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'web3・AI概論 第8回 ワークショップ',
  description: '第8回 振り返り会 — オンライン＆リアル',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* 暗転トランジション（フェードインは純CSS／退出フェードはM1でルーター連携） */}
        <div id="pagefade" />
        {children}
      </body>
    </html>
  );
}
