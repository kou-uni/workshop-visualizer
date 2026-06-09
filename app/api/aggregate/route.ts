import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { aggregate } from '@/lib/aggregate';
import type { Scope } from '@/lib/types';

export const maxDuration = 60; // OpenAI 集約のため長めに

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const kind = (body.scope ?? 'online') as Scope['kind'];

  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data: session } = await sb
    .from('sessions')
    .select('id')
    .eq('date', today)
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: 'まだ当日セッションがありません（先に提出してください）' }, { status: 400 });
  }

  const scope: Scope = kind === 'team' ? { kind: 'team', teamId: body.teamId } : { kind };

  try {
    const result = await aggregate(scope, session.id);
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
