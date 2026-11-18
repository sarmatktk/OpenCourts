import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const configPath = path.join(root, 'development/wrangler.local.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const localId = '00000000-0000-0000-0000-000000000001';
const db = config.d1_databases;
if (db?.length !== 1 || db[0].binding !== 'COURTS_DB' ||
    db[0].database_name !== 'opencourts-dev' || db[0].database_id !== localId ||
    db[0].remote || config.env) {
  throw new Error('Refusing unexpected local database configuration. No command was run.');
}
const [action, ...extra] = process.argv.slice(2);
if (extra.length || !['migrate', 'seed', 'seed-games', 'verify', 'serve'].includes(action)) {
  throw new Error('Use migrate, seed, seed-games, verify, or serve without additional flags. Remote targets are not supported.');
}
const persist = path.join(root, '.wrangler/play-together-local');
const base = ['--config', configPath, '--local', '--persist-to', persist];
const gameSeed = path.join(root, '.wrangler/local-game-seed.sql');
if (action === 'seed-games') {
  mkdirSync(path.dirname(gameSeed), { recursive:true });
  const now = Date.now();
  const start = new Date(now); start.setUTCDate(start.getUTCDate()+1); start.setUTCHours(10,0,0,0);
  writeFileSync(gameSeed, `
INSERT INTO players(id,display_name,bio,created_at,updated_at) VALUES ('dev-sample-organizer','Demo Organizer','Synthetic local sample; not a real player.',${now},${now}) ON CONFLICT(id) DO NOTHING;
INSERT INTO games(id,organizer_id,visibility,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,skill_preference,notes,request_id,request_hash,created_at,updated_at)
SELECT '00000000-0000-4000-8000-000000000101','dev-sample-organizer','public','[Demo] Friendly doubles','osm-way-40881080','Development sample court',lat,lon,'public',${start.getTime()},${start.getTime()+5400000},'Europe/Paris','doubles',4,'any','Synthetic LOCAL demonstration. This is not a real event or court reservation.','local-demo-game','local-demo-game',${now},${now} FROM tennis_courts WHERE osm_type='way' AND osm_id=40881080
ON CONFLICT(id) DO UPDATE SET starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=excluded.updated_at;
INSERT INTO game_participants(game_id,player_id,joined_at) SELECT id,organizer_id,${now} FROM games WHERE id='00000000-0000-4000-8000-000000000101' ON CONFLICT(game_id,player_id) DO NOTHING;
SELECT id,title FROM games WHERE id='00000000-0000-4000-8000-000000000101';
`);
}
const commands = {
  migrate: ['d1', 'migrations', 'apply', 'COURTS_DB', ...base],
  seed: ['d1', 'execute', 'COURTS_DB', ...base, '--file', path.join(root, 'development/courts.seed.sql')],
  'seed-games': ['d1', 'execute', 'COURTS_DB', ...base, '--file', gameSeed],
  verify: ['d1', 'execute', 'COURTS_DB', ...base, '--command', 'SELECT osm_type, osm_id, lat, lon FROM tennis_courts ORDER BY osm_type, osm_id LIMIT 10'],
  serve: ['pages', 'dev', 'dist', '--compatibility-date=2025-01-01', '--ip=127.0.0.1', '--port=8788', '--d1', `COURTS_DB=${localId}`, '--binding', 'PLAY_TOGETHER_ENABLED=true', '--binding', 'AUTH_ORIGIN=http://127.0.0.1:8788', '--persist-to', persist],
};
console.log(`Local-only ${action}: COURTS_DB -> opencourts-dev (SQLite under ${persist}). No remote D1 access.`);
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), ...commands[action]], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: path.join(root, '.wrangler/logs') },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
