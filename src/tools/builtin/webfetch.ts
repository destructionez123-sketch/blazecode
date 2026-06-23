import { z } from "zod";
import type { Tool } from "../tool.js";

const MAX_CHARS = 50_000;

const schema = z.object({ url: z.string() });

/**
 * Convert an HTML document to plain text by removing script/style blocks and
 * stripping remaining tags. Exported for unit testing without network access.
 */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, MAX_CHARS);
}

/**
 * Fetch a URL and return its content as plain text. Exposed as a standalone
 * function so it can be unit-tested with an injected fetch implementation.
 */
export async function fetchUrlAsText(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    return `Fetch failed: HTTP ${res.status}`;
  }
  const body = await res.text();
  return htmlToText(body) || "(no content)";
}

export const webfetchTool: Tool<z.infer<typeof schema>> = {
  name: "webfetch",
  description: "Fetch a URL and return its content as plain text.",
  schema,
  permission: "none",
  async execute({ url }) {
    return fetchUrlAsText(url);
  },
};
