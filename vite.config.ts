import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
const pagesApiDev = {
  name: 'opencourts-pages-api-dev',
  configureServer(server: any) {
    const localEnv = loadEnv(server.config.mode, server.config.envDir, '');
    const internationalCache = new Map<string, { expires: number; status: number; body: string; headers: [string, string][] }>();
    server.middlewares.use(async (req: any, res: any, next: (err?: unknown) => void) => {
      try {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        if (url.pathname === '/api/players' || url.pathname.startsWith('/api/players/') || url.pathname.startsWith('/api/auth/') || url.pathname === '/api/games' || url.pathname.startsWith('/api/games/') || url.pathname === '/api/groups' || url.pathname.startsWith('/api/groups/')) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'private, no-store');
          res.end(JSON.stringify({ error: 'Use the local Pages server for accounts and games (npm run build:dev, then npm run dev:pages).' }));
          return;
        }
        // Local handlers never forward requests to the production website.
        const country = url.searchParams.get('country')?.toLowerCase();
        const international = Boolean(country && country !== 'us');
        const internationalWeather = url.pathname === '/api/weather' && url.searchParams.get('provider') === 'met';
        const cacheable = req.method === 'GET' && ((international && url.pathname === '/api/courts') || internationalWeather);
        const cached = cacheable ? internationalCache.get(url.href) : undefined;
        if (cached && cached.expires > Date.now()) {
          res.statusCode = cached.status;
          cached.headers.forEach(([name, value]) => res.setHeader(name, value));
          res.end(cached.body); return;
        }
        const endpoint = url.pathname === '/api/courts' ? '/functions/api/courts.ts' : url.pathname === '/api/court-context' ? '/functions/api/court-context.ts' : url.pathname === '/api/weather' ? '/functions/api/weather.ts' : url.pathname === '/api/weather-alerts' ? '/functions/api/weather-alerts.ts' : url.pathname === '/api/geocode' ? '/functions/api/geocode.ts' : url.pathname === '/api/suggest' ? '/functions/api/suggest.ts' : url.pathname === '/api/rain' ? '/functions/api/rain.ts' : null;
        if (!endpoint) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Unknown local API endpoint.' })); return; }
        const module = await server.ssrLoadModule(endpoint);
        const body = req.method !== 'GET' && req.method !== 'HEAD' ? await new Promise<string>((resolve, reject) => { let value = ''; req.setEncoding('utf8'); req.on('data', (chunk: string) => { value += chunk; }); req.on('end', () => resolve(value)); req.on('error', reject); }) : undefined;
        const request = new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body ? { body } : {}) });
        const handler = req.method === 'POST' ? module.onRequestPost : req.method === 'GET' ? module.onRequestGet : undefined;
        if (typeof handler !== 'function') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed.' })); return; }
        const env = international || internationalWeather ? { LOCAL_DEV: true, WEATHERAPI_KEY: localEnv.WEATHERAPI_KEY, GEOAPIFY_API_KEY: localEnv.GEOAPIFY_API_KEY } : { LOCAL_DEV: true };
        const response = await handler({ request, env, waitUntil(promise: Promise<unknown>) { void promise.catch(() => undefined); }, passThroughOnException() {} });
        res.statusCode = response.status;
        response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
        const text = await response.text();
        if (cacheable && response.ok && !response.headers.get('cache-control')?.includes('no-store')) {
          if (internationalCache.size >= 100) internationalCache.delete(internationalCache.keys().next().value!);
          internationalCache.set(url.href, { expires: Date.now() + (internationalWeather ? 30 * 60_000 : 6 * 60 * 60_000), status: response.status, body: text, headers: [...response.headers.entries()] });
        }
        res.end(text);
      } catch (error) { next(error); }
    });
  }
};
export default defineConfig({ server:{watch:{ignored:['**/.wrangler/**','**/test-results/**','**/playwright-report/**']}}, plugins: [react(), pagesApiDev] });
