import { describe, expect, it } from "vitest";
import { RecapRoleFilter } from "@/domain/plan/RecapRoleFilter";
import { RecapWatchList } from "@/domain/plan/RecapWatchList";
import { RecapWatchListStorage } from "@/domain/plan/RecapWatchListStorage";

const watchList = new RecapWatchList();

describe("RecapWatchList", () => {
  it("drops members who are no longer in the household", () => {
    expect(watchList.keepExisting(["kai", "gone", "ada"], ["kai", "ada"])).toEqual(["kai", "ada"]);
  });

  it("adds and removes without duplicating", () => {
    expect(watchList.add(["kai"], "ada")).toEqual(["kai", "ada"]);
    expect(watchList.add(["kai"], "kai")).toEqual(["kai"]);
    expect(watchList.remove(["kai", "ada"], "kai")).toEqual(["ada"]);
  });
});

describe("RecapRoleFilter", () => {
  const roles = new RecapRoleFilter();

  it("toggles eating and cooking independently, and none is fine", () => {
    expect(roles.toggle([], "eats")).toEqual(["eats"]);
    expect(roles.toggle(["eats"], "cooks")).toEqual(["eats", "cooks"]);
    expect(roles.toggle(["eats", "cooks"], "eats")).toEqual(["cooks"]);
    expect(roles.toggle(["cooks"], "cooks")).toEqual([]);
  });
});

describe("RecapWatchListStorage", () => {
  it("reads written prefs, upgrades a bare id list, and treats junk as empty", () => {
    const memory = new Map<string, string>();
    const storage = new RecapWatchListStorage(
      {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value);
        },
      },
      "watch",
    );

    expect(storage.read()).toEqual({ memberIds: [], roles: [] });
    storage.write({ memberIds: ["kai"], roles: ["eats"] });
    expect(storage.read()).toEqual({ memberIds: ["kai"], roles: ["eats"] });
    memory.set("watch", JSON.stringify(["kai", "ada"]));
    expect(storage.read()).toEqual({ memberIds: ["kai", "ada"], roles: ["eats", "cooks"] });
    memory.set("watch", "{not-json");
    expect(storage.read()).toEqual({ memberIds: [], roles: [] });
  });
});
