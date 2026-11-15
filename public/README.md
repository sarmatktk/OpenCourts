# Public site files

Vite copies this directory directly to the root of the built site. A filename here
is therefore part of a public URL. For example:

- `public-tennis-courts-dallas.html` becomes `/public-tennis-courts-dallas.html`
- `landing-dallas.webp` becomes `/landing-dallas.webp`
- `theme.js` becomes `/theme.js`

Do not move existing files into subdirectories only to tidy this folder. Doing so
would change live URLs, cached social-image URLs, tests, and Cloudflare Pages
routing unless a build-time compatibility layer is added first.

## File groups

- Core browser files: `_headers`, `404.html`, `robots.txt`, `sitemap.xml`,
  `site.webmanifest`, `sw.js`
- Shared page assets: `pages.css`, `landing.css`, `theme.js`,
  `landing-analytics.js`
- Utility pages: `about.html`, `contact.html`, `privacy.html`, `support.html`
- Editorial guides: `best-time-to-play-tennis.html`,
  `tennis-courts-after-rain.html`
- City guides: files beginning with `public-tennis-courts-`
- Landing photography: files beginning with `landing-` and ending in `.webp`
- Social previews: files beginning with `social-` and ending in `.png`
- Icons and install assets: `favicon*`, `apple-touch-icon.png`,
  `android-chrome-*`

## Safe future reorganization

The safe long-term cleanup is to place editable sources in a separate organized
directory, generate the current root filenames during the build, and test that
every existing URL remains byte-for-byte reachable. Until that pipeline exists,
the flat public directory is intentional compatibility infrastructure rather than
an arbitrary source layout.
