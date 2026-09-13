import { describe, expect, it } from "vitest";
import type { MemberAvatarCatalog } from "@/config/memberAvatars";
import { Avatar } from "@/domain/member/Avatar";

const catalog: MemberAvatarCatalog = {
  initialsColors: ["#111111", "#222222"],
  presets: [{ key: "smile", label: "Smile", glyph: "😊" }],
};

const avatars = new Avatar(catalog);

describe("Avatar", () => {
  it("uses first letters of two words and first two letters of one word", () => {
    expect(avatars.initialsFromName("Kai Leng")).toBe("KL");
    expect(avatars.initialsFromName("Kai")).toBe("KA");
    expect(avatars.initialsFromName("K")).toBe("K");
  });

  it("falls back to initials when a preset key leaves the set", () => {
    const resolved = avatars.resolve({
      id: "member-1",
      name: "Kai Leng",
      avatarMode: "preset",
      avatarPresetKey: "gone",
    });
    expect(resolved).toEqual({
      mode: "initials",
      initials: "KL",
      color: avatars.colorForId("member-1"),
    });
  });

  it("keeps a preset that is still in the catalog", () => {
    expect(
      avatars.resolve({
        id: "member-1",
        name: "Kai",
        avatarMode: "preset",
        avatarPresetKey: "smile",
      }),
    ).toEqual({ mode: "preset", key: "smile", glyph: "😊", label: "Smile" });
  });
});
