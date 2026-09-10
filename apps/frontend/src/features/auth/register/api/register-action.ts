"use server";

import { redirect } from "next/navigation";
import { registerSchema, type RegisterInput } from "@expence/types";
import { signIn } from "@/auth";
import { AuthApiError, registerRequest } from "@/lib/auth-api";

export type RegisterActionResult =
  { error: string; code?: AuthApiError["code"]; fields?: Record<string, string[]> } | undefined;

export async function registerAction(input: RegisterInput): Promise<RegisterActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "Nieprawidlowe dane rejestracji" };

  try {
    await registerRequest(parsed.data);
  } catch (error) {
    if (error instanceof AuthApiError) {
      return { error: error.message, code: error.code, fields: error.fields };
    }
    throw error;
  }

  // Konto juz istnieje - to samo haslo powinno zadzialac, wiec brak sesji
  // tutaj to awaria infrastruktury, a nie zly login uzytkownika.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });

  redirect("/categories");
}
