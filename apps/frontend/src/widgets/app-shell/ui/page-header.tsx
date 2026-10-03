import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

/** Gorny pas strony panelu - na desktopie linia pod nim przedluza linie pod logo w sidebarze. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-6 sm:px-10 lg:h-24 lg:py-0">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-10 px-5 py-8 sm:px-10 sm:py-10">{children}</div>;
}
