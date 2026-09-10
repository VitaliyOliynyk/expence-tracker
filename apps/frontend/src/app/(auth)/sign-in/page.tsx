import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/login";
import { AuthCard } from "@/widgets/auth-card";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/expenses");

  return (
    <AuthCard
      title="Zaloguj sie"
      description="Podaj e-mail i haslo, ktorymi zalozono konto."
      footer={
        <>
          Nie masz konta?{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-4">
            Zaloz je
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
