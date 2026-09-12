import { INGREDIENT_UNITS } from "@/config/ingredientUnits";
import type { Ingredient } from "@/domain/recipe/Ingredient";

/**
 * Turns a free-text ingredient line into quantity / unit / name.
 * Unknown shapes are flagged and kept in full — never dropped, never guessed.
 */
export class IngredientLineParser {
  parse(rawLine: string): Ingredient {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) {
      return {
        name: rawLine,
        quantity: null,
        unit: null,
        note: null,
        parseFlagged: true,
      };
    }

    const match = line.match(this.buildPattern());
    if (!match) {
      return {
        name: line,
        quantity: null,
        unit: null,
        note: null,
        parseFlagged: true,
      };
    }

    const quantity = match[1] ?? null;
    const unit = match[2] ?? null;
    const rest = (match[3] ?? "").trim();
    const { name, note } = splitNote(rest);

    if (!name) {
      return {
        name: line,
        quantity,
        unit,
        note,
        parseFlagged: true,
      };
    }

    return {
      name,
      quantity,
      unit,
      note,
      parseFlagged: false,
    };
  }

  parseAll(lines: string[]): Ingredient[] {
    return lines.map((line) => this.parse(line)).filter((item) => item.name.trim().length > 0 || item.parseFlagged);
  }

  private buildPattern(): RegExp {
    // Longest units first so "tablespoons" wins over "t".
    const units = [...INGREDIENT_UNITS].sort((a, b) => b.length - a.length);
    const unitGroup = units.map(escapeRegex).join("|");
    return new RegExp(
      `^(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)\\s+(${unitGroup})\\b\\s*(.*)$`,
      "i",
    );
  }
}

function splitNote(rest: string): { name: string; note: string | null } {
  // Keep "(can be sesame oil, …)" on the name so alternatives are not hidden
  // in a side field the reviewer never sees. Only a trailing comma note is split.
  const paren = rest.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (paren) {
    return { name: rest, note: null };
  }

  const comma = rest.indexOf(",");
  if (comma > 0) {
    return {
      name: rest.slice(0, comma).trim(),
      note: rest.slice(comma + 1).trim() || null,
    };
  }
  return { name: rest, note: null };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
