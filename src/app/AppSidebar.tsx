"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const homeActive = pathname === "/";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Household</div>
      <nav className="nav" aria-label="Main">
        <Link href="/" className={`nav-item${homeActive ? " is-active" : ""}`}>
          Home
        </Link>
        <span className="nav-item nav-soon">Week</span>
        <span className="nav-item nav-soon">Members</span>
      </nav>
    </aside>
  );
}
