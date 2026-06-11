import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { todayJST } from '@/lib/date';

// 破壊的操作：運営キー必須（OPS_KEY設定時のみ実行可）。受講生・無関係者は弾く。
const NONE = '00000000-0000-0000-0000-000000000000';

function forbidden(key: string | null) {
  return process.env.OPS_KEY && key !== process.env.OPS_KEY;
}

async function todaySessionId(sb: ReturnType<typeof supabaseAdmin>) {
  const { data } = await sb.from('sessions').select('id').eq('date', todayJST()).order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data?.id ?? null;
}

async function getCounts(sb: ReturnType<typeof supabaseAdmin>, sid: string | null) {
  const c = async (t: string) => {
    let q = sb.from(t).select('id', { count: 'exact', head: true });
    if (sid) q = q.eq('session_id', sid);
    const { count } = await q;
    return count ?? 0;
  };
  let recordings = 0;
  if (sid) {
    const { data: teams } = await sb.from('teams').select('id').eq('session_id', sid);
    const ids = (teams ?? []).map((x: any) => x.id);
    if (ids.length) { const { count } = await sb.from('recordings').select('id', { count: 'exact', head: true }).in('team_id', ids); recordings = count ?? 0; }
  } else {
    const { count } = await sb.from('recordings').select('id', { count: 'exact', head: true }); recordings = count ?? 0;
  }
  return {
    reflections: await c('reflections'),
    insights: await c('insights'),
    teams: await c('teams'),
    recordings,
    aggregations: await c('aggregations'),
  };
}

// 現在のデータ件数（管理画面の表示用）
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (forbidden(url.searchParams.get('opsKey'))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const target = url.searchParams.get('target') === 'all' ? 'all' : 'today';
  const sb = supabaseAdmin();
  const sid = target === 'today' ? await todaySessionId(sb) : null;
  return NextResponse.json({ target, sessionFound: target === 'all' || !!sid, counts: await getCounts(sb, sid) });
}

// クリア実行
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  if (forbidden(body.opsKey)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const scope = ['remote', 'real', 'all'].includes(body.scope) ? body.scope : null;
  const target = body.target === 'all' ? 'all' : 'today';
  if (!scope) return NextResponse.json({ error: 'scope不正' }, { status: 400 });

  const sb = supabaseAdmin();
  const sid = target === 'today' ? await todaySessionId(sb) : null;
  if (target === 'today' && !sid) return NextResponse.json({ deleted: {}, note: '当日セッションが無いため対象なし' });

  const deleted: Record<string, number> = {};
  const del = async (q: any) => { const { data, error } = await q.select('id'); if (error) throw new Error(error.message); return data?.length ?? 0; };
  // session でスコープ（当日）or 全件（neqで全マッチ）
  const scoped = (qb: any) => (sid ? qb.eq('session_id', sid) : qb.neq('id', NONE));

  try {
    if (scope === 'real' || scope === 'all') {
      // recordings は teams の子→先に消す
      const tq = sb.from('teams').select('id');
      const { data: teams } = await (sid ? tq.eq('session_id', sid) : tq);
      const ids = (teams ?? []).map((x: any) => x.id);
      deleted.recordings = ids.length ? await del(sb.from('recordings').delete().in('team_id', ids)) : 0;
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
