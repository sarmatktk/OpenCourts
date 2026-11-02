import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const pagesApiDev = {
  name: 'opencourts-pages-api-dev',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: (err?: unknown) => void) => {
      try {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        // Vite does not provide the production D1 binding. Use the same court
        // catalog as the iOS app so local list and map counts match production.
        if (url.pathname === '/api/courts' && req.method === 'GET') {
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
        const response = await handler({ request, env: { LOCAL_DEV: true }, waitUntil() {}, passThroughOnException() {} });
        res.statusCode = response.status;
        response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
        res.end(await response.text());
      } catch (error) { next(error); }
    });
  }
};
export default defineConfig({ plugins: [react(), pagesApiDev] });
