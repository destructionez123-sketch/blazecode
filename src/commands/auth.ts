import { promptHidden } from "../util/prompt.js";
import { isValidKeyFormat, saveKey } from "../config/auth.js";

export async function loginCommand(): Promise<void> {
  const answer = await promptHidden(
    "Paste your BlazeAPI Premium key (blaze-...): ",
  );
  const key = answer.trim();
  if (!isValidKeyFormat(key)) {
    console.error("Invalid key format. Keys must start with `blaze-`.");
    process.exitCode = 1;
    return;
  }
  await saveKey(key);
  console.log("Saved.");
}
