import { existsSync, statSync } from "fs";
import path from "path";

/**
 * Identity of the generated Prisma client on disk.
 * `prisma generate` changes this file; the in-process client does not, unless we rebuild it.
 */
export class GeneratedPrismaClientFingerprint {
  constructor(
    private readonly filePath = path.join(process.cwd(), "node_modules", ".prisma", "client", "index.js"),
  ) {}

  read(): string {
    if (!existsSync(this.filePath)) {
      return "missing";
    }
    const stats = statSync(this.filePath);
    return `${stats.mtimeMs}:${stats.size}`;
  }
}
