interface PreviewApiEnv {
  API_WORKER_PREVIEW?: { fetch(request: Request): Promise<Response> };
  API_WORKER_PREVIEW_ENABLED?: string;
  AUTH_ORIGIN?: string;
  CF_PAGES_BRANCH?: string;
}

const PREVIEW_ORIGIN = 'https://feature-play-together.opencourts.pages.dev';

export const onRequest: PagesFunction<PreviewApiEnv> = async ({ request, env, next }) => {
  const { pathname, origin } = new URL(request.url);
  if (!pathname.startsWith('/api/')) return next();

  const isFeaturePreview =
    env.API_WORKER_PREVIEW_ENABLED === 'true' &&
    env.AUTH_ORIGIN === PREVIEW_ORIGIN &&
    origin === PREVIEW_ORIGIN &&
    env.CF_PAGES_BRANCH !== 'main';

  if (!isFeaturePreview) return next();

  if (!env.API_WORKER_PREVIEW) {
    return Response.json(
      { error: 'The Preview API service is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return env.API_WORKER_PREVIEW.fetch(request);
};
