import { describe, expect, it } from "vitest";
import { parseDishDraft } from "@/app/api/week/parseDishDraft";

describe("parseDishDraft", () => {
  it("accepts free-form with eaters and no cook", () => {
    const draft = parseDishDraft({
      contentType: "freeform",
      freeformText: "Takeaway noodles",
      cookMemberId: "",
      eaterMemberIds: ["ada"],
    });
    expect(draft).toMatchObject({
      contentType: "freeform",
      freeformText: "Takeaway noodles",
      cookMemberId: "",
      eaterMemberIds: ["ada"],
    });
  });

  it("accepts a dish with no eaters and no cook", () => {
    const draft = parseDishDraft({
      contentType: "freeform",
      freeformText: "Pizza",
    });
    expect(draft).toMatchObject({
      contentType: "freeform",
      freeformText: "Pizza",
      cookMemberId: "",
      eaterMemberIds: [],
    });
  });

  it("rejects an unknown content type", () => {
    expect(parseDishDraft({ contentType: "snack" as never, freeformText: "Chips" })).toBeNull();
  });
});
