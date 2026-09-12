import { NextResponse } from "next/server";
import { AppConfig } from "@/config/AppConfig";
import { createUsageRepository } from "@/lib/createImporter";

export async function GET() {
  const config = new AppConfig();
  const lifetimeUsd = await createUsageRepository().totalEstimatedUsd();
  return NextResponse.json({
    lifetimeUsd,
    model: config.llmModel,
    inputPricePerMillionUsd: config.llmInputPricePerMillionUsd,
    outputPricePerMillionUsd: config.llmOutputPricePerMillionUsd,
  });
}
