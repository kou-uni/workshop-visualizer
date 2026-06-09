import { createClient } from '@supabase/supabase-js';

// ブラウザ／サーバ共通：anon キーで RLS 前提のアクセス
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

// サーバ専用：service role（API Route Handler でのみ import すること）
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } }
  );
}
