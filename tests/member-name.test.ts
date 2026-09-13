import { describe, expect, it } from "vitest";
import { MemberName } from "@/domain/member/MemberName";

const names = new MemberName();

describe("MemberName", () => {
  it("trims and rejects empty names", () => {
    expect(names.parse(" Kai ")).toBe("Kai");
    expect(names.parse("   ")).toBeNull();
    expect(names.parse("")).toBeNull();
  });

  it("treats Kai and kai as the same letters", () => {
    expect(names.sameIgnoreCase("Kai", "kai")).toBe(true);
    expect(names.sameIgnoreCase("Kai", "Ling")).toBe(false);
  });
});
