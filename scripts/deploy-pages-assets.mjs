import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const artifactDirectory = resolve(repositoryRoot, 'dist-frontend');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `${command} ${args.join(' ')} failed.`);
  }
  return result.stdout.trim();
}

function fail(message) {
  console.error(`Frontend Pages deploy blocked: ${message}`);
  process.exit(1);
}

const branch = run('git', ['branch', '--show-current']);
if (!branch) fail('detached HEAD is not a deployable release branch.');

let apiOrigin;
let workerName;
if (branch === 'main') {
  if (process.env.ALLOW_PRODUCTION_PAGES_ASSET_DEPLOY !== 'opencourts.us') {
    fail('set ALLOW_PRODUCTION_PAGES_ASSET_DEPLOY=opencourts.us to authorize a Production asset publish.');
  }

  const config = JSON.parse(await readFile(resolve(repositoryRoot, 'backend/wrangler.jsonc'), 'utf8'));
  const production = config.env?.production;
  const hasApiRoute = production?.routes?.some((route) =>
    route.pattern === 'opencourts.us/api/*' && route.zone_name === 'opencourts.us'
  );
  if (production?.name !== 'opencourts-api-production' || production.workers_dev !== false || !hasApiRoute) {
    fail('the canonical Wrangler config does not declare the Production API Worker route.');
  }
  apiOrigin = 'https://opencourts.us';
  workerName = production.name;
} else if (branch === 'feature/play-together') {
  apiOrigin = 'https://feature-play-together.opencourts.pages.dev';
  workerName = 'opencourts-api-preview';
} else {
  fail(`branch "${branch}" has no stable API health-check origin; deploy only main or feature/play-together.`);
}

if (run('git', ['status', '--porcelain'])) {
  fail('the working tree must be clean so the Pages deployment maps to a reviewed commit.');
}

try {
  await access(artifactDirectory, constants.R_OK);
} catch {
  fail('dist-frontend is missing; run npm run build:frontend:release first.');
}

const artifactEntries = await readdir(artifactDirectory);
if (artifactEntries.includes('functions') || artifactEntries.includes('_worker.js')) {
  fail('the artifact contains a Pages Functions or Worker entry point.');
}

const deployments = run('npx', [
  'wrangler', 'deployments', 'status', '--name', workerName,
  '--config', 'backend/wrangler.jsonc',
]);
if (!/Version\(s\):\s+\(100%\)\s+[0-9a-f-]{36}/i.test(deployments)) {
  fail(`Worker ${workerName} has no confirmed active deployment.`);
}

let apiResponse;
try {
  apiResponse = await fetch(`${apiOrigin}/api/auth/me`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
} catch {
  fail(`the API health check at ${apiOrigin}/api/auth/me could not be reached.`);
}
if (apiResponse.status !== 200) {
  fail(`the API health check returned HTTP ${apiResponse.status}.`);
}

const commitHash = run('git', ['rev-parse', 'HEAD']);
const commitMessage = run('git', ['log', '-1', '--format=%s']);
const result = spawnSync('npx', [
  'wrangler', 'pages', 'deploy', '.',
  '--cwd', artifactDirectory,
  '--project-name', 'opencourts',
  '--branch', branch,
  '--commit-hash', commitHash,
  '--commit-message', commitMessage,
], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);
