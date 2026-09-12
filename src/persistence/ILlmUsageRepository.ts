export type LlmUsageRecord = {
  model: string;
  purpose: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
};

export interface ILlmUsageRepository {
  record(event: LlmUsageRecord): Promise<void>;
  totalEstimatedUsd(): Promise<number>;
}
