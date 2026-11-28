import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const output = new URL('../dist-preview/', import.meta.url);
const functionsSource = new URL('../functions/api/_middleware.ts', import.meta.url);

await readdir(output);
const preparation = spawnSync(process.execPath, ['scripts/prepare-dev-pages.mjs', 'dist-preview'], {
  cwd: new URL('../', import.meta.url),
  stdio: 'inherit',
});
if (preparation.status !== 0) throw new Error(`Preview route preparation failed (${preparation.status}).`);

const middlewareDirectory = new URL('functions/api/', output);
await mkdir(middlewareDirectory, { recursive: true });
await copyFile(functionsSource, new URL('_middleware.ts', middlewareDirectory));

const topLevel = await readdir(output);
if (!topLevel.includes('functions')) throw new Error('Preview artifact is missing its API middleware.');
console.log('Prepared dist-preview with development routes, noindex headers and the Preview API bridge.');
