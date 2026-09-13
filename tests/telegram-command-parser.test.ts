import { describe, expect, it } from "vitest";
import { TelegramCommandParser } from "@/domain/telegram/TelegramCommandParser";

const parser = new TelegramCommandParser();

describe("TelegramCommandParser", () => {
  it("ignores chatter and unknown slashes", () => {
    expect(parser.parse("look at this https://example.test/r")).toEqual({ kind: "ignore" });
    expect(parser.parse("/today")).toEqual({ kind: "ignore" });
  });

  it("treats /add@BotName as /add", () => {
    expect(parser.parse("/add@PantryPing https://example.test/soup fri dinner")).toEqual({
      kind: "add",
      url: "https://example.test/soup",
      rest: "fri dinner",
    });
  });

  it("parses plan, free, cook, and help", () => {
    expect(parser.parse("/plan tomato soup fri dinner")).toEqual({
      kind: "plan",
      rest: "tomato soup fri dinner",
    });
    expect(parser.parse("/free takeaway noodles")).toEqual({ kind: "free", rest: "takeaway noodles" });
    expect(parser.parse("/cook tomorrow")).toEqual({ kind: "cook", rest: "tomorrow" });
    expect(parser.parse("/help")).toEqual({ kind: "help" });
    expect(parser.parse("/unplan fri dinner")).toEqual({ kind: "unplan", rest: "fri dinner" });
  });

  it("keeps a multiline /free body after the command", () => {
    expect(parser.parse("/free\n2 cups flour\nstir until smooth")).toEqual({
      kind: "free",
      rest: "2 cups flour\nstir until smooth",
    });
  });
});
