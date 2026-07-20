"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/candidates", label: "Candidates" },
];

/**
 * Current location must be visibly marked, not merely implied — otherwise
 * people lose track of where they are in a multi-page tool.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1" aria-label="Main">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/" || pathname.startsWith("/jobs")
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 sm:px-3 ${
              active
                ? "bg-surface-2 text-ink"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
