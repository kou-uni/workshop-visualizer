import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// 管理専用・読み取り専用：日付を明示指定して過去データを閲覧する（ensureSessionは使わない＝過去日にセッションを作らない）
function forbidden(key: string | null) {
  return process.env.OPS_KEY && key !== process.env.OPS_KEY;
}

async function countsForSessions(sb: ReturnType<typeof supabaseAdmin>, ids: string[]) {
  if (!ids.length) return { reflections: 0, insights: 0, teams: 0, recordings: 0, aggregations: 0 };
  const c = async (t: string) => { const { count } = await sb.from(t).select('id', { count: 'exact', head: true }).in('session_id', ids); return count ?? 0; };
  const { data: teams } = await sb.from('teams').select('id').in('session_id', ids);
  const tids = (teams ?? []).map((x: any) => x.id);
  let recordings = 0;
  if (tids.length) { const { count } = await sb.from('recordings').select('id', { count: 'exact', head: true }).in('team_id', tids); recordings = count ?? 0; }
  return { reflections: await c('reflections'), insights: await c('insights'), teams: (teams ?? []).length, recordings, aggregations: await c('aggregations') };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (forbidden(url.searchParams.get('opsKey'))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const date = url.searchParams.get('date');

  // 単日詳細：件数＋各スコープの最新集約（閲覧用）
  if (date) {
    const { data: ss } = await sb.from('sessions').select('id').eq('date', date);
    const ids = (ss ?? []).map((s: any) => s.id);
    const counts = await countsForSessions(sb, ids);
    const aggregations: Record<string, any> = { online: null, real: null, merged: null };
    if (ids.length) {
      for (const scope of ['online', 'real', 'merged']) {
        const { data } = await sb.from('aggregations').select('result_json,created_at').in('session_id', ids).eq('scope', scope).order('created_at', { ascending: false }).limit(1).maybeSingle();
        aggregations[scope] = data?.result_json ?? null;
      }
    }
    return NextResponse.json({ date, counts, aggregations });
  }

  // 範囲の概要：日付ごとの件数一覧
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  let q = sb.from('sessions').select('id,date');
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  const { data: ss } = await q;
  const byDate: Record<string, string[]> = {};
  for (const s of (ss ?? []) as any[]) (byDate[s.date] ||= []).push(s.id);
  const days: { date: string; counts: any }[] = [];
  for (const d of Object.keys(byDate).sort().reverse()) {
    days.push({ date: d, counts: await countsForSessions(sb, byDate[d]) });
  }
  return NextResponse.json({ days });
}
