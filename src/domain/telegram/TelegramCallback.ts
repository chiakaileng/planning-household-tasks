/**
 * Callback data stays short (Telegram’s 64-byte cap). Recipe/member ids are
 * already compact. Unknown payloads are ignored.
 */
export type TelegramCallback =
  | { kind: "cancel" }
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "save_library" }
  | { kind: "skip_library" }
  | { kind: "something_else" }
  | { kind: "as_freeform" }
  | { kind: "page"; page: number }
  | { kind: "recipe"; id: string }
  | { kind: "day"; date: string }
  | { kind: "meal"; slotKey: string }
  | { kind: "week"; shift: 0 | 1 }
  | { kind: "eater"; id: string }
  | { kind: "everyone" }
  | { kind: "skip_eaters" }
  | { kind: "done_eaters" }
  | { kind: "skip_cook" }
  | { kind: "cook"; id: string }
  | { kind: "how"; id: string }
  | { kind: "remove"; id: string };

export class TelegramCallbackCodec {
  encode(callback: TelegramCallback): string {
    switch (callback.kind) {
      case "cancel":
        return "x";
      case "yes":
        return "y";
      case "no":
        return "n";
      case "save_library":
        return "ly";
      case "skip_library":
        return "ln";
      case "something_else":
        return "s";
      case "as_freeform":
        return "a";
      case "page":
        return `p:${callback.page}`;
      case "recipe":
        return `r:${callback.id}`;
      case "day":
        return `d:${callback.date}`;
      case "meal":
        return `m:${callback.slotKey}`;
      case "week":
        return callback.shift === 1 ? "wn" : "wt";
      case "eater":
        return `e:${callback.id}`;
      case "everyone":
        return "ee";
      case "skip_eaters":
        return "es";
      case "done_eaters":
        return "ed";
      case "skip_cook":
        return "ks";
      case "cook":
        return `k:${callback.id}`;
      case "how":
        return `h:${callback.id}`;
      case "remove":
        return `u:${callback.id}`;
    }
  }

  decode(raw: string): TelegramCallback | null {
    const value = raw.trim();
    if (value === "x") {
      return { kind: "cancel" };
    }
    if (value === "y") {
      return { kind: "yes" };
    }
    if (value === "n") {
      return { kind: "no" };
    }
    if (value === "ly") {
      return { kind: "save_library" };
    }
    if (value === "ln") {
      return { kind: "skip_library" };
    }
    if (value === "s") {
      return { kind: "something_else" };
    }
    if (value === "a") {
      return { kind: "as_freeform" };
    }
    if (value === "ee") {
      return { kind: "everyone" };
    }
    if (value === "es") {
      return { kind: "skip_eaters" };
    }
    if (value === "ed") {
      return { kind: "done_eaters" };
    }
    if (value === "ks") {
      return { kind: "skip_cook" };
    }
    if (value === "wn") {
      return { kind: "week", shift: 1 };
    }
    if (value === "wt") {
      return { kind: "week", shift: 0 };
    }
    if (value.startsWith("p:")) {
      const page = Number(value.slice(2));
      return Number.isInteger(page) && page >= 0 ? { kind: "page", page } : null;
    }
    if (value.startsWith("r:")) {
      return { kind: "recipe", id: value.slice(2) };
    }
    if (value.startsWith("d:") && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(2))) {
      return { kind: "day", date: value.slice(2) };
    }
    if (value.startsWith("m:")) {
      return { kind: "meal", slotKey: value.slice(2) };
    }
    if (value.startsWith("e:")) {
      return { kind: "eater", id: value.slice(2) };
    }
    if (value.startsWith("k:")) {
      return { kind: "cook", id: value.slice(2) };
    }
    if (value.startsWith("h:")) {
      return { kind: "how", id: value.slice(2) };
    }
    if (value.startsWith("u:")) {
      return { kind: "remove", id: value.slice(2) };
    }
    return null;
  }
}
