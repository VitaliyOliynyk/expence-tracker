# Reguły Code Review

Checklista dla recenzenta (człowieka i Claude) zmian w Expence Tracker. Nie
zastępuje dokumentacji — każda reguła ma źródło w `CLAUDE.md` (korzeń),
`apps/backend/CLAUDE.md` albo `apps/frontend/CLAUDE.md`, i to tam jest jej
uzasadnienie. Gdy reguła tu i w CLAUDE.md się rozjadą, wygrywa CLAUDE.md, a
ten plik trzeba poprawić.

## Priorytety

Każde znalezisko oznacz poziomem:

- **🔴 Blokuje merge** — dziura w izolacji danych lub auth, błąd na
  pieniądzach, złamany kontrakt `packages/types`, błąd poprawności, czerwony
  `lint`/`typecheck`/`build`, zmiana schematu bez migracji.
- **🟡 Do poprawy przed mergem** — naruszenie granic modułów (CQRS, FSD),
  obejście helperów (`fail`, `apiFetch`, `queryKeys`, `money.ts`), brak
  aktualizacji CLAUDE.md, niespójność z wzorcem.
- **🟢 Sugestia** — czytelność, nazewnictwo, drobne uproszczenia. Nie blokuje.

Nie zgłaszaj formatowania — to robi Prettier (`pnpm format:check`).

## 1. Bezpieczeństwo i izolacja danych (🔴)

- [ ] `userId` pochodzi **wyłącznie** z `requireUserId(request)`
      (`apps/backend/src/lib/auth-context.ts`). Każde użycie `userId` z body,
      query albo parametru ścieżki to IDOR — także we frontendzie: `userId`
      nie trafia do żadnego payloadu wysyłanego do API.
- [ ] Każde zapytanie w serwisie/repozytorium jest zawężone do `userId`.
- [ ] Modyfikacje i usunięcia idą przez `updateMany`/`deleteMany` z
      `where: { id, userId }`, nie przez `update`/`delete` po samym `id`.
      `count === 0` → `404` bez rozróżniania "nie ma" od "nie twoje".
- [ ] Referencja do innego zasobu użytkownika (np. `categoryId`) jest
      sprawdzona pod kątem własności (wzór: `categoryBelongsToUser`).
- [ ] Nowy publiczny endpoint jest dopisany do `PUBLIC_PATHS` w
      `apps/backend/src/proxy.ts` — i naprawdę ma być publiczny.
      Endpointy z danymi użytkownika (np. `/api/auth/me`) tam nie trafiają.
- [ ] `proxy.ts` nadal **nadpisuje** `x-user-id` (nie tylko ustawia, gdy go
      brak) i leży w `src/`, obok `app` — w złej lokalizacji Next go po cichu
      pomija.
- [ ] Hasło hashuje/weryfikuje tylko `@expence/auth`
      (`hashPassword`/`verifyPassword`). Brak kopii scrypt w aplikacjach.
- [ ] `passwordHash` nie wychodzi poza moduł `user` — ani w DTO, ani w
      wyniku komendy/zapytania, ani w logach.
- [ ] Cookie sesji Auth.js nie jest przekazywane do backendu; backend nie
      czyta cookies. `/api/token` ma `Cache-Control: no-store`.
- [ ] Każda zmiana tożsamości w karcie (logowanie, rejestracja, wylogowanie,
      przełączanie konta) kończy się `navigateWithFreshSession()`, a Server
      Action **nie** robi `redirect()`.
- [ ] Nowa chroniona sekcja UI jest pod `(dashboard)` **i** w `matcher`
      frontendowego `proxy.ts`. Sama obecność cookie w proxy to nie
      autoryzacja — właściwą jest `auth()` w layoucie.
- [ ] Brak sekretów, tokenów i danych osobowych w kodzie, logach i
      `console.error`. Nowa zmienna środowiskowa ma wpis w `.env.example`.

## 2. Pieniądze (🔴)

- [ ] Kwoty to `Int` w groszach (`amountCents`) — w schemacie Prismy, DTO,
      serwisach i stanie UI. Żadnego `Float`, `Decimal` ani kwoty w złotych
      w pamięci.
- [ ] Konwersja wejścia i formatowanie tylko przez
      `packages/types/src/money.ts`. Ręczne `* 100`, `/ 100`, `toFixed`,
      `Intl.NumberFormat` w komponencie lub serwisie to równoległa konwersja.
- [ ] Do API idzie `z.input` (surowe `form.getValues()`), nie wynik
      resolvera — inaczej kwota zostanie przemnożona przez 100 drugi raz.

## 3. Kontrakt `packages/types` (🔴/🟡)

- [ ] Nowa lub zmieniona reguła walidacji zaczyna się w schemacie Zod w
      `packages/types`. Walidacja dopisana osobno w handlerze albo
      komponencie to druga, rozjeżdżająca się definicja.
- [ ] Backend waliduje body/query przez `parseJsonBody`/`parseQuery` z tym
      schematem; formularz przez `standardSchemaResolver` z tym samym.
- [ ] Schematy z transformacją mają w `useForm` trzyparametrowy generyk
      (`FormValues` = `z.input`, wynik = `z.infer`).
- [ ] Błędy API mają kształt `apiErrorSchema` i jeden z kodów
      `BAD_REQUEST`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`INTERNAL`.
      Zmiana kształtu odpowiedzi to zmiana łamiąca — sprawdź konsumenta w
      `apps/frontend`.

## 4. Backend (`apps/backend`)

- [ ] Brak stron, layoutów i cookies — tylko route handlery `/api/*`.
- [ ] Handler jest cienki: `requireUserId` → `parseJsonBody`/`parseQuery` →
      `dispatch(...)` → mapowanie błędów domenowych na HTTP. Logika biznesowa
      w serwisie modułu.
- [ ] Odpowiedzi wyłącznie przez `ok`/`created`/`noContent`/`fail` z
      `src/lib/http.ts`. Goły `Response.json` z własnym kształtem błędu to
      🟡 (jedyny wyjątek: 401 w `proxy.ts`).
- [ ] Nieznany błąd → `console.error("<METODA> <ścieżka>", error)` +
      `fail("INTERNAL", ...)`. Błędy domenowe to klasy w `*.errors.ts`.
- [ ] Moduły CQRS rozmawiają ze sobą **tylko przez szynę**. Import spoza
      modułu dotyczy wyłącznie `*.messages.ts` (route handler może dodatkowo
      importować `*.errors.ts`). Import cudzego `*.service.ts`,
      `*.repository.ts` albo Prismy z innego modułu to 🟡.
- [ ] Tylko repozytorium dotyka `prisma` z `@expence/db`.
- [ ] Komenda zmienia stan i ma dokładnie jednego handlera; zapytanie tylko
      czyta. Payload wiadomości zawiera `userId`.
- [ ] Nowy moduł ma `register<Nazwa>Handlers` wywołane w
      `src/server/bus/index.ts`; serwisy dostają `dispatch` jako argument,
      nie importują singletonu szyny (cykl importów).
- [ ] Nowy endpoint jest w tabeli "Endpointy" w `apps/backend/CLAUDE.md`.

## 5. Frontend (`apps/frontend`)

- [ ] Każde wywołanie backendu z przeglądarki idzie przez `apiFetch` z
      `src/lib/api-client.ts`. Goły `fetch` na `NEXT_PUBLIC_API_URL` to 🟡.
- [ ] `src/auth.ts` nie dotyka Prismy ani hasha — `authorize()` woła
      backend przez `src/lib/auth-api.ts`.
- [ ] **FSD:** import tylko w dół (`app` → `widgets` → `features` →
      `entities` → shared: `components/ui`, `lib/*`). Import w górę albo w
      bok między slice'ami tej samej warstwy to 🟡.
- [ ] Import spoza slice'a idzie przez jego `index.ts`
      (`@/features/auth/login`), nigdy w głąb (`.../ui/login-form`). Nowy
      eksport jest dopisany do `index.ts`.
- [ ] `app/**/page.tsx` i `layout.tsx` tylko komponują (guard `auth()`,
      widget, feature) — zero logiki biznesowej.
- [ ] Zapytania w `entities/*/api`, mutacje w `features/*/*/api`. Mutacje
      nie trafiają do encji.
- [ ] Klucze TanStack Query tylko z `src/lib/query-keys.ts`, nigdy inline.
      Mutacja unieważnia całe gałęzie (`queryKeys.transactions.all`,
      `queryKeys.summary.all`), nie pojedyncze wpisy.
- [ ] Formularze: react-hook-form + `standardSchemaResolver`; błędy
      `ApiRequestError.fields` przepisane do `form.setError`.
- [ ] `useSearchParams` jest pod granicą `<Suspense>` (inaczej `pnpm build`
      pada na prerenderingu).
- [ ] Daty z `<input type="date">` przez `src/lib/date.ts` (dzień zapisany
      jako południe czasu lokalnego).
- [ ] Nowe prymitywy shadcn/ui w `src/components/ui/` importują `cn` z
      `@/lib/utils`, nie z pakietu `cn`; pakiet `cn` nie pojawił się w
      `package.json`. Prymityw nie jest edytowany pod jeden przypadek użycia.
- [ ] Nowy kod nie duplikuje `components/ui` ani `lib/*` pod katalogiem
      `shared/`.
- [ ] Ikony z `lucide-react`; motyw w `src/app/globals.css` (brak
      `tailwind.config.js`).

## 6. Baza danych i pakiety

- [ ] Zmiana `schema.prisma` ma w tym samym branchu migrację, a seed nadal
      działa. Nowa relacja do danych użytkownika ma `userId` i przemyślane
      `onDelete`.
- [ ] Brak `url` w bloku `datasource` (Prisma 7 — P1012); generator
      `prisma-client` z `output`. Brak commitowanego
      `packages/db/src/generated/`.
- [ ] Skrypty CLI importują `load-env.ts` **przed** `src/index.ts`.
- [ ] W `packages/*` importy względne **bez** rozszerzenia (`./money`, nie
      `./money.js`) — Turbopack nie rozwiąże `.js` → `.ts`. Wyjątek:
      `packages/db/prisma/seed.ts`.
- [ ] `packages/*` nie importują niczego z `apps/*`.
- [ ] Wewnątrz aplikacji importy przez alias `@/*`, bez rozszerzeń.

## 7. Zależności i konfiguracja

- [ ] Nie podbito celowo przypiętych wersji: TypeScript `^6.0.3`, ESLint
      `^9.39.5`, Prisma `^7.10.0`, `next-auth` `5.0.0-beta.32` (dokładnie,
      bez `^`). Podbicie wymaga osobnego brancha `chore/` i uzasadnienia.
- [ ] Brak `baseUrl` w `tsconfig.json` (TS5101).
- [ ] Brak `middleware.ts` — w Next 16 to `proxy.ts` z eksportem `proxy`.
- [ ] `next-env.d.ts` nie jest commitowany; `apps/*/AGENTS.md` i pierwsza
      linia `@AGENTS.md` w `apps/*/CLAUDE.md` nie są usuwane.

## 8. Konwencje kodu (🟢/🟡)

- [ ] Komentarze i komunikaty w kodzie po polsku, **bez** znaków
      diakrytycznych (dokumentacja `.md` może je mieć).
- [ ] Nowy kod wygląda jak otaczający: nazewnictwo plików
      (`<modul>.service.ts`, kebab-case w slice'ach FSD), gęstość
      komentarzy, idiomy.
- [ ] Brak martwego kodu, zakomentowanych bloków i `console.log` (poza
      `console.error` w obsłudze błędów).

## 9. Proces i dokumentacja (🟡)

- [ ] Zmiana jest na branchu `<typ>/<opis>` (`feature/`, `fix/`,
      `refactor/`, `docs/`, `chore/`), nie na `master`.
- [ ] Jeden branch = jedna intencja. Niezwiązane zmiany "przy okazji" (np.
      migracja `categories` na CQRS/FSD) to osobny branch — zgłoś je.
- [ ] Commity wg Conventional Commits po polsku:
      `<typ>[(zakres)][!]: <opis>`; zmiana łamiąca oznaczona `!` albo
      `BREAKING CHANGE:`.
- [ ] Branch zrebase'owany na aktualny `master`; `pnpm lint`,
      `pnpm typecheck` i `pnpm build` przechodzą.
- [ ] Jeśli zmiana zmienia to, co opisuje któryś CLAUDE.md ("Stan
      repozytorium", "Czego jeszcze nie ma", tabele endpointów i tras),
      aktualizacja jest w tym samym branchu.
- [ ] Brak runnera testów — opis zmiany mówi, jak ją sprawdzono (curl wg
      `apps/backend/CLAUDE.md`, przeglądarka na :3000 z kontem
      `dev@expence.local`). Zmiana dotykająca izolacji danych: sprawdzenie
      dwoma tokenami (zasób A → `404` dla B).

## Znane wyjątki — nie zgłaszaj

Te odstępstwa od reguł są świadome i opisane w CLAUDE.md. Zgłoś je tylko
wtedy, gdy zmiana je **rozszerza** (np. nowy kod w starym stylu).

- Kategorie w backendzie są poza szyną CQRS (`category.service.ts` wołany
  wprost z route'ów, `mappers.ts`).
- `transaction.repository.ts` czyta `prisma.category` bezpośrednio
  (`categoryBelongsToUser`, `findCategoriesByIds`) — do czasu migracji
  kategorii.
- Repozytorium modułu `user` robi `update({ where: { id } })` — `id` to sam
  właściciel rekordu.
- 401 w backendowym `proxy.ts` zwracany bez helpera `fail` (ten sam kształt).
- Kategorie we frontendzie w starym płaskim układzie
  (`components/categories/`, `hooks/`); nowe slice'y FSD mogą z nich
  korzystać jak z `shared`.
- `hooks/use-summary.ts` bez konsumenta; karty podsumowania czytają `totals`
  z listy transakcji.
- `totals` w `GET /api/transactions` liczone **bez** filtra `type` — celowo.
- Brak API i UI dla `Budget` mimo modelu w schemacie.

## Pliki generowane automatycznie

Pliki, które wypluwają narzędzia, nie są recenzowane linia po linii — nie
zgłaszaj w nich stylu, formatowania, długości ani nazewnictwa. Recenzuje się
tylko to, **czy ich zmiana jest uzasadniona** zmianą w kodzie źródłowym.

### Śledzone w repo — przejrzyj pobieżnie

| Plik                                                         | Generuje          | Co jednak sprawdzić                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-lock.yaml`                                             | `pnpm install`    | Zmienia się razem z którymś `package.json` — lockfile bez zmiany zależności (albo odwrotnie) to 🟡. Podbicie przypiętych wersji (sekcja 7) widać też tutaj.                                                                                                                                  |
| `packages/db/prisma/migrations/migration_lock.toml`          | Prisma            | Nie powinien się zmieniać (provider to `postgresql`).                                                                                                                                                                                                                                        |
| `packages/db/prisma/migrations/<data>_<nazwa>/migration.sql` | `pnpm db:migrate` | Nie oceniaj stylu SQL. Sprawdź tylko, czy nowa migracja odpowiada zmianie w `schema.prisma` i czy nie gubi danych (`DROP`, `NOT NULL` bez `DEFAULT` na niepustej tabeli). **Edycja już istniejącej migracji to 🔴** — Prisma pilnuje sum kontrolnych, a zaaplikowana migracja jest historią. |
| `apps/frontend/src/components/ui/*.tsx`                      | `shadcn add`      | Nie recenzuj kodu prymitywu. Sprawdź tylko import `cn` z `@/lib/utils` i to, że prymityw nie był ręcznie przerabiany pod jeden przypadek (sekcja 5).                                                                                                                                         |
| `apps/*/AGENTS.md`                                           | `next dev`        | Nie zgłaszaj zmian bloku reguł dopisanego przez Next. Zgłoś jego usunięcie.                                                                                                                                                                                                                  |

### Poza repo — ich pojawienie się w diffie to 🟡

Są w `.gitignore` albo nie powinny istnieć w repo pnpm. Jeśli trafiły do
zmiany, zgłoś sam fakt ich dodania, nie ich treść:

- katalogi zależności i buildu: `node_modules/`, `.pnpm-store/`, `.next/`,
  `out/`, `dist/`, `build/`, `coverage/`;
- `*.tsbuildinfo` (przyrostowy `tsc`) i `next-env.d.ts` (Next —
  `dev`/`build`/`typegen`);
- `packages/db/src/generated/` (klient Prismy z `pnpm db:generate`);
- logi: `*.log`, `npm-debug.log*`, `pnpm-debug.log*`;
- obce lockfile'y: `package-lock.json`, `yarn.lock`, `bun.lockb` — znak, że
  ktoś zainstalował zależności nie tym menedżerem;
- lokalne pliki Claude Code: `.claude/settings.local.json`,
  `.claude/scheduled_tasks.lock`, `.claude/scheduled_tasks.json`,
  `.claude/worktrees/`, `.claude/checkpoints/` i podobne stany runtime'u.
  Uwaga: repo **nie** ignoruje ich w `.gitignore` (tylko lokalna konfiguracja
  gita autora), więc na innym klonie łatwo je przypadkiem zacommitować.
  Śledzone celowo są `.claude/memory/`, `.claude/templates/`,
  `.claude/prompts/`, `.claude/plans/` i `.claude/analyze/`.

**Wyjątek od 🟡:** `.env` albo dowolny `.env.*` poza `.env.example` w diffie
to **🔴** — to wyciek sekretów (`AUTH_SECRET`, `DATABASE_URL`), a sekret
trzeba po nim zrotować, nie tylko usunąć z commita.
