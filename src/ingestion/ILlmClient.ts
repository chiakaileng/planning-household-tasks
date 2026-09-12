export type LlmJsonSuccess<T> = {
  ok: true;
  value: T;
  inputTokens: number;
  outputTokens: number;
};

export type LlmJsonFailure = {
  ok: false;
  message: string;
  inputTokens: number;
  outputTokens: number;
};

export type LlmJsonResult<T> = LlmJsonSuccess<T> | LlmJsonFailure;

/**
 * HTTP-only client. Recipe shape lives in the extractor + prompt, not here,
 * so Phase 2 can reuse the same transport with a different prompt.
 */
export interface ILlmClient {
  completeJson<T>(request: { prompt: string; responseSchema: unknown }): Promise<LlmJsonResult<T>>;
}
