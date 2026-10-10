type PagesFunction<
  Env = unknown,
  Path extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env & { ASSETS: { fetch: typeof fetch } };
  params: Record<Path, string | string[]>;
  data: Data;
}) => Response | Promise<Response>;

interface CacheStorage {
  default: Cache;
}
