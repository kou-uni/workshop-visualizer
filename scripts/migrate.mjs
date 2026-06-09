// supabase/migrations/*.sql を順に適用する簡易ランナー
// 使い方: node scripts/migrate.mjs   （.env.local の POSTGRES_URL_NON_POOLING を使用）
import { readFileSync, readdirSync } from 'node:fs';
import { Client } from 'pg';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

const env = loadEnv('.env.local');
const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
if (!url) { console.error('POSTGRES_URL_NON_POOLING が .env.local にありません'); process.exit(1); }

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const dir = 'supabase/migrations';
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

await client.connect();
for (const f of files) {
  process.stdout.write(`applying ${f} ... `);
  await client.query(readFileSync(`${dir}/${f}`, 'utf8'));
  console.log('ok');
}
const r = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name"
);
console.log('tables:', r.rows.map((x) => x.table_name).join(', '));
await client.end();
console.log('done');
