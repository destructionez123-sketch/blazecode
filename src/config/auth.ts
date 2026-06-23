import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { authFilePath } from "./paths.js";

export function isValidKeyFormat(key: string): boolean {
  return typeof key === "string" && key.startsWith("blaze-") && key.length > 6;
}

export async function loadKey(): Promise<string | null> {
  const env = process.env.BLAZE_API_KEY;
  if (env && isValidKeyFormat(env)) return env;
  try {
    const raw = await readFile(authFilePath(), "utf8");
    const data = JSON.parse(raw) as { key?: string };
    return data.key && isValidKeyFormat(data.key) ? data.key : null;
  } catch {
    return null;
  }
}

export async function saveKey(key: string): Promise<void> {
  const path = authFilePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ key }, null, 2), { mode: 0o600 });
}
