import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/session';
import { todayJST } from '@/lib/date';

// 保存済みの最新集約を取得（手動リフレッシュ用・再計算しない）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') ?? 'online';
  const teamId = searchParams.get('teamId');

  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());

  let q = sb
    .from('aggregations')
    .select('result_json,created_at')
    .eq('session_id', sessionId)
    .eq('scope', scope)
    .order('created_at', { ascending: false })
    .limit(1);
  if (scope === 'team' && teamId) q = q.eq('team_id', teamId);

  const { data } = await q.maybeSingle();
  return NextResponse.json({ result: data?.result_json ?? null, updatedAt: data?.created_at ?? null });
}
