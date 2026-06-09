import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/session';
import { todayJST } from '@/lib/date';

// チーム作成（ONSITE-1）
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'チーム名は必須です' }, { status: 400 });
  const members = Array.isArray(body?.members)
    ? body.members.map((m: unknown) => String(m).trim()).filter(Boolean)
    : [];

  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());

  const { data: team, error } = await sb
    .from('teams')
    .insert({ session_id: sessionId, name, members })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 空の録音レコードを1つ用意（transcript の置き場）
  await sb.from('recordings').insert({ team_id: team.id });

  return NextResponse.json({ id: team.id });
}

// チーム一覧（ONSITE-3 のタイル用）
export async function GET() {
  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());
  const { data } = await sb
    .from('teams')
    .select('id,name,members,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  return NextResponse.json({ teams: data ?? [] });
}
