import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

const NAV_ITEMS = [{ href: "/categories", label: "Kategorie" }];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts odsiewa niezalogowanych wczesniej; to druga bariera po stronie RSC.
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/sign-in" });
            }}
            className="ml-auto"
          >
            <button type="submit" className="text-muted-foreground hover:underline">
              Wyloguj ({session.user.email})
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
