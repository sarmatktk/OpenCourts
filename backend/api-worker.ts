import type { AuthEnv } from '../functions/lib/auth';
import { onRequest as authRequest } from '../functions/api/auth/[[path]]';
import { onRequestGet as courtsGet } from '../functions/api/courts';
import { onRequestGet as suggestionsGet } from '../functions/api/suggest';
import { onRequestGet as geocodeGet } from '../functions/api/geocode';
import { onRequestGet as weatherGet } from '../functions/api/weather';
import { onRequestGet as weatherAlertsGet } from '../functions/api/weather-alerts';
import { onRequestGet as courtContextGet, onRequestPost as courtContextPost } from '../functions/api/court-context';
import { onRequestPost as rainPost } from '../functions/api/rain';
import { onRequest as gamesRequest } from '../functions/api/games/[[path]]';
import { onRequest as playersRequest } from '../functions/api/players/[[path]]';
import { onRequest as groupsRequest } from '../functions/api/groups/[[path]]';
import { onRequest as discussionsRequest } from '../functions/api/discussions/[[path]]';
import { onRequest as mediaRequest } from '../functions/api/media/[[path]]';
import { onRequest as pushRequest } from '../functions/api/push/[[path]]';

type ApiEnv = Env & AuthEnv & {
  GEOAPIFY_API_KEY?: string;
  MODERATOR_PLAYER_IDS?: string;
};

type Execution = {
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
};

type PagesContext = {
  request: Request;
  env: ApiEnv;
  functionPath: string;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
};

function contextFor(request: Request, env: ApiEnv, execution: Execution): PagesContext {
  const path = new URL(request.url).pathname;
  return {
    request,
    env,
    functionPath: path,
    params: {},
    data: {},
    waitUntil: promise => execution.waitUntil(promise),
    passThroughOnException: () => execution.passThroughOnException(),
    next: async () => new Response('Not found.', { status: 404 }),
  };
}

function invoke<T>(handler: (context: T) => Response | Promise<Response>, context: PagesContext) {
  return handler(context as T);
}

function methodNotAllowed(allow: string) {
  return new Response('Method not allowed.', { status: 405, headers: { Allow: allow } });
}

export default {
  async fetch(request: Request, env: ApiEnv, execution: Execution): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const context = contextFor(request, env, execution);

    try {
      if (!path.startsWith('/api/')) return new Response('Not found.', { status: 404 });

      if (path === '/api/auth' || path.startsWith('/api/auth/')) return invoke(authRequest, context);
      if (path === '/api/games' || path.startsWith('/api/games/')) return invoke(gamesRequest, context);
      if (path === '/api/players' || path.startsWith('/api/players/')) return invoke(playersRequest, context);
      if (path === '/api/groups' || path.startsWith('/api/groups/')) return invoke(groupsRequest, context);
      if (path === '/api/discussions' || path.startsWith('/api/discussions/')) return invoke(discussionsRequest, context);
      if (path === '/api/media' || path.startsWith('/api/media/')) return invoke(mediaRequest, context);
      if (path === '/api/push' || path.startsWith('/api/push/')) return invoke(pushRequest, context);

      if (path === '/api/courts') return request.method === 'GET' ? invoke(courtsGet, context) : methodNotAllowed('GET');
      if (path === '/api/suggest') return request.method === 'GET' ? invoke(suggestionsGet, context) : methodNotAllowed('GET');
      if (path === '/api/geocode') return request.method === 'GET' ? invoke(geocodeGet, context) : methodNotAllowed('GET');
      if (path === '/api/weather') return request.method === 'GET' ? invoke(weatherGet, context) : methodNotAllowed('GET');
      if (path === '/api/weather-alerts') return request.method === 'GET' ? invoke(weatherAlertsGet, context) : methodNotAllowed('GET');
      if (path === '/api/court-context') {
        if (request.method === 'GET') return invoke(courtContextGet, context);
        if (request.method === 'POST') return invoke(courtContextPost, context);
        return methodNotAllowed('GET, POST');
      }
      if (path === '/api/rain') return request.method === 'POST' ? invoke(rainPost, context) : methodNotAllowed('POST');

      return new Response('Not found.', { status: 404 });
    } catch {
      console.error('[OpenCourts API Worker] Unhandled request failure', { method: request.method, path });
      return Response.json({ error: 'The request could not be completed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
  },
};
