export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<{ event?: string; data: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  /** Parse a single SSE event block (lines separated by \n) into an event. */
  function parseEventBlock(
    chunk: string,
  ): { event?: string; data: string } | null {
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return null;
    return { event, data: dataLines.join("\n") };
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseEventBlock(chunk);
        if (parsed) yield parsed;
      }
    }
    // Flush any remaining complete event left in the buffer (stream ended
    // without a trailing blank line).
    if (buffer.trim() !== "") {
      const parsed = parseEventBlock(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}
