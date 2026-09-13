import { describe, expect, it } from "vitest";
import { DishContent } from "@/domain/plan/DishContent";

const content = new DishContent();

describe("DishContent", () => {
  it("prefers a free-form title over the pasted body", () => {
    expect(
      content.title(
        {
          contentType: "freeform",
          recipeId: null,
          sourceMealId: null,
          sourceDishId: null,
          leftoverText: null,
          freeformText: "1 cup flour\n2 eggs",
          freeformTitle: "Friday pizza",
        },
        {},
      ),
    ).toBe("Friday pizza");
  });

  it("uses the first line when there is no title", () => {
    expect(
      content.title(
        {
          contentType: "freeform",
          recipeId: null,
          sourceMealId: null,
          sourceDishId: null,
          leftoverText: null,
          freeformText: "Laksa\n1 cup stock",
        },
        {},
      ),
    ).toBe("Laksa");
  });

  it("names leftovers after the source dish", () => {
    expect(content.leftoverDishLabel("soya sauce chicken")).toBe("Leftovers: soya sauce chicken");
    expect(content.leftoverDishLabel("Leftovers: wings")).toBe("Leftovers: wings");
    expect(
      content.validate({
        contentType: "leftovers_meal",
        recipeId: null,
        sourceMealId: "dinner",
        sourceDishId: null,
        leftoverText: null,
        freeformText: null,
      }),
    ).toBe("Pick which dish these leftovers are from.");
  });
});
