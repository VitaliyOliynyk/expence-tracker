import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { registerRequest } from "@/lib/auth-api";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/expenses");

  // Szkielet: Server Action wolajaca POST /api/auth/register, a po sukcesie
  // od razu signIn("credentials", ...) - zeby powstala sesja cookie.
  // Docelowo formularz przechodzi na shadcn/ui + react-hook-form (jak sign-in).
  async function register(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    await registerRequest({
      name: String(formData.get("name") ?? ""),
      email,
      password,
    });

    await signIn("credentials", { email, password, redirectTo: "/expenses" });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Zaloz konto</h1>
      <form action={register} className="flex flex-col gap-3">
        <input
          name="name"
          type="text"
          required
          placeholder="Imie"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
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
          Zarejestruj
        </button>
      </form>
      <a href="/sign-in" className="text-center text-sm text-muted-foreground underline">
        Masz juz konto? Zaloguj sie
      </a>
    </main>
  );
}
