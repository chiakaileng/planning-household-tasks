import { NextResponse } from "next/server";
import { createImporter } from "@/lib/createImporter";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  const importer = createImporter();
  const result = await importer.extractFromPastedText(body.text ?? "");
  return NextResponse.json(result);
}
