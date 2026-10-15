#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import readline from 'node:readline';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTennisCourt, parseGeoJSONFeature } from './import-court-catalog.mjs';

const CELL_SIZE = 0.01;
const MAX_MILES = 0.35;

function keyFor(lat, lon) { return `${Math.floor(lat / CELL_SIZE)}:${Math.floor(lon / CELL_SIZE)}`; }

function linesFor(geometry) {
  const points = values => (values || []).filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  if (!geometry) return { lines: [], polygons: [] };
  if (geometry.type === 'Point') return { lines: [[geometry.coordinates]], polygons: [] };
  if (geometry.type === 'MultiPoint') return { lines: points(geometry.coordinates).map(point => [point]), polygons: [] };
  if (geometry.type === 'LineString') return { lines: [points(geometry.coordinates)], polygons: [] };
  if (geometry.type === 'MultiLineString') return { lines: geometry.coordinates.map(points), polygons: [] };
  if (geometry.type === 'Polygon') return { lines: geometry.coordinates.map(points), polygons: [geometry.coordinates.map(points)] };
  if (geometry.type === 'MultiPolygon') return { lines: geometry.coordinates.flatMap(polygon => polygon.map(points)), polygons: geometry.coordinates.map(polygon => polygon.map(points)) };
  if (geometry.type === 'GeometryCollection') {
    const items = geometry.geometries.map(linesFor);
    return { lines: items.flatMap(item => item.lines), polygons: items.flatMap(item => item.polygons) };
  }
  return { lines: [], polygons: [] };
}

function distanceMiles(a, b) {
  const latScale = 69.0;
  const lonScale = latScale * Math.cos(a.lat * Math.PI / 180);
  const dx = (b.lon - a.lon) * lonScale;
  const dy = (b.lat - a.lat) * latScale;
  return Math.hypot(dx, dy);
}

function pointInRing(point, ring) {
  if (ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i]; const [bx, by] = ring[j];
    if ((ay > point.lat) !== (by > point.lat) && point.lon < ((bx - ax) * (point.lat - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function featureDistance(point, geometry, isArea) {
  const { lines, polygons } = linesFor(geometry);
  if (isArea && polygons.some(rings => pointInRing(point, rings[0] || []) && !rings.slice(1).some(ring => pointInRing(point, ring)))) return 0;
  let nearest = Infinity;
  for (const line of lines) {
    if (line.length === 1) nearest = Math.min(nearest, distanceMiles(point, { lon: line[0][0], lat: line[0][1] }));
    for (let index = 1; index < line.length; index++) {
      const lonScale = 69 * Math.cos(point.lat * Math.PI / 180);
      const ax = (line[index - 1][0] - point.lon) * lonScale;
      const ay = (line[index - 1][1] - point.lat) * 69;
      const bx = (line[index][0] - point.lon) * lonScale;
      const by = (line[index][1] - point.lat) * 69;
      const dx = bx - ax; const dy = by - ay;
      const fraction = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(ax + fraction * dx, ay + fraction * dy));
    }
  }
  return Number.isFinite(nearest) ? nearest : undefined;
}

function featureBounds(geometry) {
  const { lines } = linesFor(geometry);
  const points = lines.flat();
  if (!points.length) return undefined;
  return points.reduce((bounds, point) => ({
    west: Math.min(bounds.west, point[0]), east: Math.max(bounds.east, point[0]),
    south: Math.min(bounds.south, point[1]), north: Math.max(bounds.north, point[1]),
  }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity });
}

function isPlace(tags) {
  return ['park', 'recreation_ground'].includes(tags.leisure)
    || ['school', 'college', 'university', 'community_centre', 'community_hall'].includes(tags.amenity)
    || tags.landuse === 'school';
}

async function* readGeoJSONSeq(filePath) {
  const stream = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of stream) {
    const trimmed = line.replace(/^\u001e/, '').trim();
    if (trimmed) yield JSON.parse(trimmed);
  }
}

function updateTags(feature, values) {
  const properties = feature.properties || (feature.properties = {});
  const tags = properties.tags && typeof properties.tags === 'object' ? properties.tags : properties;
  tags['opencourts:context_version'] = '2';
  if (values.place) {
    tags['opencourts:nearby_place'] = values.place.name;
    tags['opencourts:nearby_place_miles'] = values.place.distance.toFixed(3);
  }
  if (values.road) tags['opencourts:nearby_street'] = values.road.name;
}

export async function enrichCourtCatalog(inputPath, outputPath) {
  const courts = [];
  const courtByCell = new Map();
  for await (const feature of readGeoJSONSeq(inputPath)) {
    const record = parseGeoJSONFeature(feature);
    if (!isTennisCourt(record.tags) || !Number.isFinite(record.lat) || !Number.isFinite(record.lon)) continue;
    const index = courts.length;
    courts.push({ feature, point: { lat: record.lat, lon: record.lon }, context: {} });
    const key = keyFor(record.lat, record.lon);
    const bucket = courtByCell.get(key);
    if (bucket) bucket.push(index); else courtByCell.set(key, [index]);
  }
  if (!courts.length) throw new Error('No tennis courts were found in the exported OSM features.');

  for await (const feature of readGeoJSONSeq(inputPath)) {
    const tags = feature.properties?.tags && typeof feature.properties.tags === 'object'
      ? feature.properties.tags
      : Object.fromEntries(Object.entries(feature.properties || {}).filter(([key]) => !key.startsWith('@')));
    const name = String(tags.name || tags['name:en'] || '').trim();
    if (!name) continue;
    const isRoad = Boolean(tags.highway);
    const place = isPlace(tags);
    if (!isRoad && !place) continue;
    const bounds = featureBounds(feature.geometry);
    if (!bounds) continue;
    const latPadding = MAX_MILES / 68.7;
    const lonPadding = MAX_MILES / (68.7 * 0.25);
    const minY = Math.floor((bounds.south - latPadding) / CELL_SIZE);
    const maxY = Math.floor((bounds.north + latPadding) / CELL_SIZE);
    const minX = Math.floor((bounds.west - lonPadding) / CELL_SIZE);
    const maxX = Math.floor((bounds.east + lonPadding) / CELL_SIZE);
    const candidateSet = new Set();
    const gridCells = (maxY - minY + 1) * (maxX - minX + 1);
    if (gridCells > 1200) courts.forEach((_, index) => candidateSet.add(index));
    else for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) for (const index of courtByCell.get(`${y}:${x}`) || []) candidateSet.add(index);

    for (const index of candidateSet) {
      const court = courts[index];
      const distance = featureDistance(court.point, feature.geometry, place);
      if (distance === undefined || distance > MAX_MILES) continue;
      const kind = isRoad ? 'road' : 'place';
      if (!court.context[kind] || distance < court.context[kind].distance) court.context[kind] = { name, distance };
    }
  }

  const serialized = courts.map(court => {
    updateTags(court.feature, court.context);
    return `\u001e${JSON.stringify(court.feature)}\n`;
  }).join('');
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, serialized);
  const withPlace = courts.filter(court => court.context.place).length;
  const withRoad = courts.filter(court => court.context.road).length;
  console.log(`Prepared ${courts.length} courts with nearby place names for ${withPlace} and street names for ${withRoad}.`);
  return { courts: courts.length, withPlace, withRoad };
}

function option(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const input = option(process.argv.slice(2), '--input');
  const output = option(process.argv.slice(2), '--output');
  if (!input || !output) {
    console.error('Usage: node scripts/enrich-court-catalog.mjs --input region-features.geojsonseq --output region-courts.geojsonseq');
    process.exitCode = 1;
  } else {
    enrichCourtCatalog(input, output).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
  }
}
