import { describe, expect, it } from "vitest";
import { DishPeopleCaption } from "@/domain/plan/DishPeopleCaption";

const caption = new DishPeopleCaption();

describe("DishPeopleCaption", () => {
  it("puts eaters first, then cook", () => {
    expect(
      caption.format({
        eaters: [{ name: "Kai" }, { name: "Ada" }],
        cookName: "Ada",
      }),
    ).toBe("Kai, Ada · cook Ada");
  });
});
