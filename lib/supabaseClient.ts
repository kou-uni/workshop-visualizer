import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

// ブラウザ／サーバ共通：新方式 publishable（旧 anon）どちらでも動く
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const supabase = createClient(url, publishable);

// サーバ専用：新方式 secret（旧 service_role）。Route Handler でのみ import すること
export function supabaseAdmin() {
  const secret =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    '';
  return createClient(url, secret, { auth: { persistSession: false } });
}
