import { readApiJson } from "@/app/readApiJson";

export async function deleteRecipe(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
  const result = await readApiJson<{ kind?: string; error?: string }>(response);
  if (result.kind === "removed") {
    return { ok: true };
  }
  return { ok: false, error: result.error ?? "Could not delete this recipe." };
}
