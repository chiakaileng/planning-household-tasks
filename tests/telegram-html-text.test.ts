import { describe, expect, it } from "vitest";
import { TelegramHtmlText } from "@/domain/plan/TelegramHtmlText";

const html = new TelegramHtmlText();

describe("TelegramHtmlText", () => {
  it("wraps an http URL on the title and ignores javascript hrefs", () => {
    expect(html.recipeTitle("Pasta & sauce", "https://example.test/a?x=1&y=2")).toBe(
      '<a href="https://example.test/a?x=1&amp;y=2">Pasta &amp; sauce</a>',
    );
    expect(html.recipeTitle("Pasta", "javascript:alert(1)")).toBe("Pasta");
  });

  it("wraps syntax in code and escapes angle brackets", () => {
    expect(html.code("/add <recipe url>")).toBe("<code>/add &lt;recipe url&gt;</code>");
  });
});
