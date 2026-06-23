import envPaths from "env-paths";
import { join } from "node:path";

const paths = envPaths("blaze", { suffix: "" });

export function configDir(): string {
  return paths.config;
}
export function dataDir(): string {
  return paths.data;
}
export function authFilePath(): string {
  return join(configDir(), "auth.json");
}
export function sessionsDir(): string {
  return join(dataDir(), "sessions");
}
export function globalConfigPath(): string {
  return join(configDir(), "blaze.json");
}
