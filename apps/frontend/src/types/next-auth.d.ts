import type { DefaultSession } from "next-auth";

// Domyslna sesja Auth.js nie ma `user.id` - dokladamy go, bo callback jwt/session
// przepisuje tam identyfikator z bazy.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
