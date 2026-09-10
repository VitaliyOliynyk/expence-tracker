import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Wspolny .env lezy w korzeniu monorepo - Next sam go tam nie szuka.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@expence/auth", "@expence/db", "@expence/types"],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
