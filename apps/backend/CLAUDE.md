@AGENTS.md

# Backend (`@expence/backend`, :3001)

Uzupełnia główny `CLAUDE.md` (stos, komendy, GitHub flow, przepływ
autoryzacji, kontrakt `packages/types`, pieniądze, pułapki wersji) — tamte
reguły obowiązują tu w całości. Pierwszą linię (`@AGENTS.md`) utrzymuje
`next dev`, nie usuwaj jej.

Next.js 16 użyty wyłącznie jako serwer route handlerów `/api/*`: bez stron,
bez root layoutu, bez cookies i bez sesji. Każde żądanie (poza publicznymi)
niesie `Authorization: Bearer <token>` wybity przez frontend.

## Stan

Wszystkie endpointy niżej zostały uruchomione przeciw bazie i zweryfikowane
end-to-end (rejestracja, logowanie, izolacja danych między użytkownikami).

**Czego jeszcze nie ma:** kategorie nie są modułem CQRS (serwis w
`src/server/services/`, route woła go bezpośrednio). `Budget` ma model w
schemacie, ale nie ma API.

## Endpointy

| Metoda i ścieżka | Publiczny | Obsługa |
| --- | --- | --- |
| `GET /api/health` | tak | ping bazy — `{"status":"ok","database":"up"}` |
| `POST /api/auth/register` | tak | `RegisterCommand` (moduł `auth`) → `{ user, token, expiresAt }` |
| `POST /api/auth/login` | tak | `LoginCommand` (moduł `auth`) → `{ user, token, expiresAt }` |
| `GET /api/auth/me` | nie | profil zalogowanego użytkownika |
| `GET`/`POST /api/transactions` | nie | `ListTransactionsQuery` / `CreateTransactionCommand` |
| `GET`/`PATCH`/`DELETE /api/transactions/[id]` | nie | `GetTransactionQuery` / `UpdateTransactionCommand` / `DeleteTransactionCommand` |
| `GET /api/summary` | nie | `GetTransactionSummaryQuery` (moduł `transaction`) |
| `GET`/`POST /api/categories`, `PATCH`/`DELETE /api/categories/[id]` | nie | `category.service.ts` bezpośrednio (jeszcze nie CQRS) |

## Układ `src/`

```
src/
├── proxy.ts                  CORS + weryfikacja tokenu (Next 16: dawny middleware.ts)
├── app/api/**/route.ts       route handlery — cienka warstwa HTTP
├── lib/
│   ├── auth-context.ts       requireUserId(), stała USER_ID_HEADER
│   ├── http.ts               ok/created/noContent/fail, parseJsonBody/parseQuery
│   └── jwt.ts                readBearerToken + re-eksport verifyAccessToken z @expence/auth
└── server/
    ├── bus/                  szyna CQRS: bus.ts, message.ts (defineCommand/defineQuery), index.ts
    ├── modules/{user,auth,transaction}/
    ├── services/category.service.ts   kategorie — stary styl, bez szyny
    └── mappers.ts            toCategoryDto (Prisma → DTO z @expence/types)
```

## `proxy.ts` — CORS i token

`src/proxy.ts` łapie `/api/:path*` i robi po kolei:

1. `OPTIONS` → 204 z nagłówkami CORS (preflight z przeglądarki na :3000).
   Dozwolone originy to `NEXT_PUBLIC_WEB_URL`, lista rozdzielana przecinkami.
2. Ścieżka z `PUBLIC_PATHS` (`/api/health`, `/api/auth/login`,
   `/api/auth/register`) → przepuszcza bez tokenu.
3. W pozostałych przypadkach weryfikuje Bearer (`verifyAccessToken`,
   `AUTH_SECRET`); bez poprawnego tokenu → 401 `UNAUTHORIZED`.
4. Ustawia `x-user-id` = `sub` z tokenu. Nagłówek jest **zawsze nadpisywany**,
   więc klient nie może go podstawić z zewnątrz.

Nowy publiczny endpoint trzeba dopisać do `PUBLIC_PATHS`, inaczej proxy
odetnie go na 401. `/api/auth/me` celowo tam nie jest. Jeśli proxy w ogóle
nie działa (każdy request dochodzi do handlera), sprawdź jego lokalizację —
patrz "Pułapki wersji" w głównym `CLAUDE.md`.

## Izolacja danych — reguły dla handlerów i serwisów

- **`userId` bierzesz wyłącznie z `requireUserId(request)`**
  (`src/lib/auth-context.ts`), który czyta `x-user-id` ustawiony przez proxy.
  Nigdy z body, query ani parametru ścieżki — to otwiera IDOR.
- Serwisy i repozytoria zawężają **każde** zapytanie do `userId`.
  Modyfikacje idą przez `updateMany`/`deleteMany` z `where: { id, userId }`,
  nie przez `update`/`delete` po samym `id`, bo te nie odsieją cudzego
  rekordu. Wynik `count === 0` znaczy "nie ma albo nie twoje" → `404`, bez
  rozróżniania (nie zdradzamy istnienia cudzych rekordów).
- Wyjątek: repozytorium modułu użytkownika modyfikuje `User` przez
  `update({ where: { id } })` — tu `id` **jest** samym rekordem właściciela
  (nie ma osobnego pola `userId`), więc nie ma czego dodatkowo zawężać.
- Referencja do innego zasobu użytkownika (np. `categoryId` w transakcji)
  też musi być sprawdzona pod kątem własności — patrz
  `categoryBelongsToUser` w module `transaction`.

## Wzorzec route handlera

Handler jest cienki: uwierzytelnienie → walidacja → `dispatch` → mapowanie
błędów domenowych na HTTP. Logika biznesowa siedzi w serwisie modułu.
Wzorzec (`src/app/api/transactions/route.ts`):

```ts
export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createTransactionSchema); // schemat z @expence/types
  if (body.error) return body.error;                                   // 400 z polami

  try {
    return created(await dispatch(CreateTransactionCommand({ userId: auth.userId, input: body.data })));
  } catch (error) {
    if (error instanceof TransactionCategoryNotFoundError) {
      return fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", { categoryId: ["Nie znaleziono kategorii"] });
    }
    console.error("POST /api/transactions", error);
    return fail("INTERNAL", "Nie udalo sie zapisac transakcji");
  }
}
```

- **Odpowiedzi tylko przez helpery** `ok`/`created`/`noContent`/`fail` z
  `src/lib/http.ts`. `fail(code, message, fields?)` sam dobiera status z kodu
  i buduje ciało zgodne z `apiErrorSchema`. Nie zwracaj gołego
  `Response.json` z własnym kształtem błędu (jedynym wyjątkiem jest 401 w
  `proxy.ts`, który ma ten sam kształt).
- Body i query zawsze przez `parseJsonBody`/`parseQuery` ze schematem z
  `@expence/types` — nie waliduj ręcznie w handlerze.
- Błędy domenowe to klasy w `*.errors.ts` modułu; handler tłumaczy je na
  kod HTTP. Nieznany błąd → `console.error` z metodą i ścieżką + `INTERNAL`.

## Szyna CQRS i moduły

`src/server/modules/{user,auth,transaction}/` to moduły, które rozmawiają ze
sobą **wyłącznie przez komendy/zapytania na szynie** (`src/server/bus/`),
nigdy przez bezpośredni import cudzych plików — `auth.service.ts` nie widzi
`user.repository.ts` ani Prismy.

- Każdy moduł ma jeden plik `*.messages.ts` — to jedyny plik importowany
  z zewnątrz modułu (definicje wiadomości `defineCommand`/`defineQuery` +
  typy payloadu/wyniku). Reszta (`*.repository.ts`, `*.service.ts`,
  `*.handlers.ts`, `*.mapper.ts`, `*.errors.ts`) jest szczegółem
  implementacyjnym. Route handlery importują dodatkowo `*.errors.ts`, żeby
  zmapować błąd na HTTP.
- Komenda zmienia stan i ma dokładnie jednego handlera; zapytanie tylko
  czyta. `LoginCommand` jest komendą mimo że "czyta" hasło — aktualizuje
  `lastLoginAt`.
- `src/server/bus/index.ts` to jedyne miejsce, które zna komplet handlerów
  wszystkich modułów (`registerUserHandlers`, `registerAuthHandlers`,
  `registerTransactionHandlers`). Szyna celowo **nie** jest cache'owana na
  `globalThis` (w przeciwieństwie do `prisma` w `packages/db/src/index.ts`,
  gdzie cache chroni pulę połączeń): w dev przeżyłaby hot reload z
  handlerami — a przez nie serwisami i klasami błędów — ze starej wersji
  kodu, a wtedy `instanceof` w route handlerze przestaje rozpoznawać błędy
  (np. cudza kategoria w `POST /api/transactions` dawała 500 zamiast 400).
  Podwójnej rejestracji nie ma: `createAppBus()` zawsze zaczyna od pustej
  szyny.
- Serwisy przyjmują `dispatch` jako argument zamiast importować singleton
  z `bus/index.ts` — inaczej powstałby cykl importów (`bus/index.ts` →
  `auth.handlers.ts` → `auth.service.ts` → `bus/index.ts`).
- `passwordHash` nigdy nie przekracza granicy modułu użytkownika: zamiast
  oddawać hash, `VerifyUserCredentialsQuery` zwraca wyłącznie werdykt
  (`{ userId, isActive } | null`).

### Nowy moduł — kolejność kroków

1. `src/server/modules/<nazwa>/` z plikami wg wzorca wyżej; repozytorium
   jako jedyne dotyka `prisma` z `@expence/db`.
2. `<nazwa>.messages.ts` z komendami/zapytaniami; payload zawiera `userId`.
3. `register<Nazwa>Handlers(bus)` w `<nazwa>.handlers.ts` i jego wywołanie w
   `src/server/bus/index.ts`.
4. Schematy wejścia/wyjścia najpierw w `packages/types`, potem route handler.
5. Tabela "Endpointy" w tym pliku i ewentualnie `PUBLIC_PATHS`.

### Moduł `transaction`

- `/api/transactions`, model `Transaction` z typem `INCOME`/`EXPENSE`
  (zastąpił wczesny model `Expense`); obsługuje też `/api/summary` przez
  `GetTransactionSummaryQuery`.
- Lista (`GET /api/transactions`) jest stronicowana — `page`, `perPage`
  (domyślnie 10, max 100) — i zwraca `{ items, page, perPage, total, totals }`.
  `totals` (`incomeCents`/`expenseCents`) liczy się z filtrami daty i
  kategorii, ale **bez** filtra `type`, żeby karty podsumowania we
  frontendzie zawsze pokazywały obie strony.
- Jedyny wyjątek od reguły "tylko przez szynę": `transaction.repository.ts`
  sprawdza własność kategorii (`categoryBelongsToUser`) i dociąga ich nazwy
  do podsumowania (`findCategoriesByIds`) bezpośrednio przez
  `prisma.category`, bo kategorie nie są jeszcze modułem CQRS i nie ma komu
  wysłać zapytania. Po migracji kategorii zamienia się to na `dispatch(...)`.

### Kategorie (poza szyną)

`src/server/services/category.service.ts` + `src/server/mappers.ts`, wołane
wprost z `src/app/api/categories/**`. `Transaction.categoryId` ma
`onDelete: Restrict` — usunięcie kategorii z transakcjami kończy się
`P2003`, które `category.service.ts` tłumaczy na `CategoryInUseError`, a
route na `409 CONFLICT`. Migracja kategorii na moduł CQRS to osobny branch
(`refactor/`), nie zmiana przy okazji.

## Sprawdzenie bez UI

Backend musi działać (`./start-backend.sh` albo `pnpm dev`):

```bash
curl localhost:3001/api/health        # {"status":"ok","database":"up"}
curl -i localhost:3001/api/transactions   # 401 bez tokenu — tak ma być

# rejestracja i logowanie
curl -X POST localhost:3001/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Jan","email":"jan@example.com","password":"tajnehaslo"}'
TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"dev@expence.local","password":"dev12345"}' | jq -r .token)
curl localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
curl "localhost:3001/api/transactions?page=1&perPage=5" -H "Authorization: Bearer $TOKEN"
```

Izolację sprawdzasz dwoma tokenami: zasób utworzony tokenem A musi dawać
`404` przy `PATCH`/`DELETE` tokenem B.

Komendy tylko dla tej aplikacji: `pnpm --filter @expence/backend dev|build|lint|typecheck`.
