export async function readEdgeCache(cache: Cache | undefined, key: Request): Promise<Response | undefined> {
  if (!cache) return undefined;
  try { return await cache.match(key); }
  catch (error) {
    console.warn('[OpenCourts] Edge cache read failed', error);
    return undefined;
  }
}

export function writeEdgeCache(
  cache: Cache | undefined,
  key: Request,
  response: Response,
  waitUntil?: (promise: Promise<unknown>) => void,
): void {
  if (!cache) return;
  try {
    const write = cache.put(key, response.clone()).catch(error => {
      console.warn('[OpenCourts] Edge cache write failed', error);
    });
    if (waitUntil) waitUntil(write);
    else void write;
  } catch (error) {
    console.warn('[OpenCourts] Edge cache write failed', error);
  }
}
