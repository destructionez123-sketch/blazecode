const TRANSIENT_STATUSES = new Set([429, 502, 503]);

export interface FetchWithRetryOptions {
  retries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    }
  });
}

/**
 * Fetch with bounded exponential-backoff retry for transient HTTP statuses
 * (429, 502, 503). Returns the response as soon as it is ok, or the last
 * (non-ok) response once retries are exhausted so the caller can handle it.
 * Honors an AbortSignal passed via `init.signal`.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchWithRetryOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const signal = (init.signal ?? null) as AbortSignal | null;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Backoff before a retry; bail immediately if aborted.
      if (signal?.aborted) break;
      await delay(baseDelayMs * 2 ** (attempt - 1), signal);
      if (signal?.aborted) break;
    }

    let res: Response;
    try {
      res = await fetchImpl(url, init);
    } catch (err) {
      // Network-level failure (DNS/ECONNRESET/TLS). Retry unless aborted or
      // out of attempts.
      lastError = err;
      if (signal?.aborted) throw err;
      if (attempt >= retries) throw err;
      continue;
    }

    if (res.ok) return res;
    if (!TRANSIENT_STATUSES.has(res.status)) return res;
    if (signal?.aborted) return res;
    if (attempt >= retries) return res;
  }

  // Only reachable when the loop broke early due to an aborted signal after a
  // thrown error.
  throw lastError ?? new Error("fetchWithRetry: aborted");
}
