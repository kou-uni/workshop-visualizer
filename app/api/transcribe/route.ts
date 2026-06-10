import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // STT のため長めに

// 音声 → テキスト（gpt-4o-transcribe、失敗時 whisper-1 にフォールバック）
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('audio');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'audio がありません' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 5, timeout: 50000 });

  async function run(model: string) {
    const tr = await client.audio.transcriptions.create({ file: file as File, model, language: 'ja' });
    return (tr as any).text ?? '';
  }

  try {
    let text = '';
    try {
      text = await run('gpt-4o-transcribe');
    } catch {
      text = await run('whisper-1'); // フォールバック
    }
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: '文字起こしに失敗しました: ' + e.message }, { status: 502 });
  }
}
