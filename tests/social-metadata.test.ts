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
});
