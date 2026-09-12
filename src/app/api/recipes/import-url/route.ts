import { NextResponse } from "next/server";
import { createImporter } from "@/lib/createImporter";

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  const importer = createImporter();
  const result = await importer.importFromUrl(body.url ?? "");
  return NextResponse.json(result);
}
