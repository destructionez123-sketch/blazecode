import { describe, it, expect } from "vitest";
import { htmlToText, fetchUrlAsText } from "./webfetch.js";

describe("htmlToText", () => {
  it("strips script blocks", () => {
    const out = htmlToText("<p>hello</p><script>var x = 1;</script><p>world</p>");
    expect(out).toContain("hello");
    expect(out).toContain("world");
    expect(out).not.toContain("var x");
  });

  it("strips style blocks", () => {
    const out = htmlToText("<style>.a{color:red}</style><p>visible</p>");
    expect(out).toContain("visible");
    expect(out).not.toContain("color:red");
  });

  it("strips html tags leaving text", () => {
    const out = htmlToText("<div><a href='x'>link</a> text</div>");
    expect(out).toContain("link");
    expect(out).toContain("text");
    expect(out).not.toContain("<a");
    expect(out).not.toContain("href");
  });

  it("truncates to ~50000 chars", () => {
    const big = "<p>" + "a".repeat(100000) + "</p>";
    const out = htmlToText(big);
    expect(out.length).toBeLessThanOrEqual(50000);
  });
});

describe("fetchUrlAsText", () => {
  it("returns a friendly error when the response is not ok", async () => {
    const fakeFetch = (async () =>
      new Response("not found", { status: 404 })) as unknown as typeof fetch;
    const out = await fetchUrlAsText("http://x", fakeFetch);
    expect(out).toBe("Fetch failed: HTTP 404");
  });

  it("returns stripped text for an ok response", async () => {
    const fakeFetch = (async () =>
      new Response("<p>hello</p>", { status: 200 })) as unknown as typeof fetch;
    const out = await fetchUrlAsText("http://x", fakeFetch);
    expect(out).toContain("hello");
  });
});
