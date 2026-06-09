import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 30;

const PERSONA: Record<string, string> = {
  spark: 'あなたは spark。若手の技術リードで、技術/アーキテクチャ視点が得意。フレンドリーでタメ口まじり、短く具体的に背中を押す。',
  minta: 'あなたは minta。AIとweb3が好きな若手女性のバイブコーダー。要件/価値/UX視点が得意。明るくタメ口まじり、短く具体的に。',
};

// spark/minta が、聴衆の回答にひとこと返す（1往復の会話）
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const who = body?.who === 'minta' ? 'minta' : 'spark';
  const question = String(body?.question ?? '');
  const answer = String(body?.answer ?? '').trim();
  const context = String(body?.context ?? '');
  if (!answer) return NextResponse.json({ error: '回答が空です' }, { status: 400 });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `${PERSONA[who]} 相手の回答に1〜2文で、共感＋具体的な次の一歩を添えてあたたかく返す。絵文字は控えめに。` },
      { role: 'user', content: `あなたの問いかけ:「${question}」\n相手の回答:「${answer}」\n参考（全体傾向）:「${context.slice(0, 280)}」\nこの回答にひとこと返して。` },
    ],
  });
  return NextResponse.json({ reply: completion.choices[0].message.content ?? '' });
}
