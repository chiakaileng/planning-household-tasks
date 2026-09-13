import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppSidebar } from "@/app/AppSidebar";
import { TelegramInboundStarter } from "@/app/TelegramInboundStarter";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Household meal planner",
  description: "Plan household meals for the week. Recipes are optional content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <TelegramInboundStarter />
        <div className="shell">
          <AppSidebar />
          <div className="shell-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
