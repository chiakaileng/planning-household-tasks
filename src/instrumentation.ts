export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { startTelegramAnnounceScheduler } = await import("@/announce/startTelegramAnnounceScheduler");
  const { startTelegramInboundPoller } = await import("@/announce/startTelegramInboundPoller");
  startTelegramAnnounceScheduler();
  startTelegramInboundPoller();
}
