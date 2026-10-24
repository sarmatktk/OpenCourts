#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROWS_PER_FILE = 250;

export function isTennisCourt(tags) {
  const sports = String(tags?.sport ?? '').split(';').map(item => item.trim().toLowerCase());
  return ['pitch', 'sports_centre'].includes(tags?.leisure) && sports.includes('tennis');
}

function flattenCoordinates(value, output = []) {
  if (!Array.isArray(value)) return output;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') output.push(value);
  else for (const item of value) flattenCoordinates(item, output);
  return output;
}

function geoJSONCenter(geometry) {
  const points = flattenCoordinates(geometry?.coordinates);
  if (!points.length) return undefined;
  let minLon = Infinity; let maxLon = -Infinity; let minLat = Infinity; let maxLat = -Infinity;
  for (const point of points) {
    minLon = Math.min(minLon, point[0]); maxLon = Math.max(maxLon, point[0]);
    minLat = Math.min(minLat, point[1]); maxLat = Math.max(maxLat, point[1]);
  }
  return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
}

export function parseGeoJSONFeature(feature) {
  const properties = feature.properties ?? {};
  const tags = properties.tags && typeof properties.tags === 'object'
    ? properties.tags
    : Object.fromEntries(Object.entries(properties).filter(([key]) => !key.startsWith('@')));
  const featureIdParts = String(feature.id ?? '').split('/');
  const rawType = properties['@type'] ?? properties.type ?? featureIdParts[0];
  const rawId = properties['@id'] ?? properties.id ?? featureIdParts[1] ?? featureIdParts[0];
  const center = geoJSONCenter(feature.geometry);
  return {
    type: String(rawType ?? '').replace(/^.*\//, ''),
    id: Number(String(rawId ?? '').replace(/^.*\//, '')),
    lat: Number(properties.lat ?? center?.lat),
    lon: Number(properties.lon ?? center?.lon),
    tags,
  };
}

export function parseOverpassResponse(raw) {
  if (!Array.isArray(raw.elements)) throw new Error('Input must be an Overpass JSON response with an `elements` array.');
  return raw.elements.map(element => ({
    type: element.type,
    id: Number(element.id),
    lat: Number(element.lat ?? element.center?.lat),
    lon: Number(element.lon ?? element.center?.lon),
    tags: element.tags ?? {},
  }));
}

export function normalizeCourtRecords(candidates) {
  const typeSet = new Set(['node', 'way', 'relation']);
  const valid = candidates.filter(item => typeSet.has(item.type)
    && Number.isSafeInteger(item.id) && item.id > 0
    && Number.isFinite(item.lat) && Math.abs(item.lat) <= 90
    && Number.isFinite(item.lon) && Math.abs(item.lon) <= 180
    && isTennisCourt(item.tags))
    .map(item => ({ ...item, tags: Object.fromEntries(Object.entries(item.tags).filter(([key]) => !key.startsWith('@'))) }));
  const unique = new Map(valid.map(court => [`${court.type}/${court.id}`, court]));
  const records = [...unique.values()];
  if (!records.length) throw new Error('No valid tennis court features were found. Nothing was imported.');
  return records;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function diffCourtRecords(records, existing) {
  const current = new Map(existing.map(row => [`${row.osm_type}/${row.osm_id}`, row]));
  const changed = [];
  for (const record of records) {
    const key = `${record.type}/${record.id}`;
    const old = current.get(key);
    const tags = JSON.stringify(record.tags);
    if (!old || Number(old.lat) !== record.lat || Number(old.lon) !== record.lon || old.tags_json !== tags) changed.push(record);
    current.delete(key);
  }
  return { changed, removed: [...current.values()] };
}

export async function writeCatalogFiles(records, outputDir, rowsPerFile = ROWS_PER_FILE, existing = []) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const { changed, removed } = diffCourtRecords(records, existing);

  const columns = '(osm_type, osm_id, lat, lon, tags_json)';
  let part = 0;
  for (let start = 0; start < changed.length; start += rowsPerFile) {
    const batch = changed.slice(start, start + rowsPerFile);
    const inserts = batch.map(item => `(${sqlString(item.type)}, ${item.id}, ${item.lat}, ${item.lon}, ${sqlString(JSON.stringify(item.tags))})`);
    const statements = [];
    for (let offset = 0; offset < inserts.length; offset += 50) {
      statements.push(`INSERT INTO tennis_courts ${columns} VALUES\n${inserts.slice(offset, offset + 50).join(',\n')}\nON CONFLICT(osm_type, osm_id) DO UPDATE SET lat=excluded.lat, lon=excluded.lon, tags_json=excluded.tags_json;`);
    }
    await writeFile(path.join(outputDir, `${String(++part).padStart(4, '0')}-courts.sql`), `${statements.join('\n')}\n`);
  }
  for (let start = 0; start < removed.length; start += rowsPerFile) {
    const batch = removed.slice(start, start + rowsPerFile);
    await writeFile(path.join(outputDir, `${String(++part).padStart(4, '0')}-courts.sql`), `${batch.map(row => `DELETE FROM tennis_courts WHERE osm_type=${sqlString(row.osm_type)} AND osm_id=${row.osm_id};`).join('\n')}\n`);
  }
  return { chunks: part, changed: changed.length, removed: removed.length };
}

async function cloudflareRequest(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(`Cloudflare D1 request failed: ${JSON.stringify(data.errors ?? response.status)}`);
  return data;
}

export async function readRemoteCatalog(database) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!account || !process.env.CLOUDFLARE_API_TOKEN) throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for --execute.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/d1/database`;
  const list = await cloudflareRequest(`${base}?name=${encodeURIComponent(database)}`);
  const matches = list.result.filter(item => item.name === database);
  if (matches.length !== 1) throw new Error(`Expected exactly one D1 database named ${database}; found ${matches.length}.`);
  const url = `${base}/${matches[0].uuid}/query`;
  const rows = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const response = await cloudflareRequest(url, { sql: 'SELECT osm_type, osm_id, lat, lon, tags_json FROM tennis_courts ORDER BY osm_type, osm_id LIMIT ? OFFSET ?', params: [pageSize, offset] });
    const result = response.result?.[0];
    if (!result?.success || !Array.isArray(result.results)) throw new Error('Invalid D1 catalog query response.');
    rows.push(...result.results);
    if (result.results.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function readCandidates(inputPaths) {
  const candidates = [];
  for (const inputPath of inputPaths) {
    if (inputPath.endsWith('.geojsonseq') || inputPath.endsWith('.geojsonl')) {
      const stream = readline.createInterface({ input: createReadStream(inputPath), crlfDelay: Infinity });
      for await (const line of stream) {
        const trimmed = line.replace(/^\u001e/, '').trim();
        if (trimmed) {
          const candidate = parseGeoJSONFeature(JSON.parse(trimmed));
          // Regional OSM exports contain many kinds of pitches and centers.
          // Keep only tennis records in memory while streaming nationwide data.
          if (isTennisCourt(candidate.tags)) candidates.push(candidate);
        }
      }
    } else {
      const raw = JSON.parse(await readFile(inputPath, 'utf8'));
      if (Array.isArray(raw.features)) candidates.push(...raw.features.map(parseGeoJSONFeature).filter(item => isTennisCourt(item.tags)));
      else candidates.push(...parseOverpassResponse(raw));
    }
  }
  return candidates;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

function inputOptions(args) {
  return args.flatMap((arg, index) => arg === '--input' && args[index + 1] && !args[index + 1].startsWith('--') ? [args[index + 1]] : []);
}

function runWrangler(database, file) {
  const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', database, '--remote', '--file', file], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Wrangler failed for ${path.basename(file)} (${result.status ?? 'unknown status'}).`);
}

export async function importCatalog(args = process.argv.slice(2)) {
  const inputPaths = inputOptions(args);
  if (!inputPaths.length) inputPaths.push('court-data.json');
  const outputDir = path.resolve(option(args, '--output-dir', '.court-catalog-import'));
  const database = option(args, '--database', 'opencourts-courts');
  const records = normalizeCourtRecords(await readCandidates(inputPaths));
  const existing = args.includes('--execute') ? await readRemoteCatalog(database) : [];
  const generated = await writeCatalogFiles(records, outputDir, ROWS_PER_FILE, existing);

  console.log(`Prepared ${records.length} unique tennis court records in ${outputDir}.`);
  console.log(`${generated.changed} additions/updates and ${generated.removed} removals; unchanged courts require no writes.`);
  if (args.includes('--execute')) {
    for (let index = 1; index <= generated.chunks; index++) {
      runWrangler(database, path.join(outputDir, `${String(index).padStart(4, '0')}-courts.sql`));
    }
    console.log(`Published ${records.length} records to the remote D1 database “${database}”.`);
  } else {
    console.log(`To upload with the Wrangler login already configured, rerun with --execute --database ${database}.`);
  }
  return records.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  importCatalog().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
