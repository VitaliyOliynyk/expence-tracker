"use client";

import { MoreVertical } from "lucide-react";
import { LogoutMenuItem } from "@/features/auth/logout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type UserMenuUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/** "Jan Kowalski" -> "JK"; bez imienia dwie pierwsze litery e-maila. */
function initials(user: UserMenuUser): string {
  const words = user.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  return (user.email ?? "?").slice(0, 2).toUpperCase();
}

function UserAvatar({ user, className }: { user: UserMenuUser; className?: string }) {
  return (
    <Avatar className={cn("size-10", className)}>
      {user.image ? <AvatarImage src={user.image} alt="" /> : null}
      <AvatarFallback className="bg-inherit text-sm font-semibold text-inherit">
        {initials(user)}
      </AvatarFallback>
    </Avatar>
  );
}

function MenuContent({ user }: { user: UserMenuUser }) {
  return (
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
        <span className="text-sm font-semibold">{user.name ?? "Uzytkownik"}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <LogoutMenuItem />
    </DropdownMenuContent>
  );
}

type UserMenuProps = {
  user: UserMenuUser;
  /** `card` - ciemna karta na dole sidebara, `avatar` - samo kolko w pasku mobile. */
  variant: "card" | "avatar";
};

export function UserMenu({ user, variant }: UserMenuProps) {
  if (variant === "avatar") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Menu uzytkownika"
            className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <UserAvatar user={user} className="size-9 bg-ink text-white" />
          </button>
        </DropdownMenuTrigger>
        <MenuContent user={user} />
      </DropdownMenu>
    );
  }

  return (
    <div className="rounded-[1.75rem] bg-ink p-5 text-white">
      <div className="flex items-start justify-between">
        <UserAvatar user={user} className="bg-white/12" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Menu uzytkownika"
              className="-mr-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-white/40"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <MenuContent user={user} />
        </DropdownMenu>
      </div>
      <p className="mt-4 truncate font-semibold">{user.name ?? "Uzytkownik"}</p>
      <p className="truncate text-xs text-white/60">{user.email}</p>
    </div>
  );
}
