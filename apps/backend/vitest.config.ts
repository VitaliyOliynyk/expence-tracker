import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testy jednostkowe backendu - bez bazy i bez serwera Next (zaleznosci mockowane).
export default defineConfig({
  resolve: {
    // alias @/* -> src/* jak w tsconfig.json
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
