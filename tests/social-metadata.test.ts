import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pages = [
  ['index.html', 'https://opencourts.us/'],
  ['public/about.html', 'https://opencourts.us/about.html'],
  ['public/contact.html', 'https://opencourts.us/contact.html'],
  ['public/privacy.html', 'https://opencourts.us/privacy.html'],
  ['public/support.html', 'https://opencourts.us/support.html'],
] as const;

describe('social share metadata', () => {
  for (const [file, canonicalUrl] of pages) {
    it(`${file} has a page URL and the shared preview image`, () => {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html).toContain(`property="og:url" content="${canonicalUrl}"`);
      expect(html).toContain('property="og:image" content="https://opencourts.us/social-preview.png"');
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('name="twitter:image" content="https://opencourts.us/social-preview.png"');
    });
  }
  it('describes the court finder and weather planner in crawlable page metadata', () => {
    const home = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const about = readFileSync(resolve(process.cwd(), 'public/about.html'), 'utf8');
    expect(home).toContain('<title>Find Public Tennis Courts');
    expect(home).toContain('name="description" content="Find public tennis courts near you');
    expect(about).toContain('Check recent precipitation near courts');
    expect(about).toContain('Plan with a seven-day playing forecast');
    const jsonLd = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(jsonLd).toBeDefined();
    const graph = JSON.parse(jsonLd!)['@graph'];
    expect(graph.map((item: { '@type': string }) => item['@type'])).toEqual(['WebSite', 'WebApplication']);
    expect(graph[1].offers.price).toBe('0');
  });
  it('serves consistent browser, Apple, and install icons from stable public paths', () => {
    const publicFile = (name: string) => readFileSync(resolve(process.cwd(), 'public', name));
    const favicon = publicFile('favicon.ico');
    const sizes = Array.from({ length: favicon.readUInt16LE(4) }, (_, index) => {
      const offset = 6 + index * 16;
      return [favicon[offset] || 256, favicon[offset + 1] || 256];
    });
    expect(sizes).toContainEqual([48, 48]);
    const pngSize = (name: string) => {
      const image = publicFile(name);
      expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      return [image.readUInt32BE(16), image.readUInt32BE(20)];
    };
    expect(pngSize('apple-touch-icon.png')).toEqual([180, 180]);
    const manifest = JSON.parse(publicFile('site.webmanifest').toString('utf8'));
    expect(manifest.name).toBe('OpenCourts');
    expect(manifest.theme_color).toBe('#123d32');
    for (const icon of manifest.icons) {
      const size = Number(icon.sizes.split('x')[0]);
      expect(pngSize(icon.src.replace(/^\//, ''))).toEqual([size, size]);
    }
    for (const [file] of pages) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html).toContain('rel="icon" type="image/x-icon" href="/favicon.ico"');
      expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
      expect(html).toContain('rel="manifest" href="/site.webmanifest"');
    }
  });
});
