import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sessionsDir } from "../config/paths.js";
import type { ContentBlock, Message, ToolResult } from "./provider/types.js";

export class Session {
  id: string;
  messages: Message[] = [];
  inputTokens = 0;
  outputTokens = 0;

  constructor(id: string) {
    this.id = id;
  }

  addUser(text: string): void {
    this.messages.push({ role: "user", content: [{ type: "text", text }] });
  }

  addAssistant(content: ContentBlock[]): void {
    this.messages.push({ role: "assistant", content });
  }

  addToolResults(results: ToolResult[]): void {
    const content: ContentBlock[] = results.map((result) => ({
      type: "tool_result",
      result,
    }));
    this.messages.push({ role: "user", content });
  }

  addUsage(input: number, output: number): void {
    this.inputTokens += input;
    this.outputTokens += output;
  }

  async save(): Promise<void> {
    const dir = sessionsDir();
    await mkdir(dir, { recursive: true });
    const data = {
      id: this.id,
      messages: this.messages,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
    await writeFile(
      join(dir, `${this.id}.json`),
      JSON.stringify(data, null, 2),
      "utf8",
    );
  }

  static async load(id: string): Promise<Session> {
    const raw = await readFile(join(sessionsDir(), `${id}.json`), "utf8");
    const data = JSON.parse(raw) as {
      id: string;
      messages: Message[];
      inputTokens: number;
      outputTokens: number;
    };
    const session = new Session(data.id);
    session.messages = data.messages;
    session.inputTokens = data.inputTokens;
    session.outputTokens = data.outputTokens;
    return session;
  }
}
