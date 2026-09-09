// Wspolna baza ESLint (flat config) dla calego monorepo.
// Aplikacje Next.js dokladaja do tego `eslint-config-next`.
export const ignores = {
  ignores: [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "packages/db/src/generated/**",
  ],
};

/** @type {import("eslint").Linter.Config[]} */
export default [ignores];
