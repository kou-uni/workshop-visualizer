// 検証ハーネス：仕込みテーマ入りの模擬データ（リアル20卓＋オンライン20名）を生成・投入・集約・評価
//   node scripts/verify.mjs            … 生成→投入→集約→評価（フル）
//   node scripts/verify.mjs --seed     … 生成→投入のみ
//   node scripts/verify.mjs --eval     … 既存データで集約→評価のみ
//   node scripts/verify.mjs --clean    … 当日データ掃除
// 生成データと仮説は scripts/fixtures/verify-v1.json に保存（再利用可＝パッキング）
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const OPS = env.OPS_KEY || 'uni';
const B = 'http://localhost:3000';
const TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const POST = (p, b) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const FIX = 'scripts/fixtures/verify-v1.json';

// ============ データ生成（仕込みテーマ＝頻度を制御） ============
const NAMES = ['spark','misaki','kento','yui','takumi','aya','sho','nana','daiki','rina','ren','mio','yuto','saki','hina','kaito','noa','rui','mei','sora'];
const PRODUCTS = ['学習記録アプリ','レシピ提案ボット','議事録要約ツール','家計簿アプリ','社内FAQボット','動画要約サービス','多言語チャットボット','画像生成アプリ','旅程プランナー','読書管理アプリ','筋トレ記録アプリ','ポッドキャスト要約','名刺管理アプリ','日報ジェネレータ','英会話練習Bot','献立提案アプリ','タスク分解AI','SNS投稿下書きBot','問い合わせ自動返信','コードレビューBot'];

// stumble: 合計20（仕込み頻度）
const STUMBLES = [
  { n: 8, key: '環境変数', texts: ['Vercelのデプロイで環境変数が読めず詰まった','デプロイ時にSecret(環境変数)の設定が抜けて本番で落ちた','本番だけ環境変数が反映されずデプロイで詰まった','環境変数の設定ミスでビルドが通らなかった'] },
  { n: 5, key: '要件', texts: ['作りたいものの要件が曖昧で手が止まった','誰のためのアプリか固まらず要件で迷った','要件定義が甘くて作り直しになった'] },
  { n: 4, key: '文字起こし', texts: ['音声の文字起こしの精度が低くて困った','長尺音声の文字起こしで詰まった','文字起こしの誤変換が多かった'] },
  { n: 3, key: 'RLS', texts: ['SupabaseのRLS(行レベル権限)で書き込めず詰まった','RLSの設定で認証まわりにハマった'] },
];
// hack: 合計20
const HACKS = [
  { n: 6, key: 'スクショ', texts: ['スクショを丸ごとAIに食わせると早い','エラー画面のスクショをそのまま渡すと解決が速い','画面のスクショを貼るだけで文脈が伝わる'] },
  { n: 5, key: 'CLAUDE.md', texts: ['CLAUDE.mdに結論を先に書くと精度が上がる','CLAUDE.mdにルールを書いて毎回読ませる','md冒頭に結論ファーストと書くと安定する'] },
  { n: 5, key: 'テンプレ化', texts: ['よく使うプロンプトを.mdでテンプレ化・資産化した','プロンプトをテンプレ化して使い回す','定型指示をテンプレにして時短'] },
  { n: 4, key: '小さく刻む', texts: ['タスクを小さく刻んで指示すると精度が出る','大きな依頼は分割して投げる','一度に1つずつ依頼する'] },
];
// trouble: 合計20
const TROUBLES = [
  { n: 6, key: '精度', texts: ['毎回の出力精度がばらつくのが不安','同じ指示でも品質が安定しない','精度の再現性をどう担保するか'] },
  { n: 5, key: 'コスト', texts: ['APIや文字起こしのコストが読めない','コストの見積もりが立てづらい','利用が増えたときのコストが心配'] },
  { n: 5, key: '通知', texts: ['通知設計が決まらない','どこまで通知を出すべきか悩む','通知の出し方の設計指針が欲しい'] },
  { n: 4, key: '話者分離', texts: ['音声の話者分離をやりたいが手段が分からない','誰の発言か分ける方法を知りたい'] },
];

function expand(pool) { // 頻度に従ってテキスト配列(20件)を生成（決定的）
  const out = [];
  for (const g of pool) for (let i = 0; i < g.n; i++) out.push({ key: g.key, text: g.texts[i % g.texts.length] });
  return out;
}
function buildOnline() {
  const st = expand(STUMBLES), hk = expand(HACKS), tr = expand(TROUBLES);
  // 各配列をずらして混ぜる（人ごとにテーマの組合せが変わる＝現実的）
  const online = [];
  for (let i = 0; i < 20; i++) {
    online.push({
      discordName: NAMES[i], pr: PRODUCTS[i],
      stumble: st[i].text, hack: hk[(i + 7) % 20].text, trouble: tr[(i + 13) % 20].text,
    });
  }
  return online;
}

// teams: 各卓に仕込みスニペットを既知の頻度で配合
const SNIP = {
  env: 'デプロイで環境変数が読めず本番で落ちた。VercelのSecret設定を見直して解決した。',
  req: '最初は要件が曖昧で手が止まったが、誰のためかを言語化したら一気に進んだ。',
  scr: 'スクショを丸ごとAIに食わせると早いという話で盛り上がった。プロンプトはmdでテンプレ化している。',
  rag: 'RAGの検索精度が出ず、チャンク分割を工夫した。評価方法はまだ決まっていない。',
  stt: '音声の文字起こしと話者分離が課題。長尺は30秒で刻んで逐次処理した。',
  chain: 'NFTやDAOはガス代の見積もりが難しく、testnetで先に検証した。コントラクトはテンプレ流用で監査負荷を下げた。',
  img: '画像生成はプロンプト沼にはまる。ネガティブプロンプトで制御し、著作権の扱いが論点になった。',
  cost: 'APIと文字起こしのコストが読めないのが不安で、mini系で半額にできないか検討した。',
  notif: '通知設計が地味に難しく、出しすぎず要点だけ通知する方針にした。',
};
const TEAM_NAMES = ['いちごの会','みかん隊','ぶどう組','もも班','めろん会','りんご団','なし組','かき隊','すもも会','びわ班','ゆず組','れもん隊','いちじく会','ざくろ団','まんごー組','ぱぱいや隊','きうい会','あんず班','ぐれーぷ組','ちぇりー隊'];
function teamThemes(i) {
  const t = [];
  if (i < 12) t.push('env');         // 12卓
  if (i >= 4 && i < 14) t.push('req'); // 10卓
  if (i % 2 === 0 && i < 16) t.push('scr'); // 8卓
  if (i >= 16 && i < 20) t.push('rag');
  if ([14, 15, 16, 17].includes(i)) t.push('stt');
  if ([12, 13, 18, 19].includes(i)) t.push('chain');
  if ([15, 17, 19].includes(i)) t.push('img');
  if ([3, 7, 11, 15, 19].includes(i)) t.push('cost');
  if ([1, 5, 9, 13, 17].includes(i)) t.push('notif');
  if (t.length < 2) t.push('scr'); // 最低2スニペット
  return t;
}
function buildTeams() {
  const teams = [];
  for (let i = 0; i < 20; i++) {
    const th = teamThemes(i);
    const transcript = `【${TEAM_NAMES[i]}の議論】各自のプロダクトを紹介し合った。` + th.map(k => SNIP[k]).join('');
    teams.push({ name: TEAM_NAMES[i], members: [NAMES[i % 20], NAMES[(i + 5) % 20], NAMES[(i + 10) % 20]].slice(0, 2 + (i % 2)), themes: th, transcript });
  }
  return teams;
}

const INSIGHTS = [
  '結論を先に書くと精度が上がる、は全員に効きそう',
  '環境変数まわりのデプロイ事故が共通の壁',
  '要件を言語化できた人ほど前に進んでいる',
  'スクショ丸ごと作戦は時短効果が大きい',
  'コストは文字起こし(STT)が大半を占める',
  '通知設計は出しすぎないのがコツ',
  'テンプレ化で品質が安定する',
  '話者分離は割り切る判断も大事',
];

function buildHypotheses() {
  return {
    online: {
      keywords: ['環境変数','デプロイ','要件','文字起こし','RLS','スクショ','プロンプト','テンプレ','精度','コスト','通知','話者分離'],
      topStumbles: ['環境変数','要件','文字起こし'], // 8/5/4
      topHacks: ['スクショ','テンプレ','結論'],
      topTroubles: ['精度','コスト','通知'],
      note: 'stumble頻度 環境変数8>要件5>文字起こし4>RLS3。環境変数が最頻。',
    },
    real: {
      keywords: ['環境変数','デプロイ','要件','スクショ','プロンプト','テンプレ','コスト'],
      topStumbles: ['環境変数','要件'], // env12 / req10
      topHacks: ['スクショ','テンプレ'],
      note: 'env=12卓・req=10卓・scr=8卓が支配的。',
    },
    merged: {
      keywords: ['環境変数','デプロイ','要件','プロンプト','スクショ','精度','コスト'],
      note: 'online+realの和集合。環境変数・要件・精度が中心。',
    },
  };
}

// ============ 投入 ============
async function seed() {
  const online = buildOnline(), teams = buildTeams(), hypotheses = buildHypotheses();
  writeFileSync(FIX, JSON.stringify({ generatedFor: TODAY, online, insights: INSIGHTS, teams, hypotheses }, null, 2));
  console.log(`\n=== 投入（today=${TODAY}）｜fixture保存: ${FIX} ===`);
  await sb.from('sessions').delete().eq('date', TODAY); // クリーンスタート
  for (const r of online) await POST('/api/reflections', r);
  for (const b of INSIGHTS) await POST('/api/insights', { body: b });
  const teamIds = [];
  for (const t of teams) { const j = await POST('/api/teams', { name: t.name, members: t.members }); teamIds.push(j.id); await POST(`/api/teams/${j.id}/transcript`, { transcript: t.transcript }); }
  console.log(`投入完了: オンライン振り返り${online.length} / 気づき${INSIGHTS.length} / リアル卓${teams.length}`);
  return { teamIds };
}

// ============ 集約（スループット計測） ============
async function aggregate(teamIds) {
  console.log('\n=== 集約（スループット計測）===');
  const agg = (b) => POST('/api/aggregate', { ...b, opsKey: OPS });
  // team×20 を同時バースト（=20卓同時押しのスループット検証）
  const t0 = Date.now();
  let results = await Promise.all(teamIds.map(id => agg({ scope: 'team', teamId: id }).then(j => ({ id, ok: !!j.result, err: j.error })).catch(e => ({ id, ok: false, err: String(e) }))));
  const burstMs = Date.now() - t0;
  let ok = results.filter(r => r.ok).length;
  // 失敗は逐次リトライ（real集約の前提を満たすため）
  const failed = results.filter(r => !r.ok);
  for (const f of failed) { const j = await agg({ scope: 'team', teamId: f.id }); if (j.result) ok++; }
  console.log(`  team×20 同時バースト: 成功 ${results.filter(r=>r.ok).length}/20・総${(burstMs/1000).toFixed(1)}s（平均${(burstMs/20/1000).toFixed(2)}s）／リトライ後 成功 ${ok}/20`);

  const time = async (label, b) => { const s = Date.now(); const j = await agg(b); console.log(`  ${label}: ${((Date.now()-s)/1000).toFixed(1)}s ${j.result?'OK':'NG('+(j.error||'')+')'}`); return j.result; };
  const online = await time('online集約', { scope: 'online' });
  const real = await time('real集約（map-reduce）', { scope: 'real' });
  const merged = await time('merged集約（統合）', { scope: 'merged' });
  return { online, real, merged, burstOk: results.filter(r=>r.ok).length };
}

// ============ 評価 ============
const has = (hay, kw) => hay.includes(kw);
function flat(r) {
  const parts = [];
  for (const s of r.commonStumbles || []) { parts.push(s.title); (s.evidence||[]).forEach(e=>parts.push(e)); }
  for (const h of r.hacks || []) { parts.push(h.title); (h.evidence||[]).forEach(e=>parts.push(e)); }
  for (const c of r.currentTroubles || []) { parts.push(c.title); (c.evidence||[]).forEach(e=>parts.push(e)); }
  for (const w of r.wordCloud || []) parts.push(w.keyword);
  parts.push(r.trendSummary || '', r.discussionSummary || '');
  for (const who of ['spark','minta']) { const a = r.interpretations?.[who]; (a?.reads||[]).forEach(x=>{parts.push(x.read);(x.evidence||[]).forEach(e=>parts.push(e));}); parts.push(a?.question||''); }
  return parts.join(' ');
}
function toneScore(r) {
  let casual = 0, polite = 0;
  const texts = [];
  for (const who of ['spark','minta']) { const a = r.interpretations?.[who]; (a?.reads||[]).forEach(x=>texts.push(x.read)); texts.push(a?.question||''); }
  const blob = texts.join(' ');
  for (const m of ['だね','だよ','そう','しちゃ','なぁ','面白い','いいね','だ！','よ！','かな']) if (blob.includes(m)) casual++;
  for (const m of ['です','ます','ございます','である','われる','が求めら']) { const c = (blob.match(new RegExp(m,'g'))||[]).length; polite += c; }
  return { casual, polite };
}
function evidenceGrounding(r, corpus) {
  let total = 0, grounded = 0;
  const check = (ev) => { for (const e of ev||[]) { total++; const s = (e||'').replace(/[「」『』“”‘’"'。、！？\s]/g,'').slice(0,8); if (s && corpus.includes(s)) grounded++; } };
  (r.commonStumbles||[]).forEach(x=>check(x.evidence));
  (r.hacks||[]).forEach(x=>check(x.evidence));
  (r.currentTroubles||[]).forEach(x=>check(x.evidence));
  return { total, grounded, rate: total ? grounded/total : 0 };
}
function evalScope(name, r, hyp, corpus) {
  if (!r) { console.log(`\n■ ${name}: 集約結果なし ✗`); return { name, pass: false }; }
  const blob = flat(r);
  const kwHit = hyp.keywords.filter(k => has(blob, k));
  const recall = kwHit.length / hyp.keywords.length;
  const stHit = (hyp.topStumbles||[]).filter(k => (r.commonStumbles||[]).some(s => has(s.title+JSON.stringify(s.evidence), k)));
  const tone = toneScore(r);
  const ground = evidenceGrounding(r, corpus);
  const wc = (r.wordCloud||[]).length;
  const wcOk = wc >= 16 && wc <= 22 && (r.wordCloud||[]).every(w => Number.isInteger(w.weight) && w.weight>=1 && w.weight<=5);
  const stOk = (r.commonStumbles||[]).length <= 3;
  console.log(`\n■ ${name}`);
  console.log(`  KW再現率: ${(recall*100).toFixed(0)}% (${kwHit.length}/${hyp.keywords.length})  欠落:[${hyp.keywords.filter(k=>!has(blob,k)).join('・')||'なし'}]`);
  if (hyp.topStumbles) console.log(`  トップつまずき一致: ${stHit.length}/${hyp.topStumbles.length} [${stHit.join('・')}]  実際:[${(r.commonStumbles||[]).map(s=>`${s.title}(${s.count})`).join(' / ')}]`);
  console.log(`  ハック: [${(r.hacks||[]).map(h=>h.title).join(' / ')}]`);
  console.log(`  トーン: タメ口マーカー${tone.casual}種 / 敬語${tone.polite}回（敬語0が理想）`);
  console.log(`  根拠の接地率: ${(ground.rate*100).toFixed(0)}% (${ground.grounded}/${ground.total})`);
  console.log(`  wordCloud: ${wc}語 形式${wcOk?'OK':'NG'} / つまずき≤3:${stOk?'OK':'NG'}`);
  const pass = recall >= 0.7 && tone.polite === 0 && wcOk && stOk;
  console.log(`  判定: ${pass ? '✅ 合格' : '⚠ 要確認'}`);
  return { name, recall, stHit: stHit.length, tone, ground: ground.rate, wc, wcOk, pass };
}

// ============ DB検証 ============
async function dbCheck() {
  console.log('\n=== DB正しさ ===');
  const { data: s } = await sb.from('sessions').select('id').eq('date', TODAY).order('created_at', { ascending: true }).limit(1).maybeSingle();
  const { count: refl } = await sb.from('reflections').select('id', { count: 'exact', head: true }).eq('session_id', s.id);
  const { count: ins } = await sb.from('insights').select('id', { count: 'exact', head: true }).eq('session_id', s.id);
  const { data: teams } = await sb.from('teams').select('id').eq('session_id', s.id);
  const tids = teams.map(t => t.id);
  const { count: rec } = await sb.from('recordings').select('id', { count: 'exact', head: true }).in('team_id', tids);
  const { data: aggs } = await sb.from('aggregations').select('scope').eq('session_id', s.id);
  const by = {}; for (const a of aggs) by[a.scope] = (by[a.scope]||0)+1;
  const { count: sessCount } = await sb.from('sessions').select('id', { count: 'exact', head: true }).eq('date', TODAY);
  console.log(`  reflections=${refl}(期待20) insights=${ins}(期待8) teams=${teams.length}(期待20) recordings=${rec}(期待20)`);
  console.log(`  aggregations scope内訳: ${JSON.stringify(by)}（team≈20, online1, real1, merged1）`);
  console.log(`  当日session数=${sessCount}（期待1＝一意）`);
  return { refl, ins, teams: teams.length, rec, by, sessCount };
}

// ============ main ============
if (process.argv.includes('--clean')) { await sb.from('sessions').delete().eq('date', TODAY); console.log('当日データを掃除しました'); process.exit(0); }
const onlySeed = process.argv.includes('--seed');
const onlyEval = process.argv.includes('--eval');

let teamIds = [];
if (!onlyEval) ({ teamIds } = await seed());
else { const { data: s } = await sb.from('sessions').select('id').eq('date', TODAY).order('created_at',{ascending:true}).limit(1).maybeSingle(); const { data: t } = await sb.from('teams').select('id').eq('session_id', s.id); teamIds = t.map(x=>x.id); }

if (onlySeed) { console.log('\n--seed 完了'); process.exit(0); }

const { online, real, merged, burstOk } = await aggregate(teamIds);
const fix = JSON.parse(readFileSync(FIX, 'utf8'));
const onlineCorpus = fix.online.map(o => `${o.pr}${o.stumble}${o.hack}${o.trouble}`).join('').replace(/[。、！？\s]/g,'');
const teamCorpus = fix.teams.map(t => t.transcript).join('').replace(/[。、！？\s]/g,'');

console.log('\n════════ 評価 ════════');
const e1 = evalScope('オンライン全体（REMOTE-2/5）', online, fix.hypotheses.online, onlineCorpus);
const e2 = evalScope('リアル全体（ONSITE-3）', real, fix.hypotheses.real, teamCorpus);
const e3 = evalScope('統合（最終結果）', merged, fix.hypotheses.merged, onlineCorpus + teamCorpus);
const db = await dbCheck();

console.log('\n════════ 総括 ════════');
console.log(`  スループット: team同時バースト成功 ${burstOk}/20`);
console.log(`  プロンプト精度: online KW再現${(e1.recall*100).toFixed(0)}% / real ${(e2.recall*100).toFixed(0)}% / merged ${(e3.recall*100).toFixed(0)}%`);
console.log(`  トーン: 敬語 online${e1.tone.polite}/real${e2.tone.polite}/merged${e3.tone.polite}（0が理想）`);
console.log(`  判定: online ${e1.pass?'✅':'⚠'} / real ${e2.pass?'✅':'⚠'} / merged ${e3.pass?'✅':'⚠'}`);
writeFileSync('scripts/fixtures/verify-last-report.json', JSON.stringify({ today: TODAY, burstOk, online: e1, real: e2, merged: e3, db }, null, 2));
console.log('\nレポート保存: scripts/fixtures/verify-last-report.json');
