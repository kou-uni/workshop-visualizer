import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// チーム詳細（ONSITE-2）
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const { data: team } = await sb.from('teams').select('id,name,members').eq('id', params.id).maybeSingle();
  if (!team) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { data: rec } = await sb.from('recordings').select('transcript,status,updated_at').eq('team_id', params.id).maybeSingle();
  return NextResponse.json({ team, recording: rec ?? null });
}
