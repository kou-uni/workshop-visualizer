import type { SupabaseClient } from '@supabase/supabase-js';

// 当日セッションを一意に get-or-create（重複があっても最古を選ぶ＝全画面で同じIDに揃える）
export async function ensureSession(sb: SupabaseClient, date: string): Promise<string> {
  const { data } = await sb
    .from('sessions')
    .select('id')
    .eq('date', date)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data) return data.id as string;

  const ins = await sb.from('sessions').insert({ date }).select('id').single();
  if (ins.error) throw new Error(ins.error.message);
  return ins.data.id as string;
}
