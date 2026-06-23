import { useEffect, useRef, useState } from "react";
import { Box, useInput } from "ink";
import type { EventBus } from "../core/events.js";
import type { PermissionDecision } from "./components/PermissionPrompt.js";
import { StatusBar } from "./components/StatusBar.js";
import { ThinkingPanel } from "./components/ThinkingPanel.js";
import { PermissionPrompt } from "./components/PermissionPrompt.js";
import { Input } from "./components/Input.js";
import { Transcript, type TranscriptItem } from "./components/Transcript.js";

export interface AppPermissionRequest {
  tool: string;
  detail: string;
  onDecide: (d: PermissionDecision) => void;
}

export interface AppProps {
  bus: EventBus;
  model: string;
  cwd: string;
  branch?: string;
  onSubmit: (text: string) => void;
  permissionRequest?: AppPermissionRequest;
  thinkingCollapsed?: boolean;
}

export function App({
  bus,
  model,
  cwd,
  branch,
  onSubmit,
  permissionRequest,
  thinkingCollapsed,
}: AppProps) {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [liveText, setLiveText] = useState("");
  const liveTextRef = useRef("");
  const [thinking, setThinking] = useState("");
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [collapsed, setCollapsed] = useState(thinkingCollapsed ?? true);

  useInput((input, key) => {
    if (key.ctrl && input === "t") {
      setCollapsed((c) => !c);
    }
  });

  useEffect(() => {
    const unsubscribe = bus.on((e) => {
      switch (e.type) {
        case "text_delta":
          liveTextRef.current += e.text;
          setLiveText(liveTextRef.current);
          break;
        case "thinking_delta":
          setThinking((t) => t + e.text);
          break;
        case "tool_start":
          setItems((prev) => [
            ...prev,
            { kind: "tool", name: e.name, input: e.input, _id: e.id } as TranscriptItem & {
              _id: string;
            },
          ]);
          break;
        case "tool_end":
          setItems((prev) =>
            prev.map((item) =>
              (item as { _id?: string })._id === e.id
                ? { ...item, output: e.output, isError: e.isError }
                : item,
            ),
          );
          break;
        case "usage":
          setInputTokens((n) => n + e.inputTokens);
          setOutputTokens((n) => n + e.outputTokens);
          break;
        case "turn_end": {
          const buffer = liveTextRef.current;
          if (buffer) {
            setItems((prev) => [...prev, { kind: "assistant", text: buffer }]);
          }
          liveTextRef.current = "";
          setLiveText("");
          setThinking("");
          break;
        }
        case "error":
          setItems((prev) => [...prev, { kind: "error", message: e.message }]);
          break;
      }
    });
    return unsubscribe;
  }, [bus]);

  const transcriptItems: TranscriptItem[] = liveText
    ? [...items, { kind: "assistant", text: liveText }]
    : items;

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column">
        <Transcript items={transcriptItems} />
      </Box>
      <ThinkingPanel text={thinking} collapsed={collapsed} />
      {permissionRequest ? (
        <PermissionPrompt
          tool={permissionRequest.tool}
          detail={permissionRequest.detail}
          onDecide={permissionRequest.onDecide}
        />
      ) : null}
      <StatusBar
        model={model}
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        cwd={cwd}
        branch={branch}
      />
      {permissionRequest ? null : <Input onSubmit={onSubmit} />}
    </Box>
  );
}
