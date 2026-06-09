import OpenAI from 'openai';
import { supabaseAdmin } from './supabaseClient';
import type { Scope, AggregationResult } from './types';

const SYSTEM_PROMPT = `あなたは web3・AI概論ワークショップの集約担当です。受講生の振り返りを読み、指定のJSONを日本語で返してください。
- commonStumbles: 共通のつまずき 最大3件（title / count=該当人数の目安 / evidence=実際の発言の引用1〜2件）
- hacks: 共有価値のあるハック・工夫（title / evidence）
- currentTroubles: いま困っていること 最大3件（title / count / evidence）
- trendSummary: 全体傾向を3〜4文で
- wordCloud: 重要キーワード 10〜18語（keyword / weight=1〜5。大きいほど頻出・重要）
- interpretations.spark.reads: 技術/アーキテクチャ視点の読みを **2〜3点**（各 read は1〜2文で具体的に / evidence＝実引用 必須）
- interpretations.spark.question: spark から聴衆への**短い問いかけ**を1つ（「〜?」で終わる・議論を促す・フレンドリー）
- interpretations.minta.reads: 要件/価値/UX視点の読みを **2〜3点**（各 read は1〜2文で具体的に / evidence＝実引用 必須）
- interpretations.minta.question: minta から聴衆への**短い問いかけ**を1つ（「〜?」で終わる・議論を促す・フレンドリー）
重要：evidence は必ず入力からの実際の引用にすること（捏造しない）。読みは具体的に踏み込み、当たり障りのない一般論にしない。問いかけは親しみやすい口調で。`;

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
        spark: { type: 'object', additionalProperties: false, properties: { reads: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { read: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['read', 'evidence'] } }, question: { type: 'string' } }, required: ['reads', 'question'] },
        minta: { type: 'object', additionalProperties: false, properties: { reads: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { read: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['read', 'evidence'] } }, question: { type: 'string' } }, required: ['reads', 'question'] },
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
  let inputs: string[] = [];

  if (scope.kind === 'online') {
    inputs = await onlineInputs(sb, sessionId);
  } else if (scope.kind === 'team') {
    inputs = await teamInputs(sb, scope.teamId);
  } else if (scope.kind === 'real') {
    inputs = await realInputs(sb, sessionId);
  } else if (scope.kind === 'merged') {
    inputs = [...(await onlineInputs(sb, sessionId)), ...(await realInputs(sb, sessionId))];
  } else {
    throw new Error(`scope '${(scope as any).kind}' は未実装`);
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

// ---- scope別の入力収集 ----
async function onlineInputs(sb: ReturnType<typeof supabaseAdmin>, sessionId: string): Promise<string[]> {
  const out: string[] = [];
  const { data: refs } = await sb.from('reflections').select('discord_name,pr,stumble,hack,trouble').eq('session_id', sessionId);
  const { data: ins } = await sb.from('insights').select('body').eq('session_id', sessionId);
  for (const r of refs ?? []) out.push(`【${r.discord_name}】PR:${r.pr ?? ''} / つまずき:${r.stumble ?? ''} / ハック:${r.hack ?? ''} / 困りごと:${r.trouble ?? ''}`);
  for (const i of ins ?? []) out.push(`気づき:${i.body}`);
  return out;
}

async function teamInputs(sb: ReturnType<typeof supabaseAdmin>, teamId: string): Promise<string[]> {
  const out: string[] = [];
  const { data: team } = await sb.from('teams').select('name,members').eq('id', teamId).maybeSingle();
  if (team) out.push(`【チーム:${team.name}】メンバー:${(team.members ?? []).join('、')}`);
  const { data: recs } = await sb.from('recordings').select('transcript').eq('team_id', teamId);
  for (const r of recs ?? []) if (r.transcript?.trim()) out.push(`議論の記録:${r.transcript}`);
  return out;
}

async function realInputs(sb: ReturnType<typeof supabaseAdmin>, sessionId: string): Promise<string[]> {
  const out: string[] = [];
  const { data: teams } = await sb.from('teams').select('id,name').eq('session_id', sessionId);
  for (const t of teams ?? []) {
    const { data: recs } = await sb.from('recordings').select('transcript').eq('team_id', t.id);
    const txt = (recs ?? []).map((r) => r.transcript).filter((x) => x && x.trim()).join(' ');
    if (txt.trim()) out.push(`【${t.name}】${txt}`);
  }
  return out;
}
