"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const homeActive = pathname === "/";
  const recipeActive = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const membersActive = pathname === "/members" || pathname.startsWith("/members/");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Household</div>
      <nav className="nav" aria-label="Main">
        <Link href="/" className={`nav-item${homeActive ? " is-active" : ""}`}>
          Home
        </Link>
        <Link href="/recipes" className={`nav-item${recipeActive ? " is-active" : ""}`}>
          Recipe
        </Link>
        <Link href="/members" className={`nav-item${membersActive ? " is-active" : ""}`}>
          Members
        </Link>
      </nav>
    </aside>
  );
}
