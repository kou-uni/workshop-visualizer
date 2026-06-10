import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { aggregate } from '@/lib/aggregate';
import { ensureSession } from '@/lib/session';
import { todayJST } from '@/lib/date';
import type { Scope } from '@/lib/types';

export const maxDuration = 60; // OpenAI 集約のため長めに

// 運営だけが起動できる重い集約（受講生の無駄押し＝無駄なOpenAI呼び出しを防ぐ）
const OPS_SCOPES = new Set(['online', 'real', 'merged']);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const kind = (body.scope ?? 'online') as Scope['kind'];

  // 運営scopeはキー必須（OPS_KEY設定時のみ強制。teamは受講生が正当に使うので開放）
  if (OPS_SCOPES.has(kind) && process.env.OPS_KEY && body.opsKey !== process.env.OPS_KEY) {
    return NextResponse.json({ error: 'この集約は運営のみ実行できます' }, { status: 403 });
  }

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
