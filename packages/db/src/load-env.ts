/**
 * Modul o efekcie ubocznym: wczytuje .env z korzenia monorepo.
 * Importowany PRZED `./index.js` w skryptach CLI (seed, migracje).
 * Aplikacje Next.js tego nie potrzebuja - one dostaja env z next.config.ts.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });
