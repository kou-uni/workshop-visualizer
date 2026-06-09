-- 第8回 ワークショップApp 初期スキーマ（実装計画 §7 準拠）
-- Supabase の SQL Editor に貼って実行、または supabase CLI で push する

create extension if not exists "pgcrypto";

-- 当日イベント
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- 参加者（自己申告・軽量／Discord名のみ）
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  discord_name text not null,
  created_at timestamptz not null default now()
);

-- オンライン個人振り返り
create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  discord_name text not null,
  pr text,
  stumble text,
  hack text,
  trouble text,
  audio_text text,
  committed_at timestamptz not null default now()
);

-- リアルのチーム（当日限り・自由記入・メンバーは配列）
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  members text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 録音（音声は保存しない＝transcript のみ保持）
create table if not exists recordings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  transcript text not null default '',
  status text not null default 'recording',
  updated_at timestamptz not null default now()
);

-- 気づきメモ（設計方針：個人/卓に紐付けず、全体プールにマージ＝軽量）
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 集計結果（scope ごと：online / real / team / merged）
create table if not exists aggregations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  scope text not null check (scope in ('online','real','team','merged')),
  team_id uuid references teams(id) on delete cascade,
  phase text,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reflections_session on reflections(session_id);
create index if not exists idx_recordings_team on recordings(team_id);
create index if not exists idx_aggregations_scope on aggregations(session_id, scope, team_id);

-- 注意：本番では RLS を有効化し、セッション境界でポリシーを定義すること（M3で対応）
