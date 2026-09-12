import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppSidebar } from "@/app/AppSidebar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Household meal planner",
  description: "Add recipes from a URL or paste, then review before saving.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <div className="shell">
          <AppSidebar />
          <div className="shell-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
