import type { PrismaClient } from "@prisma/client";
import type { ILlmUsageRepository, LlmUsageRecord } from "@/persistence/ILlmUsageRepository";

export class LlmUsageRepository implements ILlmUsageRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(event: LlmUsageRecord): Promise<void> {
    await this.db.llmUsageEvent.create({ data: event });
  }

  async totalEstimatedUsd(): Promise<number> {
    const aggregate = await this.db.llmUsageEvent.aggregate({
      _sum: { estimatedUsd: true },
    });
    return aggregate._sum.estimatedUsd ?? 0;
  }
}
