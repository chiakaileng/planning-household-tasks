export type TelegramSlashCommand =
  | { kind: "ignore" }
  | { kind: "help" }
  | { kind: "add"; url: string | null; rest: string }
  | { kind: "plan"; rest: string }
  | { kind: "free"; rest: string }
  | { kind: "cook"; rest: string }
  | { kind: "unplan"; rest: string };

const COMMAND = /^\/(add|plan|free|cook|help|unplan)(?:@\S+)?(?:\s+([\s\S]*))?$/i;

/**
 * Only messages that start with a known slash command count. /add@BotName is
 * the same command. Chatter and unknown slashes stay ignore.
 */
export class TelegramCommandParser {
  parse(text: string): TelegramSlashCommand {
    const trimmed = text.trim();
    const match = COMMAND.exec(trimmed);
    if (!match) {
      return { kind: "ignore" };
    }
    const name = match[1]!.toLowerCase();
    const rest = (match[2] ?? "").trim();
    if (name === "help") {
      return { kind: "help" };
    }
    if (name === "add") {
      return this.parseAdd(rest);
    }
    if (name === "plan") {
      return { kind: "plan", rest };
    }
    if (name === "free") {
      return { kind: "free", rest };
    }
    if (name === "unplan") {
      return { kind: "unplan", rest };
    }
    return { kind: "cook", rest };
  }

  private parseAdd(rest: string): TelegramSlashCommand {
    if (!rest) {
      return { kind: "add", url: null, rest: "" };
    }
    const [first, ...tail] = rest.split(/\s+/);
    if (first && isHttpUrl(first)) {
      return { kind: "add", url: first, rest: tail.join(" ").trim() };
    }
    return { kind: "add", url: null, rest };
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
