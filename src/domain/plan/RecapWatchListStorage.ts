import type { RecapLens } from "@/domain/plan/RecapRoleFilter";

export type RecapGlancePrefs = {
  memberIds: string[];
  roles: RecapLens[];
};

/**
 * Browser-only glance prefs. Not household membership — just who and which roles this machine is watching.
 */
export class RecapWatchListStorage {
  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem">,
    private readonly key: string,
  ) {}

  read(): RecapGlancePrefs {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      return { memberIds: [], roles: [] };
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      return normalizePrefs(parsed);
    } catch {
      return { memberIds: [], roles: [] };
    }
  }

  write(prefs: RecapGlancePrefs): void {
    this.storage.setItem(this.key, JSON.stringify(prefs));
  }
}

function normalizePrefs(parsed: unknown): RecapGlancePrefs {
  if (Array.isArray(parsed)) {
    return {
      memberIds: stringIds(parsed),
      roles: ["eats", "cooks"],
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return { memberIds: [], roles: [] };
  }
  const record = parsed as { memberIds?: unknown; roles?: unknown };
  return {
    memberIds: stringIds(record.memberIds),
    roles: roleIds(record.roles),
  };
}

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function roleIds(value: unknown): RecapLens[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is RecapLens => item === "eats" || item === "cooks");
}
