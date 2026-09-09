"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient tworzymy w stanie, a nie w module - inaczej w SSR wszyscy
  // uzytkownicy dzieliliby jeden cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Nie ponawiamy zapytan odrzuconych z powodu wygasnietej sesji.
              const status = (error as { status?: number }).status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
