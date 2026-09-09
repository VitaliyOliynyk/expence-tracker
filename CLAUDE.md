# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stan repozytorium

Szkielet z działającym toolingiem. Zależności są zainstalowane, `.env`
utworzony, klient Prismy wygenerowany, Postgres wstaje w kontenerze,
`pnpm lint` i `pnpm typecheck` przechodzą na zero błędów.

**Czego jeszcze nie ma:** żadnej migracji (schemat nie istnieje w bazie),
danych z seeda, runnera testów (ani Vitest, ani Playwright) i UI ponad
placeholdery. Logika backendu (`/api/expenses`, `/api/categories`,
`/api/summary`) jest napisana, ale nie została uruchomiona przeciw bazie.

## Bootstrap

Na czystym klonie:

```bash
cp .env.example .env
openssl rand -base64 32     # wynik wklej jako AUTH_SECRET
pnpm install
pnpm db:up                  # Postgres 17 w kontenerze
pnpm db:migrate             # pierwsza migracja + prisma generate
pnpm db:seed                # dev@expence.local + kategorie startowe
```

## Komendy

Wszystkie z korzenia repo:

| Komenda | Efekt |
| --- | --- |
| `pnpm dev` | frontend :3000 i backend :3001 równolegle |
| `pnpm build` | `prisma generate`, potem build obu aplikacji |
| `pnpm typecheck` / `pnpm lint` | we wszystkich pakietach naraz |
| `pnpm db:up` / `db:down` / `db:reset` | kontener Postgresa (`db:reset` kasuje wolumen) |
| `pnpm db:migrate` / `db:seed` / `db:studio` | migracje, dane startowe, Prisma Studio |

Pojedynczy pakiet: `pnpm --filter @expence/backend <skrypt>`. Nazwy: `@expence/frontend`, `@expence/backend`, `@expence/db`, `@expence/types`, `@expence/config`.

Sprawdzenie backendu bez UI:

```bash
curl localhost:3001/api/health        # {"status":"ok","database":"up"}
curl -i localhost:3001/api/expenses   # 401 bez tokenu — tak ma być
```

## Architektura

Dwie **osobne** aplikacje Next.js w jednym monorepo pnpm. `apps/frontend` to całe UI plus sesja; `apps/backend` to wyłącznie route handlery `/api/*` — nie ma tam żadnej strony ani root layoutu i nie powinno przybyć.

### Przepływ autoryzacji — najważniejsza rzecz do zrozumienia

Sesja istnieje tylko we frontendzie. Backend jest bezstanowy i nie zna cookies.

```
przeglądarka ──(cookie sesji Auth.js)──→ frontend :3000
                                          │  GET /api/token
                                          ▼
                              JWT HS256 (sub=userId, exp=10 min)
                                          │
przeglądarka ──(Authorization: Bearer)──→ backend :3001
                                          │  proxy.ts → jwtVerify(AUTH_SECRET)
                                          ▼
                              handler czyta userId z nagłówka x-user-id
```

Frontend **nie** przekazuje dalej cookie Auth.js — to zaszyfrowany JWE związany z wewnętrznym formatem next-auth v5. Zamiast tego `src/lib/access-token.ts` bije własny, krótkożyciowy token HS256 tym samym `AUTH_SECRET`, a `src/lib/api-client.ts` cache'uje go w pamięci karty i odświeża z 30-sekundowym zapasem. Backend weryfikuje go w `src/lib/jwt.ts`.

Konsekwencje przy zmianach:

- **`AUTH_SECRET` musi być identyczny po obu stronach.** Rozjazd = każde żądanie 401 bez czytelnego powodu.
- **`userId` nigdy nie pochodzi z body ani z query.** Jedyne źródło to nagłówek `x-user-id`, który ustawia `apps/backend/proxy.ts` po weryfikacji tokenu; handlery sięgają po niego przez `requireUserId()` z `src/lib/auth-context.ts`. Przyjęcie `userId` z payloadu otwiera IDOR.
- Serwisy zawężają **każde** zapytanie do `userId`. Modyfikacje idą przez `updateMany`/`deleteMany` z `where: { id, userId }` — nie przez `update`/`delete` po samym `id`, bo te nie odsieją cudzego rekordu.
- Nowy publiczny endpoint trzeba dopisać do `PUBLIC_PATHS` w `apps/backend/proxy.ts`, inaczej proxy odetnie go na 401.

### `packages/types` to kontrakt, nie zbiór interfejsów

Schematy Zod są jedynym źródłem prawdy o kształcie danych i regułach walidacji. Ten sam schemat działa w trzech miejscach: `parseJsonBody`/`parseQuery` w backendzie, `standardSchemaResolver` w formularzach react-hook-form i typowanie odpowiedzi w `api-client.ts`. Zmiana reguły walidacji **zawsze** zaczyna się tutaj — dopisanie jej osobno w handlerze albo w formularzu tworzy drugą, rozjeżdżającą się definicję.

Uwaga na `createExpenseSchema`: ma transformację, więc typ wejściowy różni się od wyjściowego. `CreateExpenseFormValues` (`z.input`) trzyma react-hook-form, `CreateExpenseInput` (`z.infer`) dostaje backend — stąd trzyparametrowy generyk w `useForm`.

### Pieniądze

Kwoty to `Int` w groszach (`amountCents`) w całym stosie — nigdy `Float`. Konwersja z tego, co wpisze użytkownik (akceptuje przecinek), i formatowanie do wyświetlenia siedzą w `packages/types/src/money.ts`. Nie dodawaj równoległych konwersji w komponentach.

## Pułapki wersji

Stos jest świeży i kilka rzeczy działa inaczej, niż podpowiada pamięć o starszych wersjach:

- **Next 16 przemianował `middleware.ts` na `proxy.ts`** — plik eksportuje funkcję `proxy`, nie `middleware`. Oba appy mają swój, o różnych zadaniach: backendowy robi CORS i weryfikację tokenu, frontendowy tylko tanie sprawdzenie obecności cookie (właściwa autoryzacja jest w `(dashboard)/layout.tsx`).
- **Prisma 7 nie przyjmuje `url` w bloku `datasource`** — schemat się nie zwaliduje (P1012). Connection string jest w `packages/db/prisma.config.ts`, a `PrismaClient` łączy się przez driver adapter `@prisma/adapter-pg` przekazany w konstruktorze. Generator to `prisma-client` (nie `prisma-client-js`) z **wymaganym** `output`; klient ląduje w `packages/db/src/generated/`, które jest w `.gitignore`.
- Generator `prisma-client` nie ładuje `.env` sam. Skrypty CLI (seed, migracje) muszą zaimportować `packages/db/src/load-env.ts` **przed** `src/index.ts`; aplikacje dostają env z `next.config.ts`.
- **Jeden wspólny `.env` leży w korzeniu monorepo**, a Next szuka go tylko w katalogu aplikacji — dlatego oba `next.config.ts` dociągają go przez `dotenv`. Dodając trzecią aplikację, powtórz ten zabieg.
- **Tailwind v4 nie ma `tailwind.config.js`** — motyw i tokeny shadcn/ui są w `apps/frontend/src/app/globals.css`. `components.json` celowo ma pusty `tailwind.config`.
- `next-auth` jest w becie (`5.0.0-beta.32`), wersja przypięta dokładnie, bez `^`.
- **Cztery zależności są celowo niższe niż tag `latest` — nie podbijaj ich bez sprawdzenia.** TypeScript stoi na `^6.0.3`, bo `typescript-eslint` 8.70 odmawia startu na TS 7.0. ESLint stoi na `^9.39.5`, bo `eslint-plugin-react` 7.37.5 woła usunięte w ESLint 10 `context.getFilename()`. Prisma stoi na `^7.10.0`, bo `latest` to `8.0.0-rc`. `next-auth` — jak wyżej.
- TS 6 deprecjonuje `baseUrl` (błąd TS5101). `paths` w obu `tsconfig.json` liczą się względem pliku tsconfig, bez `baseUrl` — nie dodawaj go z powrotem.

## Konwencje

- Wewnątrz aplikacji Next importy idą przez alias `@/*` (→ `src/*`), bez rozszerzeń. W `packages/*` — ścieżki względne z rozszerzeniem `.js` (kod jest ESM-owy i uruchamiany też poza bundlerem).
- Komentarze i komunikaty w kodzie są po polsku, bez znaków diakrytycznych (repo powstało w środowisku, gdzie były problematyczne). Trzymaj się tego w istniejących plikach.
- Odpowiedzi backendu mają jednolity kształt: helpery `ok`/`created`/`noContent`/`fail` z `apps/backend/src/lib/http.ts`, błędy zgodne z `apiErrorSchema`. Nie zwracaj gołego `Response.json` z własnym kształtem błędu.
- Klucze cache'a TanStack Query są scentralizowane w `apps/frontend/src/lib/query-keys.ts`; mutacja unieważnia całe gałęzie (`queryKeys.expenses.all`), nie pojedyncze wpisy.
