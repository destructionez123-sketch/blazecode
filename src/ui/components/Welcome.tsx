import { basename } from "node:path";
import { Box, Text } from "ink";
import { ui } from "../theme.js";
import { WELCOME_FACE, MASCOT_NAME } from "../mascot.js";

export interface WelcomeProps {
  model: string;
  cwd: string;
}

const EXAMPLES = [
  "refactor the auth module and run the tests",
  "why is the build failing?",
  "add a /health endpoint with a test",
];

/**
 * Empty-state hero shown when the transcript is empty and Blaze is idle.
 * Sells the tool with a friendly mascot, a one-line pitch, and example
 * prompts. App decides when to render it.
 */
export function Welcome({ cwd }: WelcomeProps) {
  const here = basename(cwd) || cwd;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="column">
        {WELCOME_FACE.map((line, i) => (
          <Text key={i} color={ui.flame} bold>
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={ui.white}>
          {"Hey, I'm "}
          <Text color={ui.flame} bold>
            {MASCOT_NAME}
          </Text>
          {" — your coding agent."}
        </Text>
      </Box>
      <Text color={ui.grey}>{`Ask me to build, fix, explain, or run things in ${here}`}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color={ui.grey}>Try:</Text>
        {EXAMPLES.map((ex) => (
          <Text key={ex}>
            <Text color={ui.flame}>{"› "}</Text>
            <Text color={ui.white}>{ex}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}
