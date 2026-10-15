import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const previewDir = resolve(tmpdir(), 'opencourts-landing-social');
mkdirSync(previewDir, { recursive: true });
const source = resolve(root, 'public', 'social-preview.png');
const cards = [
  { key: 'play-weather', file: 'social-play-weather.png', kicker: '7-DAY TENNIS WEATHER', lines: ['Find a better', 'time to play.'], sub: 'Compare the best daylight windows.', symbol: 'sun', tags: [['Rain chance', '#88d2ee'], ['Wind', '#c6e69a'], ['Temperature', '#ffd091']] },
  { key: 'after-rain', file: 'social-after-rain.png', kicker: 'RECENT RAIN NEAR COURTS', lines: ['After the rain,', 'where to play?'], sub: 'Compare radar estimates near courts.', symbol: 'rain', tags: [['1h rain', '#88d2ee'], ['3h rain', '#88d2ee'], ['6h rain', '#88d2ee']] },
  { key: 'fairfax-courts', file: 'social-fairfax-courts.png', kicker: 'FAIRFAX, VIRGINIA', lines: ['Your next court', 'in Fairfax.'], sub: 'Explore nearby courts and local weather.', symbol: 'pin', tags: [['Court map', '#c6e69a'], ['Local forecast', '#88d2ee']] }
];
const motifs = {
  sun: '<circle cx="937" cy="238" r="52" fill="#f2c66d"/><g stroke="#f2c66d" stroke-width="7" stroke-linecap="round"><path d="M937 156v-18M937 338v-18M855 238h-18M1037 238h-18M879 180l-13-13M1008 309l-13-13M995 180l13-13M866 309l13-13"/></g>',
  rain: '<g fill="none" stroke="#94cde3" stroke-width="8" stroke-linecap="round"><path d="M844 194c20-39 83-40 105-2 48-9 84 44 51 81H833c-34-35-9-80 11-79z"/><path d="M856 308l-13 28M930 308l-13 28M1004 308l-13 28"/></g>',
  pin: '<path d="M936 134c-51 0-92 40-92 91 0 61 92 155 92 155s92-94 92-155c0-51-41-91-92-91z" fill="#d7edb5"/><circle cx="936" cy="225" r="35" fill="#294e42"/><path d="M690 450h380M705 490h350" stroke="#d7edb5" stroke-width="3" opacity=".65"/>'
};
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function tagsSvg(tags) {
  let x = 80;
  return tags.map(([label, color]) => {
    const width = 35 + label.length * 9;
    const tag = `<rect x="${x}" y="455" width="${width}" height="35" rx="17" fill="#173a32" stroke="${color}" stroke-opacity=".8"/><circle cx="${x + 16}" cy="472.5" r="4" fill="${color}"/><text x="${x + 29}" y="478" fill="#f2f6ef" font-size="15" font-family="Arial,sans-serif" font-weight="600">${escape(label)}</text>`;
    x += width + 9;
    return tag;
  }).join('');
}
function overlay(card, variant) {
  const solid = variant === 'a' ? '#092920' : '#133a32';
  const accent = variant === 'a' ? '#d9f06b' : '#dce9af';
  return Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fade"><stop offset="0" stop-color="${solid}" stop-opacity="1"/><stop offset=".58" stop-color="${solid}" stop-opacity="1"/><stop offset=".82" stop-color="${solid}" stop-opacity=".65"/><stop offset="1" stop-color="${solid}" stop-opacity=".18"/></linearGradient></defs><rect width="1200" height="630" fill="url(#fade)"/><rect x="800" y="100" width="275" height="305" rx="25" fill="#123d32" fill-opacity=".7" stroke="#dce9af" stroke-opacity=".55"/>${motifs[card.symbol]}<circle cx="94" cy="92" r="23" fill="none" stroke="${accent}" stroke-width="2"/><path d="M79 75c7 5 11 11 11 17s-4 12-11 17M109 75c-7 5-11 11-11 17s4 12 11 17" fill="none" stroke="${accent}" stroke-width="2"/><text x="136" y="102" fill="#fff" font-size="28" font-family="Arial,sans-serif" font-weight="700">opencourts</text><circle cx="80" cy="170" r="5" fill="${accent}"/><text x="99" y="176" fill="${accent}" font-size="15" letter-spacing="3" font-family="Arial,sans-serif" font-weight="700">${escape(card.kicker)}</text><text x="78" y="277" fill="#fff" font-size="70" font-family="Georgia,serif">${escape(card.lines[0])}</text><text x="78" y="358" fill="#fff" font-size="70" font-family="Georgia,serif">${escape(card.lines[1])}</text><text x="80" y="425" fill="#dfebe1" font-size="22" font-family="Arial,sans-serif">${escape(card.sub)}</text>${tagsSvg(card.tags)}<path d="M80 522h580" stroke="#a7c2ad" stroke-opacity=".55"/><text x="80" y="565" fill="#fff" font-size="16" font-family="Arial,sans-serif" font-weight="700" letter-spacing="3">OPENCOURTS.US</text></svg>`);
}
for (const card of cards) {
  for (const variant of ['a', 'b']) {
    await sharp(source).composite([{ input: overlay(card, variant) }]).png({ compressionLevel: 9 }).toFile(resolve(previewDir, `${card.key}-${variant}.png`));
  }
  await sharp(source).composite([{ input: overlay(card, 'a') }]).png({ compressionLevel: 9 }).toFile(resolve(root, 'public', card.file));
}
