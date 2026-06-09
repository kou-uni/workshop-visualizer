import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { aggregate } from '@/lib/aggregate';
import { ensureSession } from '@/lib/session';
import { todayJST } from '@/lib/date';
import type { Scope } from '@/lib/types';

export const maxDuration = 60; // OpenAI 集約のため長めに

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const kind = (body.scope ?? 'online') as Scope['kind'];

  const sb = supabaseAdmin();
  const sessionId = await ensureSession(sb, todayJST());

  const scope: Scope = kind === 'team' ? { kind: 'team', teamId: body.teamId } : { kind };

  try {
    const result = await aggregate(scope, sessionId);
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
