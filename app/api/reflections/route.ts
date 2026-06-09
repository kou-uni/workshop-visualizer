import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/session';

// 個人振り返りの提出（サーバ→secretキーで保存＝RLSバイパス）
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const discordName = String(body.discordName ?? '').trim();
  if (!discordName) {
    return NextResponse.json({ error: 'discordName は必須です' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const sessionId = await ensureSession(sb, today);

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
