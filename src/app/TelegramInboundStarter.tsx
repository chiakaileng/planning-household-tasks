"use client";

import { useEffect } from "react";

/** Starts the Telegram command poller in the Node server (not in the page bundle). */
export function TelegramInboundStarter() {
  useEffect(() => {
    void fetch("/api/telegram/listen");
  }, []);
  return null;
}
