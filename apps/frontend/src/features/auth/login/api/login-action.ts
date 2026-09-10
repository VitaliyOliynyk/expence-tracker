"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { loginSchema, type LoginInput } from "@expence/types";
import { signIn } from "@/auth";

export type LoginActionResult = { error: string } | undefined;

/**
 * `redirect: false` daje szanse zlapac AuthError przed przekierowaniem -
 * przy sukcesie przekierowujemy sami, zeby rozroznic zle dane logowania
 * od innych bledow (te ostatnie maja polecieć dalej jako wyjatek).
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

  redirect("/categories");
}
