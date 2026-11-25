import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const previewDir = resolve(tmpdir(), 'opencourts-landing-social');
mkdirSync(previewDir, { recursive: true });
const source = resolve(root, 'public', 'social-preview.png');
const socialFiles = [
  'social-preview-v2.png', 'social-play-weather.png', 'social-after-rain.png',
  'social-fairfax-courts.png', 'social-miami-courts.png', 'social-los-angeles-courts.png',
  'social-dallas-courts.png', 'social-atlanta-courts.png'
];
const playTogetherFiles = [];
const storeBadges = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="306" height="47" viewBox="0 0 306 47"><g><rect x="0.5" y="0.5" width="148" height="46" rx="7" fill="#050505" stroke="#fff" stroke-opacity=".9"/><path fill="#00d7ff" d="M13 9l16 14-16 15a2 2 0 0 1-1-2V11a2 2 0 0 1 1-2z"/><path fill="#00f076" d="M13 9l19 11 4 3-7 1L13 9z"/><path fill="#ffdf00" d="m29 24 7-1 4 4-1 1-10 6-7-7 7-3z"/><path fill="#ff3b57" d="m13 38 16-14 7 7-21 12a2 2 0 0 1-2-1z"/><text x="45" y="18" fill="#fff" font-family="Arial,sans-serif" font-size="8">GET IT ON</text><text x="45" y="34" fill="#fff" font-family="Arial,sans-serif" font-size="16" font-weight="600">Google Play</text><rect x="157.5" y="0.5" width="148" height="46" rx="7" fill="#050505" stroke="#fff" stroke-opacity=".9"/><path fill="#fff" d="M177 13c-2 0-4 2-4 5 0 4 4 11 7 11 1 0 2-1 4-1s3 1 4 1c2 0 3-2 4-4-3-1-4-5 0-7-1-2-3-3-5-3-2 0-3 1-4 1-2 0-3-1-6-1zm7-2c1-2 3-3 5-3 0 2-1 4-4 5"/><text x="198" y="18" fill="#fff" font-family="Arial,sans-serif" font-size="8">Download on the</text><text x="198" y="34" fill="#fff" font-family="Arial,sans-serif" font-size="16" font-weight="600">App Store</text></g></svg>`);
const playTogetherBadge = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="175" height="35" viewBox="0 0 175 35"><rect x=".5" y=".5" width="174" height="34" rx="17" fill="#d8ee72"/><circle cx="18" cy="17.5" r="8" fill="#123d32"/><circle cx="15" cy="15" r="2" fill="#d8ee72"/><circle cx="21" cy="15" r="2" fill="#d8ee72"/><path d="M12 21q3-5 6 0 3-5 6 0" fill="none" stroke="#d8ee72" stroke-width="1.5" stroke-linecap="round"/><text x="34" y="22" fill="#10281d" font-family="Arial,sans-serif" font-size="14" font-weight="700">PLAY TOGETHER</text></svg>`);
const stores = [
  { file: 'social-preview-v2.png', title: 'Find your court.', subtitle: 'Courts, games and groups in one place.', badge: 'NOW ON iOS AND ANDROID', shots: [
    resolve(root, 'design/social-originals/app-0.png'),
        resolve(root, 'design/social-originals/app-2.png')
  ] }
];
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
  // Keep the existing city and weather cards intact.
}

// Social launch card: turn real store artwork into three polished device panels.
for (const card of stores) {
  const svg = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#071c15"/><stop offset="1" stop-color="#174b3b"/></linearGradient><radialGradient id="glow"><stop stop-color="#d8ee72" stop-opacity=".2"/><stop offset="1" stop-color="#d8ee72" stop-opacity="0"/></radialGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#00120c" flood-opacity=".55"/></filter></defs><rect width="1200" height="630" fill="url(#bg)"/><circle cx="908" cy="310" r="390" fill="url(#glow)"/><path d="M0 548 Q330 495 620 565 T1200 525V630H0Z" fill="#0b2c21" opacity=".7"/><circle cx="91" cy="83" r="22" fill="none" stroke="#d8ee72" stroke-width="2"/><path d="M79 68q12 8 12 15t-12 15m24-30q-12 8-12 15t12 15" fill="none" stroke="#d8ee72" stroke-width="2"/><text x="128" y="91" fill="#f5f5ed" font-family="Arial,sans-serif" font-size="28" font-weight="700">opencourts</text><rect x="79" y="143" width="260" height="34" rx="17" fill="#d8ee72"/><text x="96" y="165" fill="#10281d" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="1.4">${card.badge}</text><text x="76" y="269" fill="#fffdf3" font-family="Georgia,serif" font-size="58">${card.title}</text><text x="80" y="316" fill="#dce9dd" font-family="Arial,sans-serif" font-size="23">${card.subtitle}</text><rect x="80" y="365" width="145" height="47" rx="23" fill="#143e31" stroke="#9cb899" stroke-opacity=".6"/><circle cx="98" cy="389" r="4" fill="#d8ee72"/><text x="111" y="395" fill="#f3f4eb" font-family="Arial,sans-serif" font-size="15" font-weight="600">Find courts</text><rect x="237" y="365" width="180" height="47" rx="23" fill="#143e31" stroke="#9cb899" stroke-opacity=".6"/><circle cx="255" cy="389" r="4" fill="#d8ee72"/><text x="268" y="395" fill="#f3f4eb" font-family="Arial,sans-serif" font-size="15" font-weight="600">Tennis weather</text><rect x="429" y="365" width="170" height="47" rx="23" fill="#143e31" stroke="#9cb899" stroke-opacity=".6"/><circle cx="447" cy="389" r="4" fill="#d8ee72"/><text x="460" y="395" fill="#f3f4eb" font-family="Arial,sans-serif" font-size="15" font-weight="600">Play Together</text><path d="M80 523h500" stroke="#dce9dd" stroke-opacity=".3"/><text x="80" y="560" fill="#edf1e2" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="2">OPENCOURTS.US</text><g filter="url(#shadow)"><rect x="715" y="92" width="204" height="420" rx="28" fill="#07130f" stroke="#d9e5d3" stroke-opacity=".75" stroke-width="2"/><rect x="945" y="132" width="204" height="420" rx="28" fill="#07130f" stroke="#d9e5d3" stroke-opacity=".75" stroke-width="2"/></g></svg>`);
  const composites = [{ input: svg }];
  const placements = [[725,104,184,396],[955,144,184,396]];
  for (let i = 0; i < card.shots.length; i++) {
    const [left,top,width,height] = placements[i];
    const image = await sharp(card.shots[i]).resize(width,height,{fit:'contain',background:'#07130f'}).png().toBuffer();
    composites.push({input:image,left,top});
  }
  await sharp({create:{width:1200,height:630,channels:3,background:'#09251b'}}).composite(composites).png({compressionLevel:9}).toFile(resolve(root,'public',card.file));
}

// Add the same compact store-badge lockup to every image used by page metadata.
for (const file of socialFiles) {
  const path = resolve(root, 'public', file);
  const input = file === 'social-preview-v2.png' ? path : resolve(root, 'design/social-originals', file);
  const metadata = await sharp(input).metadata();
  const output = resolve(previewDir, file);
  const overlays = [{input:storeBadges,left:file === 'social-preview-v2.png' ? 80 : 852,top:file === 'social-preview-v2.png' ? 448 : 553}];
  if (playTogetherFiles.includes(file)) overlays.push({input:playTogetherBadge,left:1200-175-42,top:630-35-88});
  await sharp(input).composite(overlays).png({compressionLevel:9}).toFile(output);
  const { copyFileSync } = await import('node:fs');
  copyFileSync(output, path);
  if (metadata.width !== 1200 || metadata.height !== 630) throw new Error(`${file} is not 1200x630`);
}
