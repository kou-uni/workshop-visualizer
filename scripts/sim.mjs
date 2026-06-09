// 本番模擬：リアルなデータを投入→全スコープ集約→ユーザ目線で精査
// node scripts/sim.mjs       （データは残す。掃除は: node scripts/sim.mjs --clean）
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const B = 'http://localhost:3000';
const TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const J = (p, b) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const G = (p) => fetch(B + p).then(r => r.json());

if (process.argv.includes('--clean')) {
  await sb.from('sessions').delete().eq('date', TODAY);
  console.log('当日データを掃除しました'); process.exit(0);
}

// ---- 本番模擬データ ----
const REFLECTIONS = [
  { discordName: 'spark', pr: '学習記録アプリ', stumble: 'Vercelのデプロイで環境変数が読めず詰まった', hack: 'CLAUDE.mdに結論を先に書くと精度が上がる', trouble: '通知の出し方が分からない' },
  { discordName: 'misaki', pr: 'レシピ提案ボット', stumble: '要件が曖昧で手が止まる', hack: 'スクショを丸ごと食わせると早い', trouble: '毎回の精度がばらつく' },
  { discordName: 'kento', pr: '議事録要約ツール', stumble: '話者分離の精度が低い', hack: 'プロンプトを.mdで資産化', trouble: 'Whisper以外の手段を知りたい' },
  { discordName: 'yui', pr: 'NFTマーケットプレイス', stumble: 'ガス代の見積もりが難しい', hack: 'testnetで先に検証する', trouble: 'ウォレット接続のUXが悪い' },
  { discordName: 'takumi', pr: '社内FAQボット', stumble: 'RAGの検索精度が出ない', hack: 'チャンク分割を工夫した', trouble: '評価方法が決まらない' },
  { discordName: 'aya', pr: '家計簿アプリ', stumble: 'Supabaseのrowレベルセキュリティで詰まった', hack: '書き込みはサーバ経由に統一', trouble: '認証フローの設計' },
  { discordName: 'sho', pr: '動画要約サービス', stumble: '長尺音声の分割', hack: '30秒チャンクで逐次処理', trouble: 'コストが読めない' },
  { discordName: 'nana', pr: '多言語チャットボット', stumble: 'ハルシネーションが多い', hack: '根拠の引用を強制する', trouble: '多言語の品質担保' },
  { discordName: 'daiki', pr: 'DAO投票dApp', stumble: 'スマートコントラクトの理解', hack: '既存テンプレを流用', trouble: 'セキュリティ監査の進め方' },
  { discordName: 'rina', pr: '画像生成アプリ', stumble: 'プロンプト沼にはまる', hack: 'ネガティブプロンプトで制御', trouble: '著作権の扱い' },
];
const INSIGHTS = [
  '結論を先に書くと精度が上がる、は全員に効きそう',
  'testnetで先に試すのは鉄則だと再確認',
  '話者分離は割り切る判断も大事',
  'RLSは最初からサーバ経由にすると楽',
  'コストはSTT（文字起こし）が大半を占める',
];
const TEAMS = [
  { name: 'いちごの会', members: ['spark', 'aya', 'sho'], transcript: 'デプロイで環境変数が読めず詰まったが、VercelのSecret設定で解決した。通知設計が地味に難しいねという話に。サーバ経由の書き込みに統一すると安全という共有もあった。' },
  { name: 'みかん隊', members: ['takumi', 'nana'], transcript: 'RAGの検索精度が課題。チャンク分割の工夫で改善したが、評価方法が決まらない。ハルシネーション対策に根拠引用を強制するのが効くという話。既存テンプレの活用も。' },
  { name: 'ぶどう組', members: ['kento', 'sho'], transcript: '話者分離はWhisperでは難しいので割り切る方針。長尺は30秒チャンクで逐次処理。コストはSTTが大半なので、mini系で半額にできないか検討した。' },
  { name: 'もも班', members: ['yui', 'daiki'], transcript: 'NFTやDAOはガス代の見積もりが難しい。testnetで先に検証するのが鉄則。スマートコントラクトはセキュリティ監査が重要で、既存テンプレ流用で安全性を担保する話。' },
  { name: 'めろん会', members: ['rina', 'misaki'], transcript: '画像生成はプロンプト沼にはまりがち。ネガティブプロンプトで制御する。著作権の扱いが論点。要件が曖昧だと手が止まるので、スクショを丸ごと食わせて早く形にする工夫を共有。' },
];

const line = (s) => console.log(s);
function show(title, r) {
  line(`\n──────── ${title} ────────`);
  line('● つまずき: ' + (r.commonStumbles || []).map(x => `${x.title}(${x.count})`).join(' / '));
  line('● ハック:   ' + (r.hacks || []).map(x => x.title).join(' / '));
  line('● 困りごと: ' + (r.currentTroubles || []).map(x => `${x.title}(${x.count})`).join(' / '));
  line('● 傾向: ' + (r.trendSummary || ''));
  line('● 雲(' + (r.wordCloud || []).length + '): ' + (r.wordCloud || []).map(w => `${w.keyword}·${w.weight}`).join('  '));
  line('● spark: ' + (r.interpretations?.spark?.reads || []).map(x => x.read).join(' ／ '));
  line('   └ 問いかけ: ' + (r.interpretations?.spark?.question || ''));
  line('● minta: ' + (r.interpretations?.minta?.reads || []).map(x => x.read).join(' ／ '));
  line('   └ 問いかけ: ' + (r.interpretations?.minta?.question || ''));
}

// ---- 投入 ----
line(`\n=== 本番模擬 投入（today=${TODAY}）===`);
await sb.from('sessions').delete().eq('date', TODAY); // クリーンスタート
for (const r of REFLECTIONS) await J('/api/reflections', r);
for (const b of INSIGHTS) await J('/api/insights', { body: b });
const teamIds = [];
for (const t of TEAMS) { const j = await J('/api/teams', { name: t.name, members: t.members }); teamIds.push({ id: j.id, ...t }); await J(`/api/teams/${j.id}/transcript`, { transcript: t.transcript }); }
line(`投入完了: 振り返り${REFLECTIONS.length} / 気づき${INSIGHTS.length} / チーム${TEAMS.length}`);

// ---- 集約 ----
const online = (await J('/api/aggregate', { scope: 'online' })).result;
const team0 = (await J('/api/aggregate', { scope: 'team', teamId: teamIds[0].id })).result;
const team2 = (await J('/api/aggregate', { scope: 'team', teamId: teamIds[2].id })).result;
const real = (await J('/api/aggregate', { scope: 'real' })).result;
const merged = (await J('/api/aggregate', { scope: 'merged' })).result;

show('オンライン全体（REMOTE-2/4）', online);
show(`チーム「${teamIds[0].name}」（ONSITE-2）`, team0);
show(`チーム「${teamIds[2].name}」（ONSITE-2）`, team2);
show('リアル全体（ONSITE-3）', real);
show('統合 merged（最終結果）', merged);

// ---- ユーザ目線の品質チェック ----
line('\n================ 品質チェック ================');
const checks = [];
const QC = (name, cond, detail = '') => { checks.push([cond ? 'PASS' : 'FAIL', name, detail]); line(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`); };

const inputBlob = [...REFLECTIONS.flatMap(r => [r.pr, r.stumble, r.hack, r.trouble]), ...INSIGHTS, ...TEAMS.map(t => t.transcript)].join(' ').toLowerCase();
function relevance(r) {
  const kws = (r.wordCloud || []).map(w => w.keyword);
  const hit = kws.filter(k => inputBlob.includes(k.toLowerCase()));
  return { pct: Math.round(100 * hit.length / Math.max(1, kws.length)), hit: hit.length, total: kws.length, miss: kws.filter(k => !inputBlob.includes(k.toLowerCase())) };
}
const ro = relevance(online), rm = relevance(merged);

QC('オンライン集約：つまずき非空', (online.commonStumbles || []).length > 0);
QC('オンライン集約：件数が人数以下（捏造でない）', (online.commonStumbles || []).every(s => s.count <= REFLECTIONS.length), `max count=${Math.max(...(online.commonStumbles || [{ count: 0 }]).map(s => s.count))} / 人数${REFLECTIONS.length}`);
QC('オンライン雲：10語以上', (online.wordCloud || []).length >= 10, `${(online.wordCloud || []).length}語`);
QC('オンライン雲：入力との関連性が高い', ro.pct >= 55, `${ro.pct}%が入力語（${ro.hit}/${ro.total}）` + (ro.miss.length ? ` 抽象語例: ${ro.miss.slice(0, 4).join(',')}` : ''));
QC('解釈：spark/minta とも複数点＋根拠＋問いかけ', (online.interpretations?.spark?.reads || []).length >= 2 && (online.interpretations?.minta?.reads || []).length >= 2 && (online.interpretations.spark.reads[0].evidence || []).length > 0 && !!online.interpretations.spark.question && !!online.interpretations.minta.question);
QC('チーム集約：その卓の議論を反映', JSON.stringify(team2).includes('話者') || JSON.stringify(team2).includes('チャンク') || JSON.stringify(team2).toLowerCase().includes('stt') || JSON.stringify(team2).includes('コスト'));
QC('統合：オンライン語(環境変数/通知)とリアル語(testnet/ガス/監査)の両方を含む', /環境変数|通知|デプロイ|rls|セキュリティ/i.test(JSON.stringify(merged)) && /testnet|ガス|監査|nft|dao/i.test(JSON.stringify(merged)));
QC('統合雲：関連性が高い', rm.pct >= 55, `${rm.pct}%（${rm.hit}/${rm.total}）`);
QC('保存＆取得：GET online/real/merged が結果を返す', !!(await G('/api/aggregation?scope=online')).result && !!(await G('/api/aggregation?scope=real')).result && !!(await G('/api/aggregation?scope=merged')).result);
const { data: sess } = await sb.from('sessions').select('id').eq('date', TODAY);
QC('当日セッションは1つ（重複なし）', sess?.length === 1, `${sess?.length}個`);

const pass = checks.filter(c => c[0] === 'PASS').length, fail = checks.filter(c => c[0] === 'FAIL').length;
line(`\n================ ${pass} PASS / ${fail} FAIL ================`);
line('※データは残しています。ブラウザで REMOTE-2/4・ONSITE-3・/final を確認できます。');
line('※掃除: node scripts/sim.mjs --clean');
if (fail) process.exitCode = 1;
