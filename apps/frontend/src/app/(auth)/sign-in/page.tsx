import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/expenses");

  // Szkielet: Server Action wolajaca provider Credentials.
  // Docelowo formularz przechodzi na shadcn/ui + react-hook-form.
  async function authenticate(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/expenses",
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Zaloguj sie</h1>
      <form action={authenticate} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Haslo"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Zaloguj
        </button>
      </form>
      <a href="/sign-up" className="text-center text-sm text-muted-foreground underline">
        Nie masz konta? Zaloz je
      </a>
    </main>
  );
}
