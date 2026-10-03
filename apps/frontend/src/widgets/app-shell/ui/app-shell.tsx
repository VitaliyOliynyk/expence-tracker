import type { ReactNode } from "react";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import { UserMenu, type UserMenuUser } from "./user-menu";

function Wordmark() {
  return (
    <Link
      href="/transactions"
      className="rounded-md text-2xl font-bold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      Expence
    </Link>
  );
}

/**
 * Skorupa panelu: biala plyta z duzym promieniem na szarym plotnie. Na desktopie
 * sidebar z logo, menu sekcji i ciemna karta profilu; na mobile jeden pasek u gory.
 * Linia pod logo i pod `PageHeader` lezy na tej samej wysokosci (h-24).
 */
export function AppShell({ user, children }: { user: UserMenuUser; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:p-6">
      <div className="mx-auto flex min-h-dvh max-w-[90rem] bg-background lg:min-h-[calc(100dvh-3rem)] lg:rounded-[2.5rem]">
        <aside className="hidden w-64 shrink-0 rounded-l-[2.5rem] bg-sidebar lg:block">
          <div className="sticky top-6 flex h-[calc(100dvh-3rem)] flex-col">
            <div className="flex h-24 shrink-0 items-center border-b px-9">
              <Wordmark />
            </div>
            <NavLinks orientation="vertical" className="mt-14 px-5" />
            <div className="mt-auto p-5">
              <UserMenu user={user} variant="card" />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-5 lg:hidden">
            <Wordmark />
            <NavLinks orientation="horizontal" className="ml-2" />
            <div className="ml-auto">
              <UserMenu user={user} variant="avatar" />
            </div>
          </div>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
