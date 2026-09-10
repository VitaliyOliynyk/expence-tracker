"use server";

import { signOut } from "@/auth";

/** Przekierowanie robi klient - patrz LogoutMenuItem. */
export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
}
