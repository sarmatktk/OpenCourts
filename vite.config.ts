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
        // Vite does not provide the production D1 binding. Use the same court
        // catalog as the iOS app so local list and map counts match production.
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
        if (url.pathname === '/api/courts' && req.method === 'GET' && !international) {
          try {
            const upstream = await fetch(`https://opencourts.us/api/courts${url.search}`, { signal: AbortSignal.timeout(12000) });
            if (upstream.ok && upstream.headers.get('content-type')?.includes('application/json')) {
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(await upstream.text());
              return;
            }
          } catch { /* Fall back to the local Pages function below. */ }
        }
        const endpoint = url.pathname === '/api/courts' ? '/functions/api/courts.ts' : url.pathname === '/api/court-context' ? '/functions/api/court-context.ts' : url.pathname === '/api/weather' ? '/functions/api/weather.ts' : url.pathname === '/api/weather-alerts' ? '/functions/api/weather-alerts.ts' : url.pathname === '/api/geocode' ? '/functions/api/geocode.ts' : url.pathname === '/api/suggest' ? '/functions/api/suggest.ts' : url.pathname === '/api/rain' ? '/functions/api/rain.ts' : null;
        if (!endpoint) return next();
        const module = await server.ssrLoadModule(endpoint);
        const body = req.method !== 'GET' && req.method !== 'HEAD' ? await new Promise<string>((resolve, reject) => { let value = ''; req.setEncoding('utf8'); req.on('data', (chunk: string) => { value += chunk; }); req.on('end', () => resolve(value)); req.on('error', reject); }) : undefined;
        const request = new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body ? { body } : {}) });
        const handler = req.method === 'POST' ? module.onRequestPost : module.onRequestGet;
        const env = international || internationalWeather ? { LOCAL_DEV: true, WEATHERAPI_KEY: localEnv.WEATHERAPI_KEY, GEOAPIFY_API_KEY: localEnv.GEOAPIFY_API_KEY } : { LOCAL_DEV: true };
        let response = await handler({ request, env, waitUntil() {}, passThroughOnException() {} });
        // The deployed API remains an outage fallback for international local
        // development, rather than masking changes to the local court handler.
        if (international && url.pathname === '/api/courts' && !response.ok) {
          try {
            const upstream = await fetch(`https://opencourts.us/api/courts${url.search}`, { signal: AbortSignal.timeout(12000) });
            if (upstream.ok && upstream.headers.get('content-type')?.includes('application/json')) {
              // fetch already decompresses upstream bodies. Forward only the
              // JSON headers so the browser does not try to decompress twice.
              response = new Response(await upstream.text(), { status: upstream.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
            }
          } catch { /* Preserve the local handler's diagnostic response. */ }
        }
        res.statusCode = response.status;
        response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
        const text = await response.text();
        if (cacheable && response.ok) {
          if (internationalCache.size >= 100) internationalCache.delete(internationalCache.keys().next().value!);
          internationalCache.set(url.href, { expires: Date.now() + (internationalWeather ? 30 * 60_000 : 6 * 60 * 60_000), status: response.status, body: text, headers: [...response.headers.entries()] });
        }
        res.end(text);
      } catch (error) { next(error); }
    });
  }
};
export default defineConfig({ plugins: [react(), pagesApiDev] });
