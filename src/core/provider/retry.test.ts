import { describe, it, expect } from "vitest";
import { fetchWithRetry } from "./retry.js";

function makeResponse(status: number): Response {
  return new Response(status === 200 ? "ok" : "err", { status });
}

describe("fetchWithRetry", () => {
  it("retries transient 503s then returns the eventual 200", async () => {
    const statuses = [503, 503, 200];
    let calls = 0;
    const fetchImpl = (async () => {
      const status = statuses[calls] ?? 200;
      calls++;
      return makeResponse(status);
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry(
      "http://x",
      {},
      { baseDelayMs: 1, retries: 3, fetchImpl },
    );

    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  it("does not retry on a non-transient 400", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return makeResponse(400);
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry(
      "http://x",
      {},
      { baseDelayMs: 1, retries: 3, fetchImpl },
    );

    expect(res.status).toBe(400);
    expect(calls).toBe(1);
  });

  it("returns the last non-ok response after exhausting retries", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return makeResponse(429);
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry(
      "http://x",
      {},
      { baseDelayMs: 1, retries: 2, fetchImpl },
    );

    expect(res.status).toBe(429);
    expect(calls).toBe(3); // initial + 2 retries
  });

  it("retries when fetch throws then returns the eventual 200", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls < 3) throw new Error("ECONNRESET");
      return makeResponse(200);
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry(
      "http://x",
      {},
      { baseDelayMs: 1, retries: 3, fetchImpl },
    );

    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  it("rejects after exhausting retries when fetch always throws", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    await expect(
      fetchWithRetry("http://x", {}, { baseDelayMs: 1, retries: 2, fetchImpl }),
    ).rejects.toThrow("ECONNRESET");
    expect(calls).toBe(3); // initial + 2 retries
  });

  it("does not retry a thrown error when the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    await expect(
      fetchWithRetry(
        "http://x",
        { signal: controller.signal },
        { baseDelayMs: 1, retries: 3, fetchImpl },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1); // initial attempt only, no retry
  });
});
