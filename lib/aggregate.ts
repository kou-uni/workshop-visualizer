import OpenAI from 'openai';
import { supabaseAdmin } from './supabaseClient';
import type { Scope, AggregationResult } from './types';

const SYSTEM_PROMPT = `あなたは web3・AI概論ワークショップの集約担当です。受講生の振り返りを読み、指定のJSONを日本語で返してください。
- commonStumbles: 共通のつまずき 最大3件（title / count=該当人数の目安 / evidence=実際の発言の引用1〜2件）
- hacks: 共有価値のあるハック・工夫（title / evidence）
- currentTroubles: いま困っていること 最大3件（title / count / evidence）
- trendSummary: 全体傾向を3〜4文で
- wordCloud: 重要キーワードを**必ず16〜22語**（情報が少なくても、関連語・周辺概念を補って必ず16語以上にする）。keyword / weight=1〜5（大きいほど頻出・重要・偏らせる）
- interpretations.spark.reads: 技術/アーキ視点の読みを **2〜3点**（各1〜2文 / evidence＝実引用 必須）
- interpretations.spark.question: spark からの**短い問いかけ**を1つ（「〜?」/「〜！」で終わる・議論を促す）
- interpretations.minta.reads: 要件/価値/UX視点の読みを **2〜3点**（各1〜2文 / evidence＝実引用 必須）
- interpretations.minta.question: minta からの**短い問いかけ**を1つ

【spark / minta の人格＝口調を必ず守る（最重要）】
- spark：若手の技術リード。明るくフレンドリーな**タメ口**。技術/アーキ視点で背中を押す。語尾は「〜だね！」「〜しちゃえば一瞬だよ」「〜そう！」。
  例:「みんなもう"動くもの"まで来てるね！詰まりは環境変数まわりに集まってる感じ。そこをテンプレ化しちゃえば全員いっきにラクになりそう！」
- minta：AIとweb3が好きな若手女性のバイブコーダー。あたたかい**タメ口**。要件/価値/UX視点で寄り添う。語尾は「〜だなぁ」「〜だよ」「〜面白い！」。
  例:「それぞれ全然ちがうの作ってて面白い！"誰のため"が言える人ほど前に進んでる印象だなぁ。5分だけ壁打ちしたら一気に固まりそうだよ。」

- discussionSummary: **議論全体の概要を300字程度**で。どんな議論だったか・主に何が話し合われたかを、**明るく元気な文章**で（「〜だったよ！」「〜が盛り上がったね！」のように、わくわくする感じ。堅い説明調・"〜された"の受け身連発は禁止）。

重要：reads と question は**必ず上の口調**で書く（堅い分析文・敬語・"〜である""〜が求められる"調は禁止）。evidence は入力からの実引用のみ（捏造禁止）。`;

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
    discussionSummary: { type: 'string' },
  },
  required: ['commonStumbles', 'hacks', 'currentTroubles', 'trendSummary', 'wordCloud', 'interpretations', 'discussionSummary'],
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

  const userContent = inputs.join('\n').slice(0, 60000); // 入力上限（コンテキスト溢れ防止の安全網）
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 5, timeout: 50000 });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
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
  for (const r of recs ?? []) if (r.transcript?.trim()) out.push(`議論の記録:${r.transcript.slice(0, 40000)}`);
  return out;
}

// real（全体）＝スケール対策の reduce 層：各チームの「事前抽出済み team集約（要約＋キーワード＋つまずき/ハック）」を集める。
// 生transcriptを丸ごと渡さないので、20チーム×50分でも入力を小さく保てる（map-reduce）。
async function realInputs(sb: ReturnType<typeof supabaseAdmin>, sessionId: string): Promise<string[]> {
  const out: string[] = [];
  const { data: teams } = await sb.from('teams').select('id,name').eq('session_id', sessionId);
  for (const t of teams ?? []) {
    const { data: agg } = await sb.from('aggregations')
      .select('result_json').eq('session_id', sessionId).eq('scope', 'team').eq('team_id', t.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const r = agg?.result_json as AggregationResult | undefined;
    if (r) {
      const kws = (r.wordCloud ?? []).slice(0, 12).map((w) => w.keyword).join('、');
      const st = (r.commonStumbles ?? []).map((s) => s.title).join('、');
      const hk = (r.hacks ?? []).map((h) => h.title).join('、');
      out.push(`【${t.name}】要約:${r.discussionSummary ?? ''} / つまずき:${st} / ハック:${hk} / キーワード:${kws}`);
    } else {
      // team集約がまだのチームのみ、生transcriptを短縮して使う（フォールバック）
      const { data: recs } = await sb.from('recordings').select('transcript').eq('team_id', t.id);
      const txt = (recs ?? []).map((x) => x.transcript).filter((x) => x && x.trim()).join(' ').slice(0, 1500);
      if (txt.trim()) out.push(`【${t.name}】${txt}`);
    }
  }
  return out;
}
