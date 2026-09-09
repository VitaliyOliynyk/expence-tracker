# Expence Tracker

Modul do sledzenia wydatkow. Monorepo pnpm: osobny frontend i backend Next.js,
wspolna baza przez Prisma.

> **Stan repo:** szkielet. Struktura, konfiguracja i kontrakty sa gotowe,
> **zaleznosci nie sa zainstalowane** i migracje nie zostaly wygenerowane.

## Struktura

| Pakiet | Nazwa | Rola |
| --- | --- | --- |
| `apps/frontend` | `@expence/frontend` | UI (App Router), Auth.js, TanStack Query. Port **3000** |
| `apps/backend` | `@expence/backend` | Wylacznie route handlery `/api/*`. Port **3001** |
| `packages/db` | `@expence/db` | Schemat Prisma, klient (singleton), seed |
| `packages/types` | `@expence/types` | Schematy Zod = kontrakt miedzy frontendem a backendem |
| `packages/config` | `@expence/config` | Wspoldzielone `tsconfig` i baza ESLint |

## Jak dziala autoryzacja

Sesja istnieje tylko we frontendzie. Backend jest bezstanowy.

```
przegladarka ──(cookie sesji Auth.js)──> frontend :3000
                                          │  GET /api/token
                                          ▼
                              JWT HS256 (sub=userId, exp=10 min)
                                          │
przegladarka ──(Authorization: Bearer)───> backend :3001
                                          │  proxy.ts: jwtVerify(AUTH_SECRET)
                                          ▼
                              handler czyta userId z naglowka x-user-id
```

Dlaczego wlasny token, a nie cookie Auth.js: cookie sesyjne next-auth v5 to
zaszyfrowany JWE zwiazany z wewnetrznym formatem biblioteki. Zamiast go
rozszyfrowywac, frontend bije wlasny, krotkozyciowy token HS256 tym samym
`AUTH_SECRET` (`src/lib/access-token.ts`), a backend weryfikuje go przez `jose`.

**`AUTH_SECRET` musi byc identyczny po obu stronach.**

## Uruchomienie od zera

Wymagane: pnpm (przez `corepack enable pnpm`) i dzialajacy Docker.

```bash
cp .env.example .env
openssl rand -base64 32       # wynik wklej do AUTH_SECRET w .env

pnpm install
pnpm db:up                    # Postgres 17 w kontenerze
pnpm db:migrate               # pierwsza migracja + prisma generate
pnpm db:seed                  # uzytkownik dev@expence.local + kategorie
pnpm dev                      # frontend :3000, backend :3001
```

Sprawdzenie, ze backend zyje:

```bash
curl localhost:3001/api/health          # {"status":"ok","database":"up"}
curl -i localhost:3001/api/expenses     # 401 - brak tokenu, tak ma byc
```

## Skrypty (korzen repo)

| Skrypt | Opis |
| --- | --- |
| `pnpm dev` | frontend i backend rownolegle |
| `pnpm build` | `prisma generate` + build obu aplikacji |
| `pnpm typecheck` / `pnpm lint` | kontrola typow / ESLint we wszystkich pakietach |
| `pnpm db:up` / `db:down` / `db:reset` | kontener Postgresa (`db:reset` kasuje wolumen) |
| `pnpm db:migrate` / `db:seed` / `db:studio` | migracje, dane startowe, Prisma Studio |

## Decyzje, ktore warto znac przed pierwsza zmiana

- **Kwoty to `Int` w groszach** (`amountCents`), nigdy `Float`. Konwersja i
  formatowanie: `packages/types/src/money.ts`.
- **Walidacja jest jedna.** Schematy z `@expence/types` uzywane sa naraz przez
  route handlery (`parseJsonBody`) i formularze (`standardSchemaResolver`).
- **`userId` nigdy nie pochodzi z body ani z query.** Backend czyta go wylacznie
  z naglowka `x-user-id`, ktory ustawia `proxy.ts` po weryfikacji tokenu.
- **Next 16 zmienil `middleware.ts` na `proxy.ts`** (eksport funkcji `proxy`).
- **Prisma 7 nie czyta URL-a ze schematu.** Connection string jest w
  `packages/db/prisma.config.ts`, a klient laczy sie przez driver adapter
  `@prisma/adapter-pg`. Generator to `prisma-client` z wymaganym `output`
  (`packages/db/src/generated/` - katalog jest w `.gitignore`).
- **Tailwind v4 nie ma `tailwind.config.js`** - motyw siedzi w
  `apps/frontend/src/app/globals.css`.

## Do zrobienia po szkielecie

- Rejestracja uzytkownika (hashowanie hasla jest gotowe:
  `apps/frontend/src/lib/password.ts`, scrypt z `node:crypto`).
- Komponenty shadcn/ui: `pnpm --filter @expence/frontend dlx shadcn@latest add button input select`.
- Widok kategorii i wykres podsumowania (endpoint `/api/summary` juz dziala).
- Testy (Vitest / Playwright) i CI.

## Wersje zaleznosci

Zainstalowane i zweryfikowane 2026-09-10 (`pnpm install`, `lint`, `typecheck`
przechodza). Cztery pozycje sa **celowo nizsze niz tag `latest`** - podbicie
ktorejkolwiek psuje build:

- **TypeScript `^6.0.3`**, nie 7.x. `typescript-eslint` 8.70 odmawia startu na
  TS 7.0 (`typescript-eslint does not support TS 7.0`), wiec `pnpm lint` padal.
- **ESLint `^9.39.5`**, nie 10.x. `eslint-plugin-react` 7.37.5 wola usuniete w
  ESLint 10 `context.getFilename()` i wywraca sie na `react/display-name`.
- **Prisma `^7.10.0`** - tag `latest` wskazuje na `8.0.0-rc`.
- **`next-auth` `5.0.0-beta.32`** - v5 wciaz w becie, wersja dokladna bez `^`.

Jedyne ostrzezenie przy instalacji dotyczy `eslint-plugin-import`, ktory
deklaruje peer ESLint do 9.x - to falszywy alarm, plugin dziala.
