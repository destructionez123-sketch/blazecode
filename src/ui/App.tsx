import { useEffect, useRef, useState } from "react";
import { Box, useInput } from "ink";
import type { EventBus } from "../core/events.js";
import type { PermissionDecision } from "./components/PermissionPrompt.js";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { ThinkingPanel } from "./components/ThinkingPanel.js";
import { PermissionPrompt } from "./components/PermissionPrompt.js";
import { Input } from "./components/Input.js";
import { SlashPalette, type PaletteItem } from "./components/SlashPalette.js";
import { filterPalette } from "./components/SlashPalette.js";
import { Transcript, type TranscriptItem } from "./components/Transcript.js";
import { Welcome } from "./components/Welcome.js";
import { StatusLine } from "./components/StatusLine.js";
import type { MascotMood } from "./mascot.js";
import { parseSlash, KNOWN_SLASH_COMMANDS } from "../ui/slash.js";

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
  commands?: PaletteItem[];
}

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  model: "switch the active model",
  think: "toggle extended thinking",
  clear: "clear the transcript",
  agents: "list available sub-agents",
  mcp: "connected MCP servers",
  skills: "available skills",
  resume: "resume a session",
  help: "all commands",
};

/** Default palette derived from the known slash commands. */
function defaultCommands(): PaletteItem[] {
  return KNOWN_SLASH_COMMANDS.map((cmd) => ({
    cmd: "/" + cmd,
    desc: COMMAND_DESCRIPTIONS[cmd] ?? "",
  }));
}

/**
 * Decide whether a submitted line should appear as a user transcript item.
 * Slash commands (parseSlash !== null) are forwarded but never shown.
 */
export function shouldShowAsUser(text: string): boolean {
  return parseSlash(text) === null;
}

export function App({
  bus,
  model,
  cwd,
  branch,
  onSubmit,
  permissionRequest,
  thinkingCollapsed,
  commands,
}: AppProps) {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [liveText, setLiveText] = useState("");
  const liveTextRef = useRef("");
  const [thinking, setThinking] = useState("");
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [collapsed, setCollapsed] = useState(thinkingCollapsed ?? true);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Run state derived from the bus: drives the live StatusLine + mascot mood.
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<MascotMood>("idle");
  const [phase, setPhase] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const busyRef = useRef(false);

  const paletteItems = commands ?? defaultCommands();
  const paletteOpen = query.startsWith("/");
  const filtered = paletteOpen ? filterPalette(paletteItems, query) : [];

  useInput((input, key) => {
    if (key.ctrl && input === "t") {
      setCollapsed((c) => !c);
      return;
    }
    if (!paletteOpen || filtered.length === 0) return;
    if (key.upArrow) {
      setSelectedIndex((s) => (s + filtered.length - 1) % filtered.length);
    } else if (key.downArrow) {
      setSelectedIndex((s) => (s + 1) % filtered.length);
    } else if (key.tab) {
      const choice = filtered[Math.min(selectedIndex, filtered.length - 1)];
      if (choice) setQuery(choice.cmd + " ");
    }
  });

  useEffect(() => {
    const startTurn = () => {
      if (!busyRef.current) {
        busyRef.current = true;
        setBusy(true);
        const now = Date.now();
        setStartedAt(now);
        setElapsedMs(0);
      }
    };
    const endTurn = (finalMood: MascotMood) => {
      busyRef.current = false;
      setBusy(false);
      setMood(finalMood);
      setPhase("");
    };
    const unsubscribe = bus.on((e) => {
      switch (e.type) {
        case "text_delta":
          startTurn();
          setMood("working");
          setPhase("responding…");
          liveTextRef.current += e.text;
          setLiveText(liveTextRef.current);
          break;
        case "thinking_delta":
          startTurn();
          setMood("thinking");
          setPhase("thinking…");
          setThinking((t) => t + e.text);
          break;
        case "tool_start":
          startTurn();
          setMood("working");
          setPhase(`running ${e.name}…`);
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
        case "info":
          setItems((prev) => [...prev, { kind: "info", text: e.message }]);
          break;
        case "turn_end": {
          const buffer = liveTextRef.current;
          if (buffer) {
            setItems((prev) => [...prev, { kind: "assistant", text: buffer }]);
          }
          liveTextRef.current = "";
          setLiveText("");
          setThinking("");
          endTurn("done");
          break;
        }
        case "error":
          setItems((prev) => [...prev, { kind: "error", message: e.message }]);
          // Reset the live buffers so partial streamed text from the failed
          // turn does not leak into the next turn's transcript.
          liveTextRef.current = "";
          setLiveText("");
          setThinking("");
          endTurn("error");
          break;
      }
    });
    return unsubscribe;
  }, [bus]);

  // Tick elapsed time while busy; stop (and clean up) when idle.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(id);
  }, [busy, startedAt]);

  const transcriptItems: TranscriptItem[] = liveText
    ? [...items, { kind: "assistant", text: liveText }]
    : items;

  const showWelcome = items.length === 0 && !busy && !liveText;

  const handleChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  };

  const handleSubmit = (text: string) => {
    setQuery("");
    setSelectedIndex(0);
    // Ignore empty/whitespace submissions entirely: no user line, no engine run.
    if (text.trim() === "") return;
    // Slash commands are forwarded as-is and never shown as a user line.
    if (shouldShowAsUser(text)) {
      setItems((prev) => [...prev, { kind: "user", text }]);
    }
    onSubmit(text);
  };

  return (
    <Box flexDirection="column">
      <Header
        model={model}
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        cwd={cwd}
        branch={branch}
      />
      <Box flexDirection="column">
        {showWelcome ? (
          <Welcome model={model} cwd={cwd} />
        ) : (
          <Transcript items={transcriptItems} />
        )}
      </Box>
      <ThinkingPanel text={thinking} collapsed={collapsed} />
      {permissionRequest ? (
        <PermissionPrompt
          tool={permissionRequest.tool}
          detail={permissionRequest.detail}
          onDecide={permissionRequest.onDecide}
        />
      ) : null}
      {permissionRequest ? null : (
        <>
          {busy ? (
            <StatusLine mood={mood} busy={busy} elapsedMs={elapsedMs} phase={phase} />
          ) : null}
          {paletteOpen ? (
            <SlashPalette
              items={paletteItems}
              query={query}
              selectedIndex={selectedIndex}
            />
          ) : null}
          <Input
            value={query}
            onChange={handleChange}
            onSubmit={handleSubmit}
            placeholder="Ask anything — / for commands"
          />
          <Footer />
        </>
      )}
    </Box>
  );
}
