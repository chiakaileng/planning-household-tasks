import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GeneratedPrismaClientFingerprint } from "@/persistence/GeneratedPrismaClientFingerprint";

describe("GeneratedPrismaClientFingerprint", () => {
  it("changes when the generated client file is rewritten", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "prisma-fingerprint-"));
    const file = path.join(dir, "index.js");
    writeFileSync(file, "first");
    const fingerprint = new GeneratedPrismaClientFingerprint(file);
    const before = fingerprint.read();

    writeFileSync(file, "second-edition");
    const after = fingerprint.read();

    expect(before).not.toBe("missing");
    expect(after).not.toBe(before);
  });
});
