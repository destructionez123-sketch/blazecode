import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { isValidKeyFormat, saveKey } from "../config/auth.js";

export async function loginCommand(): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
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
  } finally {
    rl.close();
  }
}
