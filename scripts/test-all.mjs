// フルテスト（M0 + M1 オンライン縦）
// 使い方: node scripts/test-all.mjs   （要：dev起動中 localhost:3000・.env.local）
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const BASE = 'http://localhost:3000';
const REMOTE = 'https://workshop-visualizer.vercel.app';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const pub = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const TODAY = todayJST();

const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
async function T(id, name, fn) {
  try { await fn(); results.push([id, 'PASS', name]); console.log(`✅ ${id}  ${name}`); }
  catch (e) { results.push([id, 'FAIL', name, e.message]); console.log(`❌ ${id}  ${name}\n      → ${e.message}`); }
}
const post = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

console.log(`\n=== フルテスト（today=${TODAY}）===\n`);
// クリーンスタート（当日セッションを初期化）
await admin.from('sessions').delete().eq('date', TODAY);

await T('T1', 'Supabase接続：secretで write→read→delete', async () => {
  const s = await admin.from('sessions').insert({ date: '2000-01-01' }).select('id').single();
  assert(!s.error && s.data?.id, 'insert失敗');
  const r = await admin.from('sessions').select('id').eq('id', s.data.id).single();
  assert(r.data?.id === s.data.id, 'read不一致');
  await admin.from('sessions').delete().eq('id', s.data.id);
});

await T('T2', 'スキーマ：7テーブル存在', async () => {
  const need = ['sessions', 'participants', 'reflections', 'teams', 'recordings', 'insights', 'aggregations'];
  for (const t of need) { const { error } = await admin.from(t).select('id').limit(1); assert(!error, `${t} が無い: ${error?.message}`); }
});

await T('T3', 'ローカルdev：トップ 200', async () => { const r = await fetch(BASE); assert(r.status === 200, `HTTP ${r.status}`); });

await T('T4', 'リモート公開：トップ 200', async () => { const r = await fetch(REMOTE); assert(r.status === 200, `HTTP ${r.status}`); });

await T('T5', 'ページ群：4画面 200', async () => {
  for (const p of ['/remote/input', '/remote/result', '/remote/feedback', '/remote/admin']) {
    const r = await fetch(BASE + p); assert(r.status === 200, `${p} → ${r.status}`);
  }
});

await T('T6', 'POST /api/reflections：正常保存', async () => {
  const r = await post('/api/reflections', { discordName: 'test-r6', pr: 'X', stumble: 'Y' });
  const j = await r.json(); assert(r.ok && j.id, `失敗 ${JSON.stringify(j)}`);
  const { data } = await admin.from('reflections').select('id').eq('id', j.id); assert(data?.length === 1, 'DBに無い');
});

await T('T7', 'POST /api/reflections：空Discord名→400', async () => {
  const r = await post('/api/reflections', { discordName: '  ' }); assert(r.status === 400, `想定400 実際${r.status}`);
});

await T('T8', 'POST /api/insights：正常保存', async () => {
  const r = await post('/api/insights', { body: 'test-i8 メモ' });
  const j = await r.json(); assert(r.ok && j.id, `失敗 ${JSON.stringify(j)}`);
  const { data } = await admin.from('insights').select('id').eq('id', j.id); assert(data?.length === 1, 'DBに無い');
});

await T('T9', 'POST /api/insights：空メモ→400', async () => {
  const r = await post('/api/insights', { body: '' }); assert(r.status === 400, `想定400 実際${r.status}`);
});

await T('T10', 'ensureSession：当日セッションは1つだけ（冪等）', async () => {
  await post('/api/reflections', { discordName: 'test-r10a' });
  await post('/api/reflections', { discordName: 'test-r10b' });
  const { data } = await admin.from('sessions').select('id').eq('date', TODAY);
  assert(data?.length === 1, `当日セッション数=${data?.length}（重複）`);
});

await T('T11', 'POST /api/aggregate online：AggregationResult構造', async () => {
  await post('/api/reflections', { discordName: 'test-agg1', pr: '議事録要約', stumble: 'Whisperの話者分離が難しい', hack: 'プロンプトを.md資産化', trouble: 'Vercelデプロイの環境変数' });
  await post('/api/reflections', { discordName: 'test-agg2', pr: 'レシピbot', stumble: '要件が曖昧', hack: 'スクショ丸食わせ', trouble: '精度のばらつき' });
  await post('/api/insights', { body: 'CLAUDE.mdに結論を先に書くと効く' });
  const r = await post('/api/aggregate', { scope: 'online' });
  const j = await r.json(); assert(r.ok, `エラー ${JSON.stringify(j)}`);
  const x = j.result;
  for (const k of ['commonStumbles', 'hacks', 'currentTroubles', 'trendSummary', 'wordCloud', 'interpretations']) assert(k in x, `${k} 欠落`);
  assert(Array.isArray(x.wordCloud) && x.wordCloud.length > 0, 'wordCloud空');
  assert(x.interpretations.spark && x.interpretations.minta, 'spark/minta欠落');
  globalThis.__agg = x;
});

await T('T12', '集約が入力内容を反映（固有語 Whisper/Vercel）', async () => {
  const blob = JSON.stringify(globalThis.__agg || {}).toLowerCase();
  assert(blob.includes('whisper') || blob.includes('vercel'), '固有語が結果に出ていない（入力未反映の疑い）');
});

await T('T13', 'GET /api/aggregation：保存済み集約を返す', async () => {
  const r = await fetch(BASE + '/api/aggregation?scope=online'); const j = await r.json();
  assert(r.ok && j.result, '保存済み集約が取得できない');
  assert(Array.isArray(j.result.wordCloud), 'result形不正');
});

await T('T14', '未実装scope（real）→ 500', async () => {
  const r = await post('/api/aggregate', { scope: 'real' });
  assert(r.status === 500, `想定500 実際${r.status}`);
});

await T('T15', 'RLS：publishableは書込不可／secretは可', async () => {
  const bad = await pub.from('sessions').insert({ date: '2000-01-02' }).select('id');
  assert(bad.error, 'publishableで書けてしまった（RLS無効？）');
  const ok = await admin.from('sessions').insert({ date: '2000-01-02' }).select('id').single();
  assert(!ok.error, 'secretで書けない');
  await admin.from('sessions').delete().eq('id', ok.data.id);
});

await T('T16', 'JST日付：セッションのdateがJST当日', async () => {
  const { data } = await admin.from('sessions').select('date').eq('date', TODAY);
  assert(data?.length === 1 && data[0].date === TODAY, `JST当日(${TODAY})のセッションが無い`);
});

// 後片付け（当日のテストデータを一掃）
await admin.from('sessions').delete().eq('date', TODAY);
await admin.from('sessions').delete().in('date', ['2000-01-01', '2000-01-02']);

const pass = results.filter(r => r[1] === 'PASS').length;
const fail = results.filter(r => r[1] === 'FAIL').length;
console.log(`\n================ 結果：${pass} PASS / ${fail} FAIL（計${results.length}）================`);
if (fail) { console.log('\n失敗:'); results.filter(r => r[1] === 'FAIL').forEach(r => console.log(`  ${r[0]} ${r[2]} — ${r[3]}`)); process.exitCode = 1; }
