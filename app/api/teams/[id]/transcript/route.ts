import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// transcript の保存（テキスト手入力でも STT でも共通の入口）
// mode: 'set'（置換・既定）/ 'append'（追記＝STTチャンク用）
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const text = String(body?.transcript ?? '').trim();
  const mode = body?.mode === 'append' ? 'append' : 'set';
  if (!text) return NextResponse.json({ error: 'transcript が空です' }, { status: 400 });

  const sb = supabaseAdmin();

  // チームの録音レコードを find-or-create
  let { data: rec } = await sb.from('recordings').select('id,transcript').eq('team_id', params.id).maybeSingle();
  if (!rec) {
    const ins = await sb.from('recordings').insert({ team_id: params.id }).select('id,transcript').single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    rec = ins.data;
  }

  const next = mode === 'append' && rec.transcript ? `${rec.transcript} ${text}`.trim() : text;
  const { error } = await sb
    .from('recordings')
    .update({ transcript: next, status: 'transcribing', updated_at: new Date().toISOString() })
    .eq('id', rec.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, length: next.length });
}
