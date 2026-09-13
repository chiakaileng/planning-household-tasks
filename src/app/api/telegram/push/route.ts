import { NextResponse } from "next/server";
import { AppConfig } from "@/config/AppConfig";
import { createTelegramAnnouncer } from "@/lib/createTelegramAnnouncer";

export async function POST(request: Request) {
  const config = new AppConfig();
  if (!config.hasTelegramCredentials()) {
    return NextResponse.json(
      { error: "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env." },
      { status: 400 },
    );
  }
  const body = (await request.json()) as { kind?: string; weekStart?: string };
  const announcer = createTelegramAnnouncer();
  let result: { ok: true } | { ok: false; error: string };
  if (body.kind === "tomorrow") {
    result = await announcer.pushTomorrow();
  } else if (body.kind === "weekly") {
    if (!body.weekStart) {
      return NextResponse.json({ error: "Open a week before pushing the weekly plan." }, { status: 400 });
    }
    result = await announcer.pushWeekly(body.weekStart);
  } else {
    result = { ok: false, error: "Pick weekly or tomorrow." };
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ kind: "sent" });
}
