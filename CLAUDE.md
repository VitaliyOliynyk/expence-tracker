# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stan repozytorium

Zależności są zainstalowane, `.env` utworzony, klient Prismy wygenerowany,
Postgres wstaje w kontenerze, `pnpm lint` i `pnpm typecheck` przechodzą na
zero błędów. Pierwsza migracja istnieje i jest zaaplikowana, seed działa
i tworzy `dev@expence.local` z realnym hasłem (`dev12345`). Logika backendu
(`/api/expenses`, `/api/categories`, `/api/summary`, `/api/auth/*`,
`/api/transactions`) została
uruchomiona przeciw bazie i zweryfikowana end-to-end (rejestracja, logowanie,
izolacja danych między użytkownikami).

`/sign-in` i `/sign-up` są zaimplementowane (react-hook-form + shadcn/ui,
Server Actions wołające `signIn`/`registerRequest`) i zweryfikowane w
przeglądarce end-to-end: rejestracja, walidacja klienta, logowanie,
błędne hasło, wylogowanie. Zobacz "Frontend: Feature-Sliced Design" niżej.

**Czego jeszcze nie ma:** runnera testów (ani Vitest, ani Playwright) i UI
ponad `/sign-in`/`/sign-up` — listy i formularze wydatków/kategorii
(`(dashboard)/*`) to wciąż gołe elementy HTML bez shadcn/ui, w starym
płaskim układzie `components/`+`hooks/`+`lib/`.

## Bootstrap

Na czystym klonie:

```bash
cp .env.example .env
openssl rand -base64 32     # wynik wklej jako AUTH_SECRET
pnpm install
pnpm db:up                  # Postgres 17 w kontenerze
pnpm db:migrate             # pierwsza migracja
pnpm db:generate            # Prisma 7: migrate dev NIE generuje już klienta
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

Pojedynczy pakiet: `pnpm --filter @expence/backend <skrypt>`. Nazwy: `@expence/frontend`, `@expence/backend`, `@expence/db`, `@expence/types`, `@expence/auth`, `@expence/config`.

Sprawdzenie backendu bez UI:

```bash
curl localhost:3001/api/health        # {"status":"ok","database":"up"}
curl -i localhost:3001/api/expenses   # 401 bez tokenu — tak ma być

# rejestracja i logowanie (patrz "Modul uzytkownika i autoryzacji" nizej)
curl -X POST localhost:3001/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Jan","email":"jan@example.com","password":"tajnehaslo"}'
TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"dev@expence.local","password":"dev12345"}' | jq -r .token)
curl localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
```

## Praca z branchami (GitHub flow)

Repo pracuje wg [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow).
Gałąź główna to **`master`** (nie `main`) i jest zawsze w stanie działającym.

- **Nie commituj bezpośrednio do `master`.** Każda zmiana — feature, poprawka,
  dokumentacja — powstaje na osobnym branchu odbitym od aktualnego `master`
  (`git switch master && git switch -c feature/<nazwa>`).
- **Nazwy branchy:** `<typ>/<opis>`, opis w kebab-case po angielsku, krótko.
  Typy: `feature/` (nowa funkcjonalność, np. `feature/main-page`), `fix/`
  (poprawka błędu), `refactor/` (zmiana struktury bez zmiany zachowania, np.
  migracja `categories`/`expenses` na FSD), `docs/` (tylko dokumentacja),
  `chore/` (zależności, skrypty, konfiguracja).
- **Jeden branch = jedna intencja.** Nie dorzucaj niezwiązanych zmian "przy
  okazji" — zauważony problem poza zakresem to osobny branch.
- **Branch krótkożyciowy.** Przed mergem zaktualizuj go względem `master`
  przez `git rebase master` (branche są lokalne i niewspółdzielone, więc
  przepisanie historii jest bezpieczne).
- **Commity** małe i spójne, opis po polsku (jak w dotychczasowej historii).
- **Warunki mergu** — na branchu, po rebase:
  - `pnpm lint` i `pnpm typecheck` przechodzą na zero błędów, `pnpm build` się
    buduje;
  - zmiana `schema.prisma` ma w tym samym branchu migrację
    (`pnpm db:migrate`), a seed nadal działa;
  - jeśli feature zmienia to, co opisuje CLAUDE.md (np. "Stan repozytorium",
    "Czego jeszcze nie ma"), aktualizacja dokumentacji jest częścią brancha.
- **Merge:** repo nie ma jeszcze remote'a ani `gh`, więc pull request
  zastępuje lokalny `git switch master && git merge --no-ff <branch>` —
  `--no-ff` zostawia w historii commit mergu, czyli widoczną granicę
  feature'a. Po podpięciu remote'a na GitHubie: `git push -u origin <branch>`,
  PR do `master`, merge po review; nigdy force-push na `master`.
- **Po mergu** usuń branch: `git branch -d <branch>`.
- **Dla Claude:** przed rozpoczęciem zadania sprawdź `git branch --show-current`;
  jeśli to `master`, najpierw utwórz branch wg reguł wyżej. Commit, merge i
  push tylko na wyraźną prośbę użytkownika.

## Architektura

Dwie **osobne** aplikacje Next.js w jednym monorepo pnpm. `apps/frontend` to całe UI plus sesja; `apps/backend` to wyłącznie route handlery `/api/*` — nie ma tam żadnej strony ani root layoutu i nie powinno przybyć.

### Przepływ autoryzacji — najważniejsza rzecz do zrozumienia

Sesja istnieje tylko we frontendzie. Backend jest bezstanowy i nie zna cookies.
Backend jest też jedynym miejscem, które zna hasła — trzyma je moduł
użytkownika (`apps/backend/src/server/modules/user/`), Auth.js po stronie
frontendu tylko z niego korzysta.

```
                    POST /api/auth/register|login
przeglądarka ───────────────────────────────────────→ backend :3001
                                                        │  auth.service -> user.service (przez CQRS)
                                                        ▼
                                              { user, token, expiresAt }

przeglądarka ──(cookie sesji Auth.js)──→ frontend :3000
                                          │  authorize() -> POST /api/auth/login (patrz nizej)
                                          │  GET /api/token
                                          ▼
                              JWT HS256 (sub=userId, exp=10 min)
                                          │
przeglądarka ──(Authorization: Bearer)──→ backend :3001
                                          │  src/proxy.ts → verifyAccessToken(AUTH_SECRET)
                                          ▼
                              handler czyta userId z nagłówka x-user-id
```

`apps/frontend/src/auth.ts` (Auth.js, provider Credentials) **nie** dotyka
Prismy ani hasha hasła — `authorize()` woła `POST /api/auth/login` przez
`src/lib/auth-api.ts` i dostaje gotowy `{ user, token }`. Sesja przeglądarki
to nadal zaszyfrowane JWE Auth.js, niezwiązane z tokenem API. Do wywołania
`/api/*` z przeglądarki frontend **nie** przekazuje dalej tego cookie —
zamiast tego `GET /api/token` bije osobny, krótkożyciowy token HS256 tym
samym `AUTH_SECRET` (funkcja `signAccessToken` z `@expence/auth`), a
`src/lib/api-client.ts` cache'uje go w pamięci karty i odświeża z
30-sekundowym zapasem. Backend weryfikuje go w `src/lib/jwt.ts` (re-eksport
`verifyAccessToken` z `@expence/auth`).

Konsekwencje przy zmianach:

- **`AUTH_SECRET` musi być identyczny po obu stronach.** Rozjazd = każde żądanie 401 bez czytelnego powodu.
- **`userId` nigdy nie pochodzi z body ani z query.** Jedyne źródło to nagłówek `x-user-id`, który ustawia `apps/backend/src/proxy.ts` po weryfikacji tokenu; handlery sięgają po niego przez `requireUserId()` z `src/lib/auth-context.ts`. Przyjęcie `userId` z payloadu otwiera IDOR.
- Serwisy zawężają **każde** zapytanie do `userId`. Modyfikacje idą przez `updateMany`/`deleteMany` z `where: { id, userId }` — nie przez `update`/`delete` po samym `id`, bo te nie odsieją cudzego rekordu. Wyjątek: repozytorium modułu użytkownika modyfikuje `User` przez `update({ where: { id } })` — tu `id` **jest** samym rekordem właściciela (nie ma osobnego pola `userId`), więc nie ma czego dodatkowo zawężać.
- Nowy publiczny endpoint trzeba dopisać do `PUBLIC_PATHS` w `apps/backend/src/proxy.ts`, inaczej proxy odetnie go na 401. `/api/auth/login` i `/api/auth/register` już tam są; `/api/auth/me` celowo nie.
- **Hasła nigdy nie hashuj poza `@expence/auth`.** `hashPassword`/`verifyPassword` (scrypt, `node:crypto`) mieszkają tam jednym miejscem — konsumenci to moduł użytkownika w backendzie i `packages/db/prisma/seed.ts`. Frontend nie ma już własnej kopii.

### Moduł użytkownika i autoryzacji (CQRS)

`apps/backend/src/server/modules/{user,auth}/` to dwa moduły, które
rozmawiają ze sobą **wyłącznie przez komendy/zapytania na szynie**
(`apps/backend/src/server/bus/`), nigdy przez bezpośredni import cudzych
plików — `auth.service.ts` nie widzi `user.repository.ts` ani Prismy.

- Każdy moduł ma jeden plik `*.messages.ts` — to jedyny plik importowany
  z zewnątrz modułu (definicje wiadomości `defineCommand`/`defineQuery` +
  typy payloadu/wyniku). Reszta (`*.repository.ts`, `*.service.ts`,
  `*.handlers.ts`, `*.mapper.ts`, `*.errors.ts`) jest szczegółem
  implementacyjnym.
- Komenda zmienia stan i ma dokładnie jednego handlera; zapytanie tylko
  czyta. `LoginCommand` jest komendą mimo że "czyta" hasło — aktualizuje
  `lastLoginAt`.
- `apps/backend/src/server/bus/index.ts` to jedyne miejsce, które zna
  komplet handlerów wszystkich modułów (`registerUserHandlers`,
  `registerAuthHandlers`) i cache'uje instancję szyny na `globalThis` —
  bez tego hot reload w dev rejestrowałby handlery po raz drugi i wywalał
  serwer (ten sam zabieg co dla `prisma` w `packages/db/src/index.ts`).
- Serwisy przyjmują `dispatch` jako argument zamiast importować singleton
  z `bus/index.ts` — inaczej powstałby cykl importów (`bus/index.ts` →
  `auth.handlers.ts` → `auth.service.ts` → `bus/index.ts`).
- `passwordHash` nigdy nie przekracza granicy modułu użytkownika: zamiast
  oddawać hash, `VerifyUserCredentialsQuery` zwraca wyłącznie werdykt
  (`{ userId, isActive } | null`).
- Nowy moduł dopisuje własny `register*Handlers(bus)` w `bus/index.ts` i
  wystawia swój `*.messages.ts` — reszta backendu z niego korzysta tylko
  przez `dispatch(JakasQuery({ ... }))`.
- `transaction` (`/api/transactions`, model `Transaction` z typem
  `INCOME`/`EXPENSE`) to trzeci moduł na szynie — niezależny od `Expense`,
  który zostaje w starym układzie `server/services/`. Jedyny wyjątek od
  reguły "tylko przez szynę": `transaction.repository.ts` sprawdza
  własność kategorii (`categoryBelongsToUser`) bezpośrednio przez
  `prisma.category`, bo kategorie nie są jeszcze modułem CQRS i nie ma
  komu wysłać zapytania. Po migracji kategorii zamienia się to na
  `dispatch(...)`.
- `Transaction.categoryId` ma `onDelete: Restrict` — usunięcie kategorii z
  transakcjami kończy się `P2003`, które `category.service.ts` tłumaczy na
  `CategoryInUseError`, a route na `409 CONFLICT`.

### Frontend: Feature-Sliced Design (FSD)

Nowy kod frontendu — od modułu logowania/rejestracji wzwyż — powstaje wg
[Feature-Sliced Design](https://feature-sliced.design/) zamiast dawnego
płaskiego układu `components/`+`hooks/`+`lib/`. To migracja **częściowa i
celowa**: `categories`/`expenses` (komponenty w `components/`, hooki w
`hooks/`) zostają w starym układzie do osobnej migracji — nie przenoś ich
przy okazji innej zmiany.

Warstwy w `apps/frontend/src/`:

- **`app/**/page.tsx`, `layout.tsx`** — trasy Next.js, w duchu FSD pełnią
  rolę warstwy `pages`: tylko kompozycja (auth guard przez `auth()`,
  złożenie widgetu i feature'a), zero logiki biznesowej. Next wymusza tu
  fizyczną lokalizację (routing), więc to jedyna warstwa, której nie da
  się przenieść pod osobny katalog.
- **`widgets/`** — złożenia używane przez więcej niż jedną stronę, np.
  `widgets/auth-card` (ramka `Card` + nagłówek + link zamienny współdzielony
  przez `/sign-in` i `/sign-up`).
- **`features/<domena>/<akcja>/`** — jedna intencja użytkownika, np.
  `features/auth/login`, `features/auth/register`. Segmenty w środku:
  `ui/` (komponent kliencki z react-hook-form) i `api/` (Server Action,
  `"use server"`). Publiczne API slice'a to wyłącznie `index.ts` w jego
  korzeniu — import spoza slice'a idzie przez `@/features/auth/login`,
  nigdy przez `@/features/auth/login/ui/login-form` bezpośrednio. To ten
  sam pomysł co `*.messages.ts` w modułach backendu (patrz wyżej): jeden
  plik jest granicą, reszta jest szczegółem implementacyjnym.
- **`shared`** na razie **nie jest osobnym katalogiem** — tę rolę pełnią
  już istniejące `components/ui` (prymitywy shadcn/ui spięte przez
  `components.json`) i `lib/*` (m.in. `cn`, `auth-api.ts`, `api-client.ts`,
  `query-keys.ts`). Nie duplikuj ich pod nowym `shared/`, dopóki nie
  ruszy pełna migracja reszty aplikacji.
- Brak osobnej warstwy `entities` dla auth: sesja/`UserDto` to już
  współdzielony kontrakt z `@expence/types`, a jej infrastruktura
  (`next-auth`) siedzi w `apps/frontend/src/auth.ts` — dokładanie
  `entities/user` tylko po to, by zaznaczyć checkbox FSD, byłoby pustą
  abstrakcją.

Gdy `categories`/`expenses` przejdą na FSD, dostają własne katalogi w
`entities/`/`features/` analogicznie do `features/auth/*`.

### `packages/types` to kontrakt, nie zbiór interfejsów

Schematy Zod są jedynym źródłem prawdy o kształcie danych i regułach walidacji. Ten sam schemat działa w trzech miejscach: `parseJsonBody`/`parseQuery` w backendzie, `standardSchemaResolver` w formularzach react-hook-form i typowanie odpowiedzi w `api-client.ts`. Zmiana reguły walidacji **zawsze** zaczyna się tutaj — dopisanie jej osobno w handlerze albo w formularzu tworzy drugą, rozjeżdżającą się definicję.

Uwaga na `createExpenseSchema`: ma transformację, więc typ wejściowy różni się od wyjściowego. `CreateExpenseFormValues` (`z.input`) trzyma react-hook-form, `CreateExpenseInput` (`z.infer`) dostaje backend — stąd trzyparametrowy generyk w `useForm`.

### Pieniądze

Kwoty to `Int` w groszach (`amountCents`) w całym stosie — nigdy `Float`. Konwersja z tego, co wpisze użytkownik (akceptuje przecinek), i formatowanie do wyświetlenia siedzą w `packages/types/src/money.ts`. Nie dodawaj równoległych konwersji w komponentach.

## Pułapki wersji

Stos jest świeży i kilka rzeczy działa inaczej, niż podpowiada pamięć o starszych wersjach:

- **Next 16 przemianował `middleware.ts` na `proxy.ts`** — plik eksportuje funkcję `proxy`, nie `middleware`. Oba appy mają swój, o różnych zadaniach: backendowy robi CORS i weryfikację tokenu, frontendowy tylko tanie sprawdzenie obecności cookie (właściwa autoryzacja jest w `(dashboard)/layout.tsx`). **Plik musi leżeć na tym samym poziomie co `app`** — tu obie aplikacje mają `app` w `src/`, więc `proxy.ts` jest w `apps/{backend,frontend}/src/proxy.ts`, NIE w korzeniu pakietu. Przy złej lokalizacji Next **nie zgłasza błędu** — proxy po prostu nigdy się nie uruchamia (zero logów z jego wnętrza), a każdy request przechodzi prosto do route handlera. Jeśli token z `/api/auth/login` daje 401 mimo poprawnego `AUTH_SECRET`, to pierwsze podejrzenie.
- **Prisma 7 nie przyjmuje `url` w bloku `datasource`** — schemat się nie zwaliduje (P1012). Connection string jest w `packages/db/prisma.config.ts`, a `PrismaClient` łączy się przez driver adapter `@prisma/adapter-pg` przekazany w konstruktorze. Generator to `prisma-client` (nie `prisma-client-js`) z **wymaganym** `output`; klient ląduje w `packages/db/src/generated/`, które jest w `.gitignore`.
- Generator `prisma-client` nie ładuje `.env` sam. Skrypty CLI (seed, migracje) muszą zaimportować `packages/db/src/load-env.ts` **przed** `src/index.ts`; aplikacje dostają env z `next.config.ts`.
- **Jeden wspólny `.env` leży w korzeniu monorepo**, a Next szuka go tylko w katalogu aplikacji — dlatego oba `next.config.ts` dociągają go przez `dotenv`. Dodając trzecią aplikację, powtórz ten zabieg.
- **Tailwind v4 nie ma `tailwind.config.js`** — motyw i tokeny shadcn/ui są w `apps/frontend/src/app/globals.css`. `components.json` celowo ma pusty `tailwind.config`.
- `next-auth` jest w becie (`5.0.0-beta.32`), wersja przypięta dokładnie, bez `^`.
- **Cztery zależności są celowo niższe niż tag `latest` — nie podbijaj ich bez sprawdzenia.** TypeScript stoi na `^6.0.3`, bo `typescript-eslint` 8.70 odmawia startu na TS 7.0. ESLint stoi na `^9.39.5`, bo `eslint-plugin-react` 7.37.5 woła usunięte w ESLint 10 `context.getFilename()`. Prisma stoi na `^7.10.0`, bo `latest` to `8.0.0-rc`. `next-auth` — jak wyżej.
- TS 6 deprecjonuje `baseUrl` (błąd TS5101). `paths` w obu `tsconfig.json` liczą się względem pliku tsconfig, bez `baseUrl` — nie dodawaj go z powrotem.
- **Turbopack (Next 16) nie rozwiązuje relatywnych importów `./plik.js` wskazujących na `./plik.ts`** wewnątrz pakietów z `transpilePackages` — "Module not found: Can't resolve './plik.js'", zarówno w zwykłych route'ach jak i w `proxy.ts`. `tsx` (seed, migracje) toleruje oba warianty. Dlatego `packages/types` i `packages/db` mają te importy **bez** rozszerzenia — zobacz "Konwencje" niżej.
- **`pnpm dlx shadcn@latest add ...` generuje dziś import `cn` z pakietu npm `cn`**, nie z `@/lib/utils`, mimo że `components.json` ma `"utils": "@/lib/utils"` — ten alias CLI ignoruje dla samego helpera `cn`. Repo ma już `cn` w `lib/utils.ts` (przez `clsx`+`tailwind-merge`, oba i tak zależnościami). Po każdym `shadcn add` podmień `from "cn"` na `from "@/lib/utils"` w nowych plikach `components/ui/*` i usuń pakiet `cn` z `package.json` — inaczej powstają dwie równoległe implementacje tej samej funkcji. `class-variance-authority` CLI też potrafi wpisać do importu bez dodania do `package.json` — sprawdź `pnpm typecheck` po każdym dodaniu komponentu.

## Konwencje

- Wewnątrz aplikacji Next importy idą przez alias `@/*` (→ `src/*`), bez rozszerzeń. W `packages/*` — ścieżki względne **bez** rozszerzenia (`./money`, nie `./money.js`). Do niedawna dokumentacja tu zalecała rozszerzenie `.js` (bo kod jest ESM-owy i uruchamiany też poza bundlerem, np. przez `tsx`) — `tsx` faktycznie obsługuje oba warianty, ale Turbopack (patrz "Pułapki wersji") nie rozwiązuje `.js` wskazującego na `.ts`, więc rozszerzenie zdjęto ze wszystkich plików w `packages/types` i `packages/db/src/index.ts`. `packages/db/prisma/seed.ts` (uruchamiany wyłącznie przez `tsx`, nigdy bundlowany) nadal może używać obu form.
- Komentarze i komunikaty w kodzie są po polsku, bez znaków diakrytycznych (repo powstało w środowisku, gdzie były problematyczne). Trzymaj się tego w istniejących plikach.
- Odpowiedzi backendu mają jednolity kształt: helpery `ok`/`created`/`noContent`/`fail` z `apps/backend/src/lib/http.ts`, błędy zgodne z `apiErrorSchema`. Nie zwracaj gołego `Response.json` z własnym kształtem błędu.
- Klucze cache'a TanStack Query są scentralizowane w `apps/frontend/src/lib/query-keys.ts`; mutacja unieważnia całe gałęzie (`queryKeys.expenses.all`), nie pojedyncze wpisy.
