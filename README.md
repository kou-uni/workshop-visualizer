# workshop-visualizer

web3・AI概論 第8回 ワークショップ支援アプリ（オンライン＆リアルの振り返りをAIが集約・可視化）

- 設計：`../web3ai-gairon/agents-docs/lecture8-workshop-apps/`（requirements / overview / implementation-plan）
- UXモック：同 `mockup/`（全9画面の挙動の正）
- スタック：**Next.js (App Router) + Vercel + Supabase + OpenAI**

---

## 大きなマイルストーン

| M | ゴール | 主な中身 |
|---|---|---|
| **M0 基盤**（← いまここ） | 起動する土台＋デザインシステム＋型＋DBスキーマ | Next.js / デザイントークン移植 / `Scope`型 / Supabaseマイグレーション / Vercel・GitHub配線 |
| **M1 オンライン縦** | REMOTE-1〜4 が実データで動く | 提出→保存→集約(map-reduce)→ワードクラウド→spark/minta会話（scope=online） |
| **M2 リアル縦** | ONSITE-1〜3 が動く | 逐次録音→STT(gpt-4o-transcribe)→卓集約→チーム結果（scope=team/real） |
| **M3 統合＋非機能** | 山に耐える | merged集約 / 再送制御・冪等・429リトライ / Realtime投影 / 監視 / RLS |
| **M4 本番化** | 当日Goサイン | 会場NW実測・OpenAI tier確認・負荷/リハ・劣化運用 |

> 本番前TBD：OpenAIアカウントtier、CHIBATECH会場Wi-Fi（20台同時音声）の実測。

---

## ローカル起動

```bash
npm install
cp .env.example .env.local   # 値を埋める（下記 Supabase 手順）
npm run dev                  # http://localhost:3000
```

---

## Supabase セットアップ手順

1. **プロジェクト作成**：https://supabase.com → New project（Region は東京/Asia 推奨）。
2. **キー取得**：Project Settings → API
   - `Project URL` → `.env.local` の `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role`（秘密）→ `SUPABASE_SERVICE_ROLE_KEY`（サーバ専用・絶対に公開しない）
3. **スキーマ適用**：SQL Editor に `supabase/migrations/0001_init.sql` を貼って Run。
   - もしくは CLI：`supabase link --project-ref <ref>` → `supabase db push`
4. （M3）RLS を有効化し、セッション境界ポリシーを定義。

`.env.local` は **`.gitignore` 済み**。秘密情報はコミット・チャット共有しない。

---

## デプロイ（Vercel）

1. https://vercel.com → Import → GitHub `kou-uni/workshop-visualizer`
2. 環境変数に `.env.local` と同じ4つを設定（`OPENAI_API_KEY` 含む）
3. `main` push で本番、ブランチで Preview。**当日のみ Pro** にして関数の余裕を確保。

---

## ディレクトリ

```
app/            画面（App Router）・layout/globals.css（デザインシステム）
lib/            types.ts（Scope/AggregationResult）・supabaseClient.ts
supabase/       migrations（DBスキーマ）
```

## 設計上の鉄則
- 共通機能は1実装。**Scope（online/real/team/merged）を必ず引数で渡す**（取り違え防止）。
- 画面で生スタイルを書かない。**globals.css のトークン/コンポーネントのみ**。
- AIキーは**サーバ専用**。音声は**保存しない**（transcriptのみ）。
