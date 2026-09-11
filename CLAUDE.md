# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mapa dokumentacji

Ten plik opisuje to, co wspólne dla całego monorepo: cel projektu, stos,
komendy, pracę z branchami, przepływ autoryzacji między aplikacjami,
kontrakt `packages/types`, pieniądze, pułapki wersji i konwencje.
Szczegóły konkretnej aplikacji mieszkają obok jej kodu:

- **`apps/backend/CLAUDE.md`** — API `/api/*`: `proxy.ts` (CORS, token),
  szyna CQRS i moduły `user`/`auth`/`transaction`, wzorzec route handlera,
  izolacja danych w serwisach, sprawdzanie curl-em.
- **`apps/frontend/CLAUDE.md`** — UI i sesja: Auth.js, mennica tokenów
  `/api/token`, `api-client.ts`, Feature-Sliced Design, TanStack Query,
  shadcn/ui i Tailwind 4.

Claude Code dociąga plik podrzędny dopiero przy pracy na plikach z danego
katalogu. Zmiana, która dotyka obu aplikacji (np. nowy endpoint i jego
konsument w UI), wymaga przeczytania obu. Reguła, która obowiązuje w więcej
niż jednym miejscu, trafia tutaj, nie do pliku aplikacji.

### Pamięć Claude

Wspomnienia Claude o tym projekcie (feedback, decyzje, kontekst) mieszkają w
repo, w `.claude/memory/` — nie w `~/.claude` ani globalnie. Jeden fakt to
jeden plik, a indeks poniżej ładuje się w każdej sesji:

@.claude/memory/MEMORY.md

## Przegląd projektu

Expence Tracker to wieloużytkownikowa aplikacja webowa do śledzenia
finansów osobistych: użytkownik zakłada konto, prowadzi własne kategorie i
zapisuje transakcje (przychody i wydatki), a panel pokazuje listę z filtrami
oraz podsumowanie przychodów, wydatków i salda za wybrany okres. Dane
każdego użytkownika są od siebie odizolowane — to twardy wymóg, na którym
opiera się cała autoryzacja (patrz "Architektura").

Projekt powstaje w ramach kursu pracy z Claude Code, więc oprócz samej
aplikacji ważne są czytelne granice modułów (CQRS w backendzie, FSD we
frontendzie) i dokumentacja decyzji w plikach CLAUDE.md. Schemat bazy ma już
model `Budget` (limity na kategorię i okres), ale nie ma jeszcze do niego API
ani UI.

### Stan repozytorium

Zależności są zainstalowane, `.env` utworzony, klient Prismy wygenerowany,
Postgres wstaje w kontenerze, `pnpm lint` i `pnpm typecheck` przechodzą na
zero błędów. Pierwsza migracja istnieje i jest zaaplikowana, seed działa
i tworzy `dev@expence.local` z realnym hasłem (`dev12345`). Wczesny model
`Expense` (i `/api/expenses`) usunęła migracja `remove_expense` — jedynym
modelem ruchów pieniędzy jest `Transaction`.

Backend (auth, transakcje, podsumowanie, kategorie) i frontend (logowanie,
rejestracja, strona `/transactions`) są zaimplementowane i zweryfikowane
end-to-end. Szczegółowy stan każdej aplikacji opisuje jej własny CLAUDE.md.

**Czego jeszcze nie ma (w całym repo):** runnera testów (ani Vitest, ani
Playwright) oraz API i UI dla `Budget`. Braki konkretnej aplikacji są
wypisane w jej CLAUDE.md.

## Stos technologiczny

Monorepo **pnpm** (workspaces, `pnpm@10`), Node `>=20.9`, **TypeScript 6**
w trybie ESM we wszystkich pakietach.

| Warstwa | Technologie |
| --- | --- |
| Frontend (`apps/frontend`, :3000) | Next.js 16 (App Router, Turbopack), React 19, Auth.js / `next-auth` 5 beta (Credentials, sesja JWT), TanStack Query 5, react-hook-form + `@hookform/resolvers`, Tailwind CSS 4, shadcn/ui (Radix UI, `lucide-react`) |
| Backend (`apps/backend`, :3001) | Next.js 16 — wyłącznie route handlery `/api/*`, własna szyna CQRS, `jose` (JWT HS256) |
| Baza danych (`packages/db`) | PostgreSQL 17 (Docker Compose), Prisma 7 (generator `prisma-client`, driver adapter `@prisma/adapter-pg`), seed przez `tsx` |
| Kontrakt (`packages/types`) | Zod 4 — schematy współdzielone przez backend i formularze |
| Auth (`packages/auth`) | hashowanie haseł (scrypt z `node:crypto`), podpis/weryfikacja tokenu API (`jose`) |
| Narzędzia (`packages/config`) | wspólne `tsconfig` i ESLint 9 (`eslint-config-next`), Prettier 3 |

Testów automatycznych na razie nie ma (patrz "Czego jeszcze nie ma"). Wersje,
które celowo nie są `latest`, opisuje "Pułapki wersji".

## Komendy

### Bootstrap

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

### Codzienna praca

Wszystkie z korzenia repo:

| Komenda | Efekt |
| --- | --- |
| `pnpm dev` | frontend :3000 i backend :3001 równolegle |
| `./start-backend.sh` / `./start-frontend.sh` | jedna aplikacja w trybie dev; backendowy najpierw podnosi Postgresa i czeka na healthcheck |
| `./stop-backend.sh` / `./stop-frontend.sh` | zatrzymanie serwera dev na jego porcie (odpowiednik Ctrl+C) |
| `pnpm build` | `prisma generate`, potem build obu aplikacji |
| `pnpm typecheck` / `pnpm lint` | we wszystkich pakietach naraz |
| `pnpm format` / `format:check` | Prettier na całym repo (zapis / tylko sprawdzenie) |
| `pnpm db:up` / `db:down` / `db:reset` | kontener Postgresa (`db:reset` kasuje wolumen) |
| `pnpm db:migrate` / `db:generate` | nowa migracja z `schema.prisma` / wygenerowanie klienta (po każdej migracji) |
| `pnpm db:seed` / `db:studio` | dane startowe, Prisma Studio |

Testy: brak runnera — nie ma komendy `pnpm test`. Do czasu jego dodania
weryfikacją są `pnpm lint`, `pnpm typecheck`, `pnpm build` i ręczne
sprawdzenie (curl — patrz `apps/backend/CLAUDE.md`, przeglądarka).

Pojedynczy pakiet: `pnpm --filter @expence/backend <skrypt>`. Nazwy: `@expence/frontend`, `@expence/backend`, `@expence/db`, `@expence/types`, `@expence/auth`, `@expence/config`.

## Praca z branchami (GitHub flow)

Repo pracuje wg [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow).
Gałąź główna to **`master`** (nie `main`) i jest zawsze w stanie działającym.

- **Nie commituj bezpośrednio do `master`.** Każda zmiana — feature, poprawka,
  dokumentacja — powstaje na osobnym branchu odbitym od aktualnego `master`
  (`git switch master && git switch -c feature/<nazwa>`).
- **Nazwy branchy:** `<typ>/<opis>`, opis w kebab-case po angielsku, krótko.
  Typy: `feature/` (nowa funkcjonalność, np. `feature/main-page`), `fix/`
  (poprawka błędu), `refactor/` (zmiana struktury bez zmiany zachowania, np.
  migracja `categories` na FSD), `docs/` (tylko dokumentacja),
  `chore/` (zależności, skrypty, konfiguracja).
- **Jeden branch = jedna intencja.** Nie dorzucaj niezwiązanych zmian "przy
  okazji" — zauważony problem poza zakresem to osobny branch.
- **Branch krótkożyciowy.** Przed mergem zaktualizuj go względem `master`
  przez `git fetch && git rebase origin/master`. Branche mają jednego autora,
  więc przepisanie historii jest bezpieczne — jeśli branch był już
  wypchnięty, po rebase wypychasz go przez `git push --force-with-lease`
  (tylko własny branch, nigdy `master`).

  <important if="Trzeba napisać commit">
- **Commity** małe i spójne, opis po polsku (jak w dotychczasowej historii),
  wg [Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/):
  `<typ>[(zakres)][!]: <opis>`, np. `feat(transactions): dodaj filtr po dacie`.
  Typy: `feat` (nowa funkcjonalność), `fix` (poprawka błędu), `docs`
  (dokumentacja), `refactor` (zmiana struktury bez zmiany zachowania), `test`,
  `build`, `ci`, `chore`. Zakres w nawiasie jest opcjonalny (np. moduł albo
  slice: `auth`, `transactions`). Zmiana łamiąca kompatybilność: `!` po
  typie/zakresie (`feat!:`) albo stopka `BREAKING CHANGE: <opis>` w treści
  commita.
  </important>

- **Warunki mergu** — na branchu, po rebase:
  - `pnpm lint` i `pnpm typecheck` przechodzą na zero błędów, `pnpm build` się
    buduje;
  - zmiana `schema.prisma` ma w tym samym branchu migrację
    (`pnpm db:migrate`), a seed nadal działa;
  - jeśli feature zmienia to, co opisuje któryś CLAUDE.md (np. "Stan
    repozytorium", "Czego jeszcze nie ma" — w korzeniu albo w aplikacji),
    aktualizacja dokumentacji jest częścią brancha.
- **Remote:** `origin` to GitHub
  (`git@github.com:VitaliyOliynyk/expence-tracker.git`, SSH), a `gh` jest
  zalogowane — PR-y zakładasz i scalasz z terminala.
- **Pull request:** `git push -u origin <branch>`, potem
  `gh pr create --base master` (tytuł jak commit, wg Conventional Commits).
  Otwarcie i każdy push do PR uruchamia workflow
  `.github/workflows/claude-code-review.yml` — Claude recenzuje zmianę
  (plugin `code-review`) i zostawia komentarze inline. Wzmianka `@claude` w
  komentarzu do PR lub issue uruchamia `.github/workflows/claude.yml`.
  Reguły recenzji: `apps/REVIEW.md`.
- **Merge:** po review, commitem mergu —
  `gh pr merge <nr> --merge --delete-branch` (odpowiednik
  `git merge --no-ff`: w historii zostaje widoczna granica feature'a). Nie
  używaj `--squash` ani `--rebase`. Nigdy force-push na `master`.
- **Po mergu** zsynchronizuj lokalny `master` i usuń branch:
  `git switch master && git pull && git branch -d <branch>`.
- **Dla Claude:** przed rozpoczęciem zadania sprawdź `git branch --show-current`;
  jeśli to `master`, najpierw utwórz branch wg reguł wyżej. Commit, push,
  założenie PR i merge tylko na wyraźną prośbę użytkownika.

## Architektura

Dwie **osobne** aplikacje Next.js w jednym monorepo pnpm. `apps/frontend` to całe UI plus sesja; `apps/backend` to wyłącznie route handlery `/api/*` — nie ma tam żadnej strony ani root layoutu i nie powinno przybyć. Pakiety `packages/*` są współdzielone i nie znają żadnej z aplikacji.

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
                                          │  authorize() -> POST /api/auth/login
                                          │  GET /api/token
                                          ▼
                              JWT HS256 (sub=userId, exp=10 min)
                                          │
przeglądarka ──(Authorization: Bearer)──→ backend :3001
                                          │  src/proxy.ts → verifyAccessToken(AUTH_SECRET)
                                          ▼
                              handler czyta userId z nagłówka x-user-id
```

Sesja przeglądarki to zaszyfrowane JWE Auth.js, niezwiązane z tokenem API.
Do wywołania `/api/*` frontend **nie** przekazuje dalej tego cookie — bije
osobny, krótkożyciowy token HS256 tym samym `AUTH_SECRET`
(`signAccessToken` z `@expence/auth`), a backend weryfikuje go
`verifyAccessToken` z tego samego pakietu. Stronę frontendu (Auth.js,
`/api/token`, cache tokenu w karcie) opisuje `apps/frontend/CLAUDE.md`,
stronę backendu (`proxy.ts`, `x-user-id`, zawężanie zapytań) —
`apps/backend/CLAUDE.md`.

Reguły, które spinają obie strony:

- **`AUTH_SECRET` musi być identyczny po obu stronach.** Rozjazd = każde żądanie 401 bez czytelnego powodu.
- **`userId` nigdy nie pochodzi z body ani z query** — ani w backendzie, ani w tym, co frontend wysyła. Jedynym źródłem jest zweryfikowany token (szczegóły w `apps/backend/CLAUDE.md`). Przyjęcie `userId` z payloadu otwiera IDOR.
- **Hasła nigdy nie hashuj poza `@expence/auth`.** `hashPassword`/`verifyPassword` (scrypt, `node:crypto`) mieszkają tam jednym miejscem — konsumenci to moduł użytkownika w backendzie i `packages/db/prisma/seed.ts`. Frontend nie ma własnej kopii i nie dotyka hasha.
- **Każda zmiana tożsamości w karcie przeglądarki kończy się pełnym przeładowaniem strony** (logowanie, rejestracja, wylogowanie) — inaczej token API i cache zapytań poprzedniego użytkownika zostają w pamięci karty. Mechanizm opisuje `apps/frontend/CLAUDE.md`.

### Granice modułów

Obie aplikacje stosują tę samą zasadę: moduł ma **jeden plik publiczny**, a
reszta jest szczegółem implementacyjnym. W backendzie to `*.messages.ts`
modułu CQRS (`apps/backend/CLAUDE.md`), we frontendzie `index.ts` w korzeniu
slice'a FSD (`apps/frontend/CLAUDE.md`). Import z pominięciem tej granicy
to błąd architektoniczny, nawet jeśli się kompiluje.

### `packages/types` to kontrakt, nie zbiór interfejsów

Schematy Zod są jedynym źródłem prawdy o kształcie danych i regułach walidacji. Ten sam schemat działa w trzech miejscach: `parseJsonBody`/`parseQuery` w backendzie, `standardSchemaResolver` w formularzach react-hook-form i typowanie odpowiedzi w `api-client.ts`. Zmiana reguły walidacji **zawsze** zaczyna się tutaj — dopisanie jej osobno w handlerze albo w formularzu tworzy drugą, rozjeżdżającą się definicję. Kształt błędu API (`apiErrorSchema`, kody `BAD_REQUEST`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`INTERNAL`) też jest częścią kontraktu.

Uwaga na `createTransactionSchema`: kwota idzie przez `amountInputSchema` z transformacją (tekst "12,50" → 1250 groszy), więc typ wejściowy różni się od wyjściowego. `CreateTransactionFormValues` (`z.input`) trzyma react-hook-form, `CreateTransactionInput` (`z.infer`) wychodzi z resolvera — stąd trzyparametrowy generyk w `useForm`. **W body do API idzie `z.input`** (surowe `form.getValues()`), bo backend sam przepuszcza body przez ten schemat w `parseJsonBody`; wysłanie wyniku walidacji (już w groszach) pomnożyłoby kwotę przez 100 drugi raz.

### Pieniądze

Kwoty to `Int` w groszach (`amountCents`) w całym stosie — nigdy `Float`. Konwersja z tego, co wpisze użytkownik (akceptuje przecinek), i formatowanie do wyświetlenia siedzą w `packages/types/src/money.ts`. Nie dodawaj równoległych konwersji w komponentach ani w serwisach.

### Zmienne środowiskowe

Jeden `.env` w korzeniu (wzór i opis każdej zmiennej: `.env.example`),
współdzielony przez obie aplikacje i `packages/db`. Kluczowe: `DATABASE_URL`,
`AUTH_SECRET` (wspólny!), `NEXT_PUBLIC_API_URL` (przeglądarka → backend),
`API_URL` (serwer frontendu → backend, opcjonalny), `NEXT_PUBLIC_WEB_URL`
(lista originów CORS w backendzie, rozdzielana przecinkami).

## Pułapki wersji

Stos jest świeży i kilka rzeczy działa inaczej, niż podpowiada pamięć o starszych wersjach. Pułapki dotyczące tylko jednej aplikacji (np. Tailwind 4 i shadcn/ui we frontendzie) są opisane w jej CLAUDE.md.

- **Next 16 przemianował `middleware.ts` na `proxy.ts`** — plik eksportuje funkcję `proxy`, nie `middleware`. Oba appy mają swój, o różnych zadaniach (opisane w ich CLAUDE.md). **Plik musi leżeć na tym samym poziomie co `app`** — tu obie aplikacje mają `app` w `src/`, więc `proxy.ts` jest w `apps/{backend,frontend}/src/proxy.ts`, NIE w korzeniu pakietu. Przy złej lokalizacji Next **nie zgłasza błędu** — proxy po prostu nigdy się nie uruchamia (zero logów z jego wnętrza), a każdy request przechodzi prosto do route handlera. Jeśli token z `/api/auth/login` daje 401 mimo poprawnego `AUTH_SECRET`, to pierwsze podejrzenie.
- **Prisma 7 nie przyjmuje `url` w bloku `datasource`** — schemat się nie zwaliduje (P1012). Connection string jest w `packages/db/prisma.config.ts`, a `PrismaClient` łączy się przez driver adapter `@prisma/adapter-pg` przekazany w konstruktorze. Generator to `prisma-client` (nie `prisma-client-js`) z **wymaganym** `output`; klient ląduje w `packages/db/src/generated/`, które jest w `.gitignore`.
- Generator `prisma-client` nie ładuje `.env` sam. Skrypty CLI (seed, migracje) muszą zaimportować `packages/db/src/load-env.ts` **przed** `src/index.ts`; aplikacje dostają env z `next.config.ts`.
- **Jeden wspólny `.env` leży w korzeniu monorepo**, a Next szuka go tylko w katalogu aplikacji — dlatego oba `next.config.ts` dociągają go przez `dotenv`. Dodając trzecią aplikację, powtórz ten zabieg.
- **`next-env.d.ts` jest w `.gitignore` i nie commitujemy go** (zalecenie Next) — generują go `next dev`/`build`/`typegen`, a jego importy przełączają się między `.next/dev/types` (dev) i `.next/types` (build), więc śledzony plik brudził każdy commit. Na czystym klonie go nie ma, dlatego `typecheck` w obu appach to `next typegen && tsc --noEmit` — samo `tsc` nie znałoby typów Next (importy CSS, obrazów).
- **`apps/*/AGENTS.md` i linię `@AGENTS.md` w `apps/*/CLAUDE.md` utrzymuje `next dev`.** Generator (`next/dist/server/lib/generate-agent-files.js`) dopisuje blok reguł do `AGENTS.md`, a `CLAUDE.md` zostawia w spokoju, dopóki `AGENTS.md` istnieje. Nie usuwaj `AGENTS.md` ani pierwszej linii `CLAUDE.md` aplikacji — bez `AGENTS.md` Next nadpisze `CLAUDE.md` samym `@AGENTS.md` i dokumentacja aplikacji zniknie.
- **Cztery zależności są celowo niższe niż tag `latest` — nie podbijaj ich bez sprawdzenia.** TypeScript stoi na `^6.0.3`, bo `typescript-eslint` 8.70 odmawia startu na TS 7.0. ESLint stoi na `^9.39.5`, bo `eslint-plugin-react` 7.37.5 woła usunięte w ESLint 10 `context.getFilename()`. Prisma stoi na `^7.10.0`, bo `latest` to `8.0.0-rc`. `next-auth` stoi na becie `5.0.0-beta.32` przypiętej dokładnie (patrz `apps/frontend/CLAUDE.md`).
- TS 6 deprecjonuje `baseUrl` (błąd TS5101). `paths` w obu `tsconfig.json` liczą się względem pliku tsconfig, bez `baseUrl` — nie dodawaj go z powrotem.
- **Turbopack (Next 16) nie rozwiązuje relatywnych importów `./plik.js` wskazujących na `./plik.ts`** wewnątrz pakietów z `transpilePackages` — "Module not found: Can't resolve './plik.js'", zarówno w zwykłych route'ach jak i w `proxy.ts`. `tsx` (seed, migracje) toleruje oba warianty. Dlatego `packages/types` i `packages/db` mają te importy **bez** rozszerzenia — zobacz "Konwencje" niżej.

## Konwencje

- Wewnątrz aplikacji Next importy idą przez alias `@/*` (→ `src/*`), bez rozszerzeń. W `packages/*` — ścieżki względne **bez** rozszerzenia (`./money`, nie `./money.js`). Do niedawna dokumentacja tu zalecała rozszerzenie `.js` (bo kod jest ESM-owy i uruchamiany też poza bundlerem, np. przez `tsx`) — `tsx` faktycznie obsługuje oba warianty, ale Turbopack (patrz "Pułapki wersji") nie rozwiązuje `.js` wskazującego na `.ts`, więc rozszerzenie zdjęto ze wszystkich plików w `packages/types` i `packages/db/src/index.ts`. `packages/db/prisma/seed.ts` (uruchamiany wyłącznie przez `tsx`, nigdy bundlowany) nadal może używać obu form.
- Komentarze i komunikaty w kodzie są po polsku, bez znaków diakrytycznych (repo powstało w środowisku, gdzie były problematyczne). Trzymaj się tego w istniejących plikach.
- Konwencje specyficzne dla aplikacji (kształt odpowiedzi backendu, klucze cache'a TanStack Query) są w ich CLAUDE.md.
