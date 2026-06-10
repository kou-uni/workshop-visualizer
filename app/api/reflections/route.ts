import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/session';
import { todayJST } from '@/lib/date';

// 当日の個人振り返り一覧（発表用ビュー）
export async function GET() {
  const sb = supabaseAdmin();
  const { data: s } = await sb.from('sessions').select('id').eq('date', todayJST()).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (!s) return NextResponse.json({ reflections: [] });
  const { data } = await sb
    .from('reflections')
    .select('id,discord_name,pr,stumble,hack,trouble,committed_at')
    .eq('session_id', s.id)
    .order('committed_at', { ascending: true });
  return NextResponse.json({ reflections: data ?? [] });
}

// 個人振り返りの提出（サーバ→secretキーで保存＝RLSバイパス）
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const discordName = String(body.discordName ?? '').trim();
  if (!discordName) {
    return NextResponse.json({ error: 'discordName は必須です' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());

  const { data, error } = await sb
    .from('reflections')
    .insert({
      session_id: sessionId,
      discord_name: discordName,
      pr: body.pr ?? null,
      stumble: body.stumble ?? null,
      hack: body.hack ?? null,
      trouble: body.trouble ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
