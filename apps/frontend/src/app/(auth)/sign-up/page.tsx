import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/features/auth/register";
import { AuthCard } from "@/widgets/auth-card";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/expenses");

  return (
    <AuthCard
      title="Zaloz konto"
      description="Podaj swoje dane, zeby zaczac sledzic wydatki."
      footer={
        <>
          Masz juz konto?{" "}
          <Link href="/sign-in" className="text-foreground underline underline-offset-4">
            Zaloguj sie
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
