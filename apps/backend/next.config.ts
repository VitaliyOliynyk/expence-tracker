import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Next czyta .env tylko z katalogu aplikacji, a my trzymamy jeden wspolny
// plik w korzeniu monorepo - dociagamy go tutaj, zanim ruszy build/dev.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

const nextConfig: NextConfig = {
  // Pakiety workspace'owe sa publikowane jako zrodla TS - Next musi je skompilowac.
  transpilePackages: ["@expence/db", "@expence/types"],
  // Klient Prismy nie moze byc bundlowany - trzyma natywne silniki zapytan.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
