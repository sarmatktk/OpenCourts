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

export async function writeCatalogFiles(records, outputDir, rowsPerFile = ROWS_PER_FILE) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const prep = path.join(outputDir, '000-prepare.sql');
  await writeFile(prep, `DROP TABLE IF EXISTS tennis_courts_staging;\nCREATE TABLE tennis_courts_staging (osm_type TEXT NOT NULL, osm_id INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, tags_json TEXT NOT NULL, PRIMARY KEY (osm_type, osm_id));\n`);

  const columns = '(osm_type, osm_id, lat, lon, tags_json)';
  for (let start = 0, part = 1; start < records.length; start += rowsPerFile, part++) {
    const batch = records.slice(start, start + rowsPerFile);
    const inserts = batch.map(item => `(${sqlString(item.type)}, ${item.id}, ${item.lat}, ${item.lon}, ${sqlString(JSON.stringify(item.tags))})`);
    const statements = [];
    for (let offset = 0; offset < inserts.length; offset += 50) {
      statements.push(`INSERT OR REPLACE INTO tennis_courts_staging ${columns} VALUES\n${inserts.slice(offset, offset + 50).join(',\n')};`);
    }
    await writeFile(path.join(outputDir, `${String(part).padStart(4, '0')}-courts.sql`), `${statements.join('\n')}\n`);
  }

  const finalize = path.join(outputDir, '999-publish.sql');
  // D1 remote SQL execution does not provide a persistent transaction across
  // statements. Upsert first, then remove stale rows as the final operation;
  // a failed publish therefore keeps the existing catalog available.
  await writeFile(finalize, `INSERT OR REPLACE INTO tennis_courts (osm_type, osm_id, lat, lon, tags_json) SELECT osm_type, osm_id, lat, lon, tags_json FROM tennis_courts_staging;\nDELETE FROM tennis_courts WHERE NOT EXISTS (SELECT 1 FROM tennis_courts_staging WHERE tennis_courts_staging.osm_type = tennis_courts.osm_type AND tennis_courts_staging.osm_id = tennis_courts.osm_id);\nDROP TABLE tennis_courts_staging;\n`);
  return { prep, finalize, chunks: Math.ceil(records.length / rowsPerFile) };
}

async function readCandidates(inputPaths) {
  const candidates = [];
  for (const inputPath of inputPaths) {
    if (inputPath.endsWith('.geojsonseq') || inputPath.endsWith('.geojsonl')) {
      const stream = readline.createInterface({ input: createReadStream(inputPath), crlfDelay: Infinity });
      for await (const line of stream) {
        const trimmed = line.replace(/^\u001e/, '').trim();
        if (trimmed) candidates.push(parseGeoJSONFeature(JSON.parse(trimmed)));
      }
    } else {
      const raw = JSON.parse(await readFile(inputPath, 'utf8'));
      if (Array.isArray(raw.features)) candidates.push(...raw.features.map(parseGeoJSONFeature));
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
  const generated = await writeCatalogFiles(records, outputDir);

  console.log(`Prepared ${records.length} unique tennis court records in ${outputDir}.`);
  console.log('The current catalog remains live until the final publish step.');
  if (args.includes('--execute')) {
    runWrangler(database, generated.prep);
    for (let index = 1; index <= generated.chunks; index++) {
      runWrangler(database, path.join(outputDir, `${String(index).padStart(4, '0')}-courts.sql`));
    }
    runWrangler(database, generated.finalize);
    console.log(`Published ${records.length} records to the remote D1 database “${database}”.`);
  } else {
    console.log(`To upload with the Wrangler login already configured, rerun with --execute --database ${database}.`);
  }
  return records.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  importCatalog().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
