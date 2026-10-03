"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/transactions", label: "Transakcje", icon: ArrowLeftRight },
  { href: "/categories", label: "Kategorie", icon: Tags },
] as const;

type NavLinksProps = {
  /** Pionowa lista w sidebarze albo kompaktowy pasek na mobile. */
  orientation: "vertical" | "horizontal";
  className?: string;
};

export function NavLinks({ orientation, className }: NavLinksProps) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <nav className={cn("flex gap-1", vertical ? "flex-col" : "items-center", className)}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center rounded-xl text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              vertical ? "gap-4 px-4 py-3 text-[0.9375rem]" : "gap-2 px-2.5 py-1.5 text-sm",
              isActive &&
                (vertical
                  ? "bg-background font-semibold text-foreground shadow-[0_1px_3px_rgb(23_21_31/0.06)]"
                  : "bg-secondary font-semibold text-foreground"),
            )}
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.6} />
            <span className={cn(!vertical && "sr-only sm:not-sr-only")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
