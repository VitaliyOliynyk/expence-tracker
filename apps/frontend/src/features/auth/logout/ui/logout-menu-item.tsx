"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { navigateWithFreshSession } from "@/lib/session-navigation";
import { logoutAction } from "../api/logout-action";

export function LogoutMenuItem() {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      disabled={isPending}
      onSelect={(event) => {
        event.preventDefault();
        startTransition(async () => {
          await logoutAction();
          navigateWithFreshSession("/sign-in");
        });
      }}
    >
      <LogOut />
      {isPending ? "Wylogowywanie..." : "Wyloguj sie"}
    </DropdownMenuItem>
  );
}
