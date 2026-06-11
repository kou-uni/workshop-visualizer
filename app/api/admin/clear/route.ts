import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { todayJST } from '@/lib/date';

// 破壊的操作：運営キー必須（OPS_KEY設定時のみ実行可）。受講生・無関係者は弾く。
const NONE = '00000000-0000-0000-0000-000000000000';

function forbidden(key: string | null) {
  return process.env.OPS_KEY && key !== process.env.OPS_KEY;
}

// 当日(JST)の全セッションID（重複セッションがあっても取りこぼさない）
async function todaySessionIds(sb: ReturnType<typeof supabaseAdmin>): Promise<string[]> {
  const { data } = await sb.from('sessions').select('id').eq('date', todayJST());
  return (data ?? []).map((x: any) => x.id);
}

async function getCounts(sb: ReturnType<typeof supabaseAdmin>, ids: string[] | null) {
  const c = async (t: string) => {
    let q = sb.from(t).select('id', { count: 'exact', head: true });
    if (ids) q = q.in('session_id', ids);
    const { count } = await q;
    return count ?? 0;
  };
  let recordings = 0;
  if (ids) {
    if (ids.length) {
      const { data: teams } = await sb.from('teams').select('id').in('session_id', ids);
      const tids = (teams ?? []).map((x: any) => x.id);
      if (tids.length) { const { count } = await sb.from('recordings').select('id', { count: 'exact', head: true }).in('team_id', tids); recordings = count ?? 0; }
    }
  } else {
    const { count } = await sb.from('recordings').select('id', { count: 'exact', head: true }); recordings = count ?? 0;
  }
  return {
    reflections: ids && !ids.length ? 0 : await c('reflections'),
    insights: ids && !ids.length ? 0 : await c('insights'),
    teams: ids && !ids.length ? 0 : await c('teams'),
    recordings,
    aggregations: ids && !ids.length ? 0 : await c('aggregations'),
  };
}

// 現在のデータ件数（管理画面の表示用）
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (forbidden(url.searchParams.get('opsKey'))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const target = url.searchParams.get('target') === 'all' ? 'all' : 'today';
  const sb = supabaseAdmin();
  const ids = target === 'today' ? await todaySessionIds(sb) : null;
  return NextResponse.json({ target, sessionFound: target === 'all' || (ids?.length ?? 0) > 0, counts: await getCounts(sb, ids) });
}

// クリア実行
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  if (forbidden(body.opsKey)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const scope = ['remote', 'real', 'all'].includes(body.scope) ? body.scope : null;
  const target = body.target === 'all' ? 'all' : 'today';
  if (!scope) return NextResponse.json({ error: 'scope不正' }, { status: 400 });

  const sb = supabaseAdmin();
  const ids = target === 'today' ? await todaySessionIds(sb) : null; // null = 全期間
  if (ids && ids.length === 0) return NextResponse.json({ ok: true, deleted: {}, note: '当日セッションが無いため対象なし' });

  const deleted: Record<string, number> = {};
  const del = async (q: any) => { const { data, error } = await q.select('id'); if (error) throw new Error(error.message); return data?.length ?? 0; };
  // session でスコープ（当日=該当全セッション）or 全件（neqで全マッチ）
  const scoped = (qb: any) => (ids ? qb.in('session_id', ids) : qb.neq('id', NONE));

  try {
    if (scope === 'real' || scope === 'all') {
      const tq = sb.from('teams').select('id');
      const { data: teams } = await (ids ? tq.in('session_id', ids) : tq);
      const tids = (teams ?? []).map((x: any) => x.id);
      deleted.recordings = tids.length ? await del(sb.from('recordings').delete().in('team_id', tids)) : 0;
      deleted.teams = await del(scoped(sb.from('teams').delete()));
    }
    if (scope === 'remote' || scope === 'all') {
      deleted.reflections = await del(scoped(sb.from('reflections').delete()));
      deleted.insights = await del(scoped(sb.from('insights').delete()));
    }
    const aggScopes = scope === 'all' ? ['online', 'team', 'real', 'merged'] : scope === 'remote' ? ['online', 'merged'] : ['team', 'real', 'merged'];
    deleted.aggregations = await del(scoped(sb.from('aggregations').delete()).in('scope', aggScopes));

    return NextResponse.json({ ok: true, scope, target, deleted });
  } catch (e: any) {
    return NextResponse.json({ error: typeof e?.message === 'string' ? e.message : 'クリアに失敗しました' }, { status: 500 });
  }
}
