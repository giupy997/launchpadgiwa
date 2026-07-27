"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Explore" },
  { href: "/create", label: "Create" },
  { href: "/swap", label: "Swap" },
  { href: "/bridge", label: "Bridge" },
  { href: "/profile", label: "Profile" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 font-mono text-xs tracking-widest uppercase overflow-x-auto">
      {ITEMS.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-full px-3.5 py-1.5 whitespace-nowrap transition-colors ${
              active
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
