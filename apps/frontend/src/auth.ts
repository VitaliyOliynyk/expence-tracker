import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@expence/db";
import { loginSchema } from "@expence/types";
import { AuthApiError, loginRequest } from "@/lib/auth-api";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Adapter + Credentials wymaga sesji w JWT (nie w bazie) - tak dziala next-auth v5.
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Haslo", type: "password" },
      },
      // Haslo weryfikuje backend (POST /api/auth/login) - authorize() nie dotyka
      // juz Prismy ani hasha. Bledy inne niz zle dane logowania (np. konto
      // nieaktywne) traktujemy tu jak zwykla porazke logowania.
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        try {
          const result = await loginRequest(parsed.data);
          if (!result) return null;

          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            image: result.user.image,
          };
        } catch (error) {
          if (error instanceof AuthApiError) return null;
          throw error;
        }
      },
    }),
    // Tu dokladasz providery OAuth (GitHub, Google) - adapter Prisma juz je obsluzy.
  ],
  callbacks: {
    jwt({ token, user }) {
      // Przy logowaniu przepisujemy id do tokenu; pozniej `sub` juz tam jest.
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
