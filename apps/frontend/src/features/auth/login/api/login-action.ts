"use server";

import { AuthError } from "next-auth";
import { loginSchema, type LoginInput } from "@expence/types";
import { signIn } from "@/auth";

export type LoginActionResult = { error: string } | undefined;

/**
 * `redirect: false` daje szanse zlapac AuthError i rozroznic zle dane
 * logowania od innych bledow (te ostatnie maja poleciec dalej jako wyjatek).
 * Przy sukcesie przekierowuje klient twardym przeladowaniem - patrz
 * lib/session-navigation.ts; redirect() stad zostawilby w karcie dane
 * poprzedniego uzytkownika.
 */
export async function loginAction(input: LoginInput): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Nieprawidlowe dane logowania" };

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Nieprawidlowy e-mail lub haslo" };
    }
    throw error;
  }
}
