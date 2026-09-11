import Link from "next/link";
import { Wallet } from "lucide-react";
import { NavLinks } from "./nav-links";
import { UserMenu, type UserMenuUser } from "./user-menu";

/** Naglowek panelu: logo, menu sekcji i profil uzytkownika. */
export function AppHeader({ user }: { user: UserMenuUser }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link href="/transactions" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <span className="hidden md:inline">Expence Tracker</span>
        </Link>
        <NavLinks />
        <div className="ml-auto">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
