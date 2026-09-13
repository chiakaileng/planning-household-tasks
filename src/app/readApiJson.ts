/**
 * Next can return an empty 500 body (e.g. a stale Prisma client). Never call response.json() raw.
 */
export async function readApiJson<T>(response: Response): Promise<T | { error: string }> {
  const text = await response.text();
  if (!text.trim()) {
    return { error: "Could not save. Restart the Next server after a database change, then try again." };
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "Could not save. The server returned an unexpected response." };
  }
}
