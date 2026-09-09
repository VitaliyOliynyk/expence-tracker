// Prisma 7 czyta konfiguracje CLI stad, a nie z package.json.
// Generator `prisma-client` nie laduje .env sam, a nasz .env lezy w korzeniu
// monorepo (jeden plik dla frontendu, backendu i migracji) - stad jawna sciezka.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
