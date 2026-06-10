import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/session';
import { todayJST } from '@/lib/date';

// 気づきメモの追加（設計方針：個人/卓に紐付けず、全体プールにマージ＝軽量）
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? '').trim();
  if (!text) return NextResponse.json({ error: 'メモが空です' }, { status: 400 });

  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());

  const { data, error } = await sb
    .from('insights')
    .insert({ session_id: sessionId, body: text })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// みんなの気づきメモを取得（全員で共有・ライブ表示用）
export async function GET() {
  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());
  const { data } = await sb
    .from('insights')
    .select('id,body,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(300);
  return NextResponse.json({ memos: data ?? [] });
}
