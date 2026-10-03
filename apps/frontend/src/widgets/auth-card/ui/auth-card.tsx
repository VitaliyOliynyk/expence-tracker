import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

/** Wspolna ramka dla /sign-in i /sign-up - naglowek, tresc formularza i link zamieniajacy strony. */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <p className="px-2 text-2xl font-bold tracking-tight">Expence</p>
      <div className="flex flex-col gap-7 rounded-[2rem] bg-background p-7 sm:p-9">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      <p className="text-center text-sm text-muted-foreground">{footer}</p>
    </main>
  );
}
