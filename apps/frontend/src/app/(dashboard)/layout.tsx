import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/widgets/app-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts odsiewa niezalogowanych wczesniej; to druga bariera po stronie RSC.
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { name, email, image } = session.user;

  return (
    <div className="min-h-dvh bg-muted/40">
      <AppHeader user={{ name, email, image }} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
