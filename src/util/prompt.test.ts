import { describe, it, expect } from "vitest";
import { promptHidden, type MutableReadline } from "./prompt.js";
import { PassThrough } from "node:stream";

describe("promptHidden", () => {
  it("writes the prompt once and resolves with the answer", async () => {
    const output = new PassThrough();
    let written = "";
    output.on("data", (chunk) => {
      written += chunk.toString();
    });

    let askedQuery = "";
    const fakeRl: MutableReadline = {
      question(query, cb) {
        askedQuery = query;
        // simulate the user typing a secret then pressing enter
        cb("blaze-secret-123");
      },
      close() {},
    };

    const answer = await promptHidden("Enter key: ", {
      createInterface: () => fakeRl,
      output,
    });

    expect(answer).toBe("blaze-secret-123");
    // The visible prompt is written, but the question() arg is empty so
    // readline doesn't print it twice.
    expect(written).toContain("Enter key: ");
    expect(askedQuery).toBe("");
  });

  it("suppresses echo of typed characters by muting _writeToOutput", async () => {
    const output = new PassThrough();
    let written = "";
    output.on("data", (chunk) => {
      written += chunk.toString();
    });

    const fakeRl: MutableReadline = {
      question(_query, cb) {
        // Simulate readline trying to echo each typed char *after* muting.
        this._writeToOutput?.("b");
        this._writeToOutput?.("l");
        this._writeToOutput?.("a");
        cb("blaze-xyz");
      },
      close() {},
    };

    const answer = await promptHidden("Key: ", {
      createInterface: () => fakeRl,
      output,
    });

    expect(answer).toBe("blaze-xyz");
    // The secret characters must never reach the output stream.
    expect(written).not.toContain("bla");
    // Only the prompt and the trailing newline should be present.
    expect(written).toBe("Key: \n");
  });
});
