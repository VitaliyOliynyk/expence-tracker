import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/widgets/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts odsiewa niezalogowanych wczesniej; to druga bariera po stronie RSC.
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { name, email, image } = session.user;

  return <AppShell user={{ name, email, image }}>{children}</AppShell>;
}
