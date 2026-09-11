"use client";

import { ChevronDown } from "lucide-react";
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

export function UserMenu({ user }: { user: UserMenuUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Menu uzytkownika">
          <Avatar size="sm">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>{initials(user)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm sm:inline">
            {user.name ?? user.email}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-sm font-medium">{user.name ?? "Uzytkownik"}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
