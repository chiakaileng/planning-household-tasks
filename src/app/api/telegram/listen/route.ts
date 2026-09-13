import { NextResponse } from "next/server";
import { startTelegramInboundPoller } from "@/announce/startTelegramInboundPoller";

export async function GET() {
  startTelegramInboundPoller();
  return NextResponse.json({ ok: true });
}
