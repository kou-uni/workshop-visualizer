import OpenAI from 'openai';
import { supabaseAdmin } from './supabaseClient';
import type { Scope, AggregationResult } from './types';

const SYSTEM_PROMPT = `あなたは web3・AI概論ワークショップの集約担当です。受講生の振り返りを読み、指定のJSONを日本語で返してください。
- commonStumbles: 共通のつまずき 最大3件（title / count=該当人数の目安 / evidence=実際の発言の引用1〜2件）
- hacks: 共有価値のあるハック・工夫（title / evidence）
- currentTroubles: いま困っていること 最大3件（title / count / evidence）
- trendSummary: 全体傾向を3〜4文で
- wordCloud: 重要キーワード 10〜18語（keyword / weight=1〜5。大きいほど頻出・重要）
- interpretations.spark: 技術/アーキテクチャ視点の読み（read / evidence）
- interpretations.minta: 要件/価値/UX視点の読み（read / evidence）
重要：evidence は必ず入力からの実際の引用にすること（捏造しない）。フレンドリーで端的に。`;

const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    commonStumbles: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, count: { type: 'integer' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['title', 'count', 'evidence'] } },
    hacks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['title', 'evidence'] } },
    currentTroubles: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, count: { type: 'integer' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['title', 'count', 'evidence'] } },
    trendSummary: { type: 'string' },
    wordCloud: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { keyword: { type: 'string' }, weight: { type: 'integer' } }, required: ['keyword', 'weight'] } },
    interpretations: {
      type: 'object', additionalProperties: false,
      properties: {
        spark: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { read: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['read', 'evidence'] } },
        minta: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { read: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['read', 'evidence'] } },
      },
      required: ['spark', 'minta'],
    },
  },
  required: ['commonStumbles', 'hacks', 'currentTroubles', 'trendSummary', 'wordCloud', 'interpretations'],
} as const;

// scope に応じて入力を集め、OpenAIで集約し、aggregations に保存
export async function aggregate(scope: Scope, sessionId: string): Promise<AggregationResult> {
  const sb = supabaseAdmin();
  const scopeKind = scope.kind;
  const teamId = scope.kind === 'team' ? scope.teamId : null;
  const inputs: string[] = [];

  if (scope.kind === 'online') {
    const { data: refs } = await sb.from('reflections')
      .select('discord_name,pr,stumble,hack,trouble').eq('session_id', sessionId);
    const { data: ins } = await sb.from('insights').select('body').eq('session_id', sessionId);
    for (const r of refs ?? []) {
      inputs.push(`【${r.discord_name}】PR:${r.pr ?? ''} / つまずき:${r.stumble ?? ''} / ハック:${r.hack ?? ''} / 困りごと:${r.trouble ?? ''}`);
    }
    for (const i of ins ?? []) inputs.push(`気づき:${i.body}`);
  } else {
    throw new Error(`scope '${scope.kind}' は未実装（M2/M3で対応）`);
  }

  if (inputs.length === 0) inputs.push('（まだ入力がありません）');

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: inputs.join('\n') },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'aggregation', strict: true, schema: SCHEMA as any } },
  });

  const result = JSON.parse(completion.choices[0].message.content ?? '{}') as AggregationResult;

  await sb.from('aggregations').insert({
    session_id: sessionId,
    scope: scopeKind,
    team_id: teamId,
    result_json: result,
  });

  return result;
}
