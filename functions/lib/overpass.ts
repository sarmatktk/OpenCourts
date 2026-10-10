type OverpassResponse = { elements?: unknown[]; remark?: string };

export class OverpassUnavailableError extends Error {
  constructor(
    message: string,
    readonly failures: string[],
    readonly status?: number,
  ) {
    super(message);
    this.name = 'OverpassUnavailableError';
  }
}

/**
 * Race at most two public Overpass instances at a time. A fast complete result
 * wins; another pair is tried only if both providers in the current pair fail.
 */
export async function queryOverpass(
  endpoints: string[],
  query: string,
  timeoutMs: number,
): Promise<OverpassResponse> {
  const failures: string[] = [];
  let lastStatus: number | undefined;

  for (let start = 0; start < endpoints.length; start += 2) {
    const providers = endpoints.slice(start, start + 2);
    const controllers = providers.map(() => new AbortController());
    const attempts = providers.map(async (endpoint, index) => {
      const controller = controllers[index];
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'OpenCourts.us/1.0 (public tennis court discovery)',
          },
          body: new URLSearchParams({ data: query }),
          signal: controller.signal,
        });
        if (!response.ok) {
          lastStatus = response.status;
          await response.body?.cancel().catch(() => undefined);
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json() as OverpassResponse;
        if (!Array.isArray(data.elements) || data.remark) {
          throw new Error(data.remark || 'Invalid response from provider');
        }
        return data;
      } catch (error) {
        const reason = controller.signal.aborted ? 'request timed out' : error instanceof Error ? error.message : 'request failed';
        failures.push(`${new URL(endpoint).host}: ${reason}`);
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    });

    try {
      const result = await Promise.any(attempts);
      controllers.forEach(controller => controller.abort());
      return result;
    } catch {
      controllers.forEach(controller => controller.abort());
    }
  }

  throw new OverpassUnavailableError('All Overpass providers failed.', failures, lastStatus);
}
