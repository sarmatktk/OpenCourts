import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const landingPages = [
  ['best-time-to-play-tennis.html', 'social-play-weather.png'],
  ['tennis-courts-after-rain.html', 'social-after-rain.png'],
  ['public-tennis-courts-fairfax-va.html', 'social-fairfax-courts.png'],
  ['public-tennis-courts-los-angeles.html', 'social-los-angeles-courts.png'],
  ['public-tennis-courts-atlanta.html', 'social-atlanta-courts.png'],
  ['public-tennis-courts-dallas.html', 'social-dallas-courts.png'],
  ['public-tennis-courts-miami.html', 'social-miami-courts.png'],
] as const;

const pages = [
  ['index.html', 'https://opencourts.us/'],
  ['public/about.html', 'https://opencourts.us/about'],
  ['public/contact.html', 'https://opencourts.us/contact'],
  ['public/privacy.html', 'https://opencourts.us/privacy'],
  ['public/support.html', 'https://opencourts.us/support'],
] as const;

describe('social share metadata', () => {
  it('gives each landing page a distinct, correctly sized preview and shared site icons', () => {
    for (const [file, imageName] of landingPages) {
      const html = readFileSync(resolve(process.cwd(), 'public', file), 'utf8');
      const url = `https://opencourts.us/${file.replace(/\.html$/, '')}`;
      const imageUrl = `https://opencourts.us/${imageName}`;
      expect(html).toContain(`rel="canonical" href="${url}"`);
      expect(html).toContain(`property="og:url" content="${url}"`);
      expect(html).toContain(`property="og:image" content="${imageUrl}"`);
      expect(html).toContain(`name="twitter:image" content="${imageUrl}"`);
      expect(html).toContain('rel="icon" type="image/x-icon" href="/favicon.ico"');
      expect(html).toContain('rel="manifest" href="/site.webmanifest"');
      expect(html).toContain('src="/theme.js"');
      expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-7T3S2D1410');
      expect(html).toContain("gtag('config', 'G-7T3S2D1410')");
      expect(html).toContain('src="/landing-analytics.js"');
      expect((html.match(/data-analytics-event="landing_cta_click"/g) || []).length).toBe(2);
      const image = readFileSync(resolve(process.cwd(), 'public', imageName));
      expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([1200, 630]);
      expect(image.length, `${imageName} should remain below 1 MB`).toBeLessThan(1_000_000);
    }
  });
  it('tracks landing actions and preserves the Fairfax destination without changing the main page', () => {
    const tracking = readFileSync(resolve(process.cwd(), 'public/landing-analytics.js'), 'utf8');
    const fairfax = readFileSync(resolve(process.cwd(), 'public/public-tennis-courts-fairfax-va.html'), 'utf8');
    expect(tracking).toContain("window.gtag('event'");
    expect(tracking).toContain('landing_page: window.location.pathname');
    expect(fairfax).toContain('data-city-preset="fairfax-va"');
    expect(fairfax).toContain('href="/#explore"');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const slug of ['van-dyck', 'providence', 'greenbriar']) {
      expect(fairfax).toContain(`href="/?park=${slug}#explore"`);
      expect(app).toContain(`'${slug}': { label:`);
    }
    expect((fairfax.match(/class="landing-park-link"/g) || []).length).toBe(3);
    expect((fairfax.match(/class="landing-source-link"/g) || []).length).toBe(3);
    expect(fairfax).toContain('<h1>Find public tennis courts around Fairfax.</h1>');
    expect(fairfax).toContain('rel="preload" as="image" type="image/webp" href="/landing-fairfax.webp"');
    const jsonLd = fairfax.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    const graph = JSON.parse(jsonLd!)['@graph'];
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'FAQPage')).toBe(true);
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'BreadcrumbList')).toBe(true);
  });
  it('deep-links Los Angeles facilities and includes matching FAQ structured data', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/public-tennis-courts-los-angeles.html'), 'utf8');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const slug of ['echo-park-la', 'mar-vista-la', 'riverside-la']) {
      expect(html).toContain(`href="/?park=${slug}#explore"`);
      expect(app).toContain(`'${slug}': { label:`);
    }
    expect(html).toContain('href="https://locator.lacounty.gov/lac/Location/3178778/echo-park-recreation-center"');
    expect(html).toContain('href="https://recreation.parks.lacity.gov/reccenter/mar-vista"');
    expect(html).not.toContain('href="https://recreation.parks.lacity.gov/reccenter/echo-park"');
    expect(html).not.toContain('/reccenter/echo-park-recreation-center');
    expect(html).not.toContain('/reccenter/mar-vista-recreation-center');
    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    const graph = JSON.parse(jsonLd!)['@graph'];
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'FAQPage')).toBe(true);
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'BreadcrumbList')).toBe(true);
    expect(app).toContain("m.setPaintProperty('osm-raster', 'raster-brightness-max', dark ? 0.6 : 1)");
  });
  it('makes the Los Angeles guide indexable, branded, measurable, and image-rich', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/public-tennis-courts-los-angeles.html'), 'utf8');
    expect(html).toContain('<h1>Find public tennis courts in Los Angeles.</h1>');
    expect(html).toContain('name="robots" content="index, follow, max-image-preview:large');
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
    expect(html).toContain('rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"');
    expect(html).toContain('rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"');
    expect(html).toContain('name="twitter:image:alt"');
    expect(html).toContain('rel="preload" as="image" type="image/webp" href="/landing-los-angeles.webp"');
    expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-7T3S2D1410');
    expect(html).toContain("gtag('config', 'G-7T3S2D1410')");
    expect(html).toContain('src="/landing-analytics.js"');
  });
  it('deep-links Atlanta facilities and explains park courts versus racquet centers', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/public-tennis-courts-atlanta.html'), 'utf8');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const slug of ['grant-park-atlanta', 'east-lake-park-atlanta', 'washington-park-atlanta']) {
      expect(html).toContain(`href="/?park=${slug}#explore"`);
      expect(app).toContain(`'${slug}': { label:`);
    }
    expect(html).toContain('<h1>Find public tennis courts in Atlanta.</h1>');
    expect(html).toContain('data-city-preset="atlanta-ga"');
    expect(html).toContain('https://www.atlantaga.gov/government/departments/department-parks-recreation/office-of-parks/list-of-tennis-courts');
    expect(html).toContain('https://www.atlantaga.gov/government/departments/department-parks-recreation/office-of-parks/city-of-atlanta-tennis');
    expect(html).toContain('rel="preload" as="image" type="image/webp" href="/landing-atlanta.webp"');
    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    const graph = JSON.parse(jsonLd!)['@graph'];
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'FAQPage')).toBe(true);
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'BreadcrumbList')).toBe(true);
  });
  it('deep-links Dallas public centers without describing them as free courts', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/public-tennis-courts-dallas.html'), 'utf8');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const slug of ['samuell-grand-dallas', 'fretz-dallas', 'lb-houston-dallas']) {
      expect(html).toContain(`href="/?park=${slug}#explore"`);
      expect(app).toContain(`'${slug}': { label:`);
    }
    expect(html).toContain('<h1>Find public tennis courts in Dallas.</h1>');
    expect(html).toContain('data-city-preset="dallas-tx"');
    expect(html).toContain('Public does not automatically mean free');
    expect(html).toContain('https://www.dallasparks.org/281/Tennis-Centers');
    expect(html).toContain('rel="preload" as="image" type="image/webp" href="/landing-dallas.webp"');
    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    const graph = JSON.parse(jsonLd!)['@graph'];
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'FAQPage')).toBe(true);
  });
  it('keeps the Miami guide within City of Miami jurisdiction', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/public-tennis-courts-miami.html'), 'utf8');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const slug of ['margaret-pace-miami', 'shenandoah-miami', 'morningside-miami']) {
      expect(html).toContain(`href="/?park=${slug}#explore"`);
      expect(app).toContain(`'${slug}': { label:`);
    }
    expect(html).toContain('<h1>Find public tennis courts in Miami.</h1>');
    expect(html).toContain('data-city-preset="miami-fl"');
    expect(html).toContain('Miami Beach and Miami-Dade County run separate park systems');
    expect(html).toContain('rel="preload" as="image" type="image/webp" href="/landing-miami.webp"');
    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(JSON.parse(jsonLd!)['@graph'].some((item: { '@type': string }) => item['@type'] === 'FAQPage')).toBe(true);
  });
  it('restores every main-page anchor after asynchronous court and weather layout changes', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const target of ['top', 'search', 'explore', 'rain-planner-title', 'conditions', 'about', 'support']) {
      expect(app).toContain(`'${target}'`);
    }
    expect(app).toContain('}, [loading, weatherLoading]);');
    expect(app).toContain('<div id="top" className={dark');
  });
  it('uses the same main navigation contract on every landing page', () => {
    const expected = [
      ['Explore courts', '/#explore', 'explore'],
      ['Weather', '/#conditions', 'weather'],
      ['About', '/#about', 'about'],
      ['Support', '/#support', 'support'],
    ] as const;
    for (const [file] of landingPages) {
      const html = readFileSync(resolve(process.cwd(), 'public', file), 'utf8');
      const nav = html.match(/<nav id="landing-nav"[\s\S]*?<\/nav>/)?.[0];
      expect(nav, `${file} main navigation`).toBeDefined();
      for (const [label, href, analyticsLabel] of expected) {
        expect(nav).toContain(`href="${href}"`);
        expect(nav).toContain(`data-analytics-label="${analyticsLabel}">${label}</a>`);
      }
    }
  });
  it('uses the location-target icon and label on every landing-page Near me control', () => {
    for (const [file] of landingPages) {
      const html = readFileSync(resolve(process.cwd(), 'public', file), 'utf8');
      const control = html.match(/<button[^>]*data-near-me[\s\S]*?<\/button>/)?.[0];
      expect(control, `${file} Near me control`).toBeDefined();
      expect(control).toContain('<svg');
      expect(control).toContain('<circle cx="12" cy="12" r="7"');
      expect(control).toContain('<circle cx="12" cy="12" r="3"');
      expect(control).toContain('<span>Near me</span>');
    }
  });
  it('uses optimized page photography and clear links on all landing pages', () => {
    const photos = ['landing-weather.webp', 'landing-after-rain.webp', 'landing-fairfax.webp', 'landing-los-angeles.webp', 'landing-atlanta.webp', 'landing-dallas.webp', 'landing-miami.webp'];
    for (const [index, [file]] of landingPages.entries()) {
      const html = readFileSync(resolve(process.cwd(), 'public', file), 'utf8');
      const photo = readFileSync(resolve(process.cwd(), 'public', photos[index]));
      expect(html).toContain(`src="/${photos[index]}"`);
      expect(photo.subarray(8, 12).toString('ascii')).toBe('WEBP');
      expect(html).not.toMatch(/↗|→/);
    }
  });
  for (const [file, canonicalUrl] of pages) {
    it(`${file} has a page URL and the shared preview image`, () => {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html).toContain(`property="og:url" content="${canonicalUrl}"`);
      expect(html).toContain('property="og:image" content="https://opencourts.us/social-preview.png"');
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('name="twitter:image" content="https://opencourts.us/social-preview.png"');
    });
  }
  it('lists only direct canonical page URLs in the sitemap and internal links', () => {
    const allPages = [...pages.map(([file, url]) => [file, url]), ...landingPages.map(([file]) => [`public/${file}`, `https://opencourts.us/${file.replace(/\.html$/, '')}`])];
    const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(sitemapUrls.sort()).toEqual(allPages.map(([, url]) => url).sort());
    for (const [file, url] of allPages) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html).toContain(`rel="canonical" href="${url}"`);
      expect(html).toContain(`property="og:url" content="${url}"`);
      expect(html).not.toMatch(/href="\/[a-z-]+\.html"/);
    }
  });
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
