import { describe, expect, it } from "vitest";
import { emptyAssignDraft } from "@/domain/telegram/TelegramAssignDraft";
import { TelegramInterviewLabel } from "@/domain/telegram/TelegramInterviewLabel";

describe("TelegramInterviewLabel", () => {
  const labels = new TelegramInterviewLabel(12);

  it("omits an untitled free-form paste from interview prompts", () => {
    const draft = emptyAssignDraft("1", "2");
    draft.content = { kind: "freeform", text: "takeaway noodles\n1 cup flour\n2 eggs", title: null };
    expect(labels.promptTitle(draft)).toBe("");
    expect(labels.saveLabel(draft)).toBe("that dish");
  });

  it("uses the typed title once they name it", () => {
    const draft = emptyAssignDraft("1", "2");
    draft.content = { kind: "freeform", text: "1 cup flour", title: "Friday pizza" };
    expect(labels.promptTitle(draft)).toBe("Friday pizza");
    expect(labels.saveLabel(draft)).toBe("Friday pizza");
  });

  it("keeps a short recipe title on prompts", () => {
    const draft = emptyAssignDraft("1", "2");
    draft.content = { kind: "recipe", recipeId: "s", title: "Tomato soup", sourceUrl: null };
    expect(labels.promptTitle(draft)).toBe("Tomato soup");
  });
});
