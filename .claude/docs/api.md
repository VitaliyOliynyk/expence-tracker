# API — punkty końcowe

Referencja wszystkich endpointów. Źródłem prawdy są route handlery
(`apps/backend/src/app/api/**/route.ts`, `apps/frontend/src/app/api/**`) i
schematy Zod w `packages/types`. Żywa, klikalna wersja backendu:
**Swagger UI pod `http://localhost:3001/api/docs`** (spec:
`/api/openapi.json`) — generowana z tych samych schematów.

Powiązane: [architecture.md](architecture.md), [database.md](database.md).

## 1. Konwencje

| Temat               | Reguła                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bazowy URL backendu | `NEXT_PUBLIC_API_URL` (dev: `http://localhost:3001`)                                                                                                                  |
| Format              | JSON (`Content-Type: application/json`), UTF-8                                                                                                                        |
| Uwierzytelnienie    | `Authorization: Bearer <token>` na każdym endpoincie poza publicznymi                                                                                                 |
| Token               | JWT HS256, ważny **10 minut**; zwracają go `POST /api/auth/login`, `POST /api/auth/register` i (we frontendzie) `GET /api/token`                                      |
| Identyfikatory      | UUID v7 (tekst)                                                                                                                                                       |
| Daty                | ISO 8601 z `Z` na końcu, np. `2026-09-01T10:00:00.000Z`. **Przesunięcie strefy (`+02:00`) jest odrzucane** (`z.iso.datetime()`)                                       |
| Kwoty               | liczby całkowite w **groszach** (`amountCents`), zawsze dodatnie — znak wynika z `type`. Wyjątek: pole wejściowe `amount` (patrz transakcje)                          |
| Waluta              | `PLN` (`DEFAULT_CURRENCY`)                                                                                                                                            |
| Izolacja            | każdy zasób jest widoczny tylko dla właściciela; cudzy zasób zachowuje się jak nieistniejący (`404`)                                                                  |
| CORS                | dozwolone originy z `NEXT_PUBLIC_WEB_URL` (lista po przecinku); metody `GET, POST, PATCH, DELETE, OPTIONS`; nagłówki `Content-Type, Authorization`; `OPTIONS` → `204` |

### Kształt błędu

Każdy błąd zwracany przez handler (i 401 z `proxy.ts`) ma kształt
`apiErrorSchema`:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Nieprawidlowe dane wejsciowe",
    "fields": { "amount": ["Kwota musi byc wieksza od zera"] }
  }
}
```

| `code`         | HTTP | Kiedy                                                                                                              |
| -------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `BAD_REQUEST`  | 400  | body nie jest JSON-em, błąd walidacji body/query (`fields` wypełnione), cudza/nieistniejąca kategoria w transakcji |
| `UNAUTHORIZED` | 401  | brak/niepoprawny/wygasły token; złe dane logowania                                                                 |
| `FORBIDDEN`    | 403  | konto nieaktywne (`User.isActive = false`)                                                                         |
| `NOT_FOUND`    | 404  | zasobu nie ma **albo należy do innego użytkownika**                                                                |
| `CONFLICT`     | 409  | zajęty e-mail, powtórzona nazwa kategorii, kategoria z transakcjami                                                |
| `INTERNAL`     | 500  | złapany, nieoczekiwany błąd zapisu                                                                                 |

Komunikaty walidacji:

| Źródło                | `message`                                        |
| --------------------- | ------------------------------------------------ |
| body nie jest JSON-em | `Body musi byc poprawnym JSON-em` (bez `fields`) |
| błąd schematu body    | `Nieprawidlowe dane wejsciowe` + `fields`        |
| błąd schematu query   | `Nieprawidlowe parametry zapytania` + `fields`   |

> **500 bez kształtu `ApiError`.** Handlery, które nie łapią wyjątków (np.
> `GET /api/transactions` przy niedostępnej bazie), kończą się domyślną
> odpowiedzią 500 Next.js — jej ciało **nie** ma kształtu `ApiError`. Klient
> (`apiFetch`) zamienia je wtedy na `ApiRequestError` z kodem `INTERNAL`.

## 2. Przegląd

### Backend (`:3001`)

| Metoda | Ścieżka                  | Auth      | Sukces     | Obsługa                      |
| ------ | ------------------------ | --------- | ---------- | ---------------------------- |
| GET    | `/api/health`            | publiczny | 200        | ping bazy                    |
| GET    | `/api/openapi.json`      | publiczny | 200        | spec OpenAPI 3.1             |
| GET    | `/api/docs`              | publiczny | 200 (HTML) | Swagger UI                   |
| POST   | `/api/auth/register`     | publiczny | 201        | `RegisterCommand`            |
| POST   | `/api/auth/login`        | publiczny | 200        | `LoginCommand`               |
| GET    | `/api/auth/me`           | Bearer    | 200        | `GetUserByIdQuery`           |
| GET    | `/api/transactions`      | Bearer    | 200        | `ListTransactionsQuery`      |
| POST   | `/api/transactions`      | Bearer    | 201        | `CreateTransactionCommand`   |
| GET    | `/api/transactions/{id}` | Bearer    | 200        | `GetTransactionQuery`        |
| PATCH  | `/api/transactions/{id}` | Bearer    | 200        | `UpdateTransactionCommand`   |
| DELETE | `/api/transactions/{id}` | Bearer    | 204        | `DeleteTransactionCommand`   |
| GET    | `/api/summary`           | Bearer    | 200        | `GetTransactionSummaryQuery` |
| GET    | `/api/categories`        | Bearer    | 200        | `category.service`           |
| POST   | `/api/categories`        | Bearer    | 201        | `category.service`           |
| PATCH  | `/api/categories/{id}`   | Bearer    | 200        | `category.service`           |
| DELETE | `/api/categories/{id}`   | Bearer    | 204        | `category.service`           |

Endpointy publiczne to dokładnie lista `PUBLIC_PATHS` w
`apps/backend/src/proxy.ts`. Każda inna ścieżka `/api/*` bez poprawnego
tokenu dostaje `401` — także nieistniejąca.

### Frontend (`:3000`)

| Metoda   | Ścieżka                   | Auth                 | Opis                                                         |
| -------- | ------------------------- | -------------------- | ------------------------------------------------------------ |
| GET      | `/api/token`              | cookie sesji Auth.js | mennica tokenów API dla przeglądarki                         |
| GET/POST | `/api/auth/[...nextauth]` | —                    | handlery Auth.js (logowanie Credentials, sesja, wylogowanie) |

## 3. System

### `GET /api/health`

Sprawdza backend i bazę (`SELECT 1`). Publiczny.

| Status | Ciało                                          |
| ------ | ---------------------------------------------- |
| 200    | `{ "status": "ok", "database": "up" }`         |
| 503    | `{ "status": "degraded", "database": "down" }` |

### `GET /api/openapi.json`

Dokument OpenAPI 3.1 zbudowany z `src/openapi/document.ts` (cache w
pamięci procesu). Publiczny.

### `GET /api/docs`

Strona HTML ze Swagger UI (`swagger-ui-dist@5.32.15` z jsDelivr) czytająca
`/api/openapi.json`. „Try it out” na chronionych endpointach wymaga tokenu
wklejonego w „Authorize”. Publiczny.

## 4. Auth

### `POST /api/auth/register`

Zakłada konto i od razu zwraca token. Publiczny.

Body (`registerSchema`):

| Pole       | Typ    | Reguły                            |
| ---------- | ------ | --------------------------------- |
| `name`     | string | trim, 1–64 znaki                  |
| `email`    | string | poprawny e-mail; trim + lowercase |
| `password` | string | 8–128 znaków                      |

```json
{ "name": "Jan", "email": "jan@example.com", "password": "tajnehaslo" }
```

| Status | Ciało                                           |
| ------ | ----------------------------------------------- |
| 201    | `AuthResponse` (niżej)                          |
| 400    | błąd walidacji                                  |
| 409    | `CONFLICT` — `Konto z tym adresem juz istnieje` |
| 500    | `INTERNAL` — `Nie udalo sie zarejestrowac`      |

`AuthResponse`:

```json
{
  "user": {
    "id": "01a08d61-6e9a-7c31-a2f4-2b8c5d7e9f10",
    "name": "Jan",
    "email": "jan@example.com",
    "image": null,
    "createdAt": "2026-09-12T08:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresAt": 1789032600000
}
```

`expiresAt` to znacznik czasu w **milisekundach** (epoch).

### `POST /api/auth/login`

Weryfikuje hasło, aktualizuje `lastLoginAt`, zwraca token. Publiczny.

Body (`loginSchema`):

| Pole       | Typ    | Reguły                                                   |
| ---------- | ------ | -------------------------------------------------------- |
| `email`    | string | poprawny e-mail; trim + lowercase                        |
| `password` | string | min. 1 znak (reguła długości celowo nie jest powtarzana) |

| Status | Ciało                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| 200    | `AuthResponse`                                                                                                |
| 400    | błąd walidacji                                                                                                |
| 401    | `UNAUTHORIZED` — `Nieprawidlowy e-mail lub haslo` (ten sam komunikat dla złego hasła i nieistniejącego konta) |
| 403    | `FORBIDDEN` — `Konto jest nieaktywne`                                                                         |
| 500    | `INTERNAL` — `Nie udalo sie zalogowac`                                                                        |

Konto deweloperskie z seeda: `dev@expence.local` / `dev12345`.

### `GET /api/auth/me`

Profil zalogowanego użytkownika. Wymaga tokenu.

| Status | Ciało                                                                        |
| ------ | ---------------------------------------------------------------------------- |
| 200    | `UserDto` (`id`, `name`, `email`, `image`, `createdAt`)                      |
| 401    | brak/niepoprawny token                                                       |
| 404    | `NOT_FOUND` — `Nie znaleziono uzytkownika` (token ważny, ale konto usunięte) |

## 5. Transakcje

`TransactionDto`:

| Pole          | Typ                       | Opis                                                    |
| ------------- | ------------------------- | ------------------------------------------------------- |
| `id`          | uuid                      |                                                         |
| `amountCents` | int > 0                   | kwota w groszach, zawsze dodatnia                       |
| `type`        | `"INCOME"` \| `"EXPENSE"` | przychód / wydatek                                      |
| `description` | string \| null            |                                                         |
| `date`        | ISO datetime              | dzień transakcji (UI zapisuje południe czasu lokalnego) |
| `category`    | `CategoryDto`             | zagnieżdżona kategoria                                  |
| `createdAt`   | ISO datetime              |                                                         |

```json
{
  "id": "01a08d61-7a10-7c31-a2f4-2b8c5d7e9f10",
  "amountCents": 12750,
  "type": "EXPENSE",
  "description": "Zakupy spozywcze",
  "date": "2026-09-05T10:00:00.000Z",
  "category": {
    "id": "01a08d61-7000-7c31-a2f4-2b8c5d7e9f10",
    "name": "Jedzenie",
    "color": "#ef4444",
    "icon": "utensils",
    "createdAt": "2026-09-01T08:00:00.000Z"
  },
  "createdAt": "2026-09-05T10:05:00.000Z"
}
```

### `GET /api/transactions`

Jedna strona listy z licznikiem i sumami. Wymaga tokenu.

Query (`transactionListQuerySchema`):

| Parametr     | Typ                   | Domyślnie | Opis                                                |
| ------------ | --------------------- | --------- | --------------------------------------------------- |
| `dateFrom`   | ISO datetime          | —         | początek zakresu, **włącznie** (`date >= dateFrom`) |
| `dateTo`     | ISO datetime          | —         | koniec zakresu, **włącznie** (`date <= dateTo`)     |
| `type`       | `INCOME` \| `EXPENSE` | —         | filtr typu (nie wpływa na `totals`)                 |
| `categoryId` | uuid                  | —         | filtr kategorii                                     |
| `page`       | int ≥ 1               | `1`       | numer strony                                        |
| `perPage`    | int 1–100             | `10`      | rozmiar strony                                      |

`dateFrom` > `dateTo` → 400 z `fields.dateFrom`. Kolejność: `date` malejąco,
potem `createdAt` malejąco, potem `id` (stabilna między stronami).

Odpowiedź 200 (`TransactionListResponse`):

```json
{
  "items": [/* TransactionDto[] */],
  "page": 1,
  "perPage": 10,
  "total": 30,
  "totals": { "incomeCents": 2550000, "expenseCents": 1080117 }
}
```

- `total` — liczba transakcji pasujących do **wszystkich** filtrów (do paginacji).
- `totals` — sumy dla całego wyniku filtrów daty i kategorii, **bez** filtra
  `type`, żeby karty podsumowania zawsze pokazywały obie strony.

Błędy: 400 (query), 401.

### `POST /api/transactions`

Tworzy transakcję. Wymaga tokenu.

Body (`createTransactionSchema`):

| Pole          | Typ                   | Reguły                                                                                                                               |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `amount`      | number \| string      | kwota w **złotych**: `12.5`, `"12,50"`, `"12.50"`; przeliczana na grosze (`Math.round(x * 100)`); wynik > 0 i ≤ 1 000 000 000 groszy |
| `type`        | `INCOME` \| `EXPENSE` | wymagane                                                                                                                             |
| `description` | string \| null        | trim, max 280 znaków; opcjonalne                                                                                                     |
| `date`        | ISO datetime          | wymagane (`Podaj date`)                                                                                                              |
| `categoryId`  | uuid                  | wymagane (`Wybierz kategorie`); kategoria musi należeć do użytkownika                                                                |

```json
{
  "amount": "127,50",
  "type": "EXPENSE",
  "description": "Zakupy spozywcze",
  "date": "2026-09-05T10:00:00.000Z",
  "categoryId": "01a08d61-7000-7c31-a2f4-2b8c5d7e9f10"
}
```

> Wysyłaj kwotę tak, jak wpisał ją użytkownik (`z.input`). Wysłanie wartości
> już przeliczonej na grosze pomnoży ją przez 100 drugi raz.

| Status | Ciało                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| 201    | `TransactionDto`                                                                                             |
| 400    | błąd walidacji; albo cudza/nieistniejąca kategoria: `fields: { "categoryId": ["Nie znaleziono kategorii"] }` |
| 401    | brak/niepoprawny token                                                                                       |
| 500    | `INTERNAL` — `Nie udalo sie zapisac transakcji`                                                              |

### `GET /api/transactions/{id}`

| Status | Ciało                                                         |
| ------ | ------------------------------------------------------------- |
| 200    | `TransactionDto`                                              |
| 401    | brak/niepoprawny token                                        |
| 404    | `NOT_FOUND` — `Nie znaleziono transakcji` (nie ma albo cudza) |

### `PATCH /api/transactions/{id}`

Częściowa aktualizacja — zmienia tylko przesłane pola. Body
(`updateTransactionSchema`) to `createTransactionSchema` ze wszystkimi
polami opcjonalnymi; `description: null` czyści opis. Nowa kategoria musi
należeć do użytkownika (sprawdzane **przed** wyszukaniem transakcji).

```json
{ "amount": 99.99, "description": null }
```

| Status | Ciało                                                                   |
| ------ | ----------------------------------------------------------------------- |
| 200    | `TransactionDto` po zmianie                                             |
| 400    | błąd walidacji albo cudza/nieistniejąca kategoria (`fields.categoryId`) |
| 401    | brak/niepoprawny token                                                  |
| 404    | `NOT_FOUND` — `Nie znaleziono transakcji`                               |
| 500    | `INTERNAL` — `Nie udalo sie zapisac transakcji`                         |

### `DELETE /api/transactions/{id}`

| Status | Ciało                                     |
| ------ | ----------------------------------------- |
| 204    | brak ciała                                |
| 401    | brak/niepoprawny token                    |
| 404    | `NOT_FOUND` — `Nie znaleziono transakcji` |

## 6. Podsumowanie

### `GET /api/summary`

Suma transakcji **jednego typu** w zakresie dat, pogrupowana po kategorii
albo miesiącu. Wymaga tokenu. Obsługuje go moduł `transaction`.

Query (`summaryQuerySchema`):

| Parametr   | Typ                   | Domyślnie  | Opis                                  |
| ---------- | --------------------- | ---------- | ------------------------------------- |
| `dateFrom` | ISO datetime          | —          | włącznie                              |
| `dateTo`   | ISO datetime          | —          | włącznie; `dateFrom` > `dateTo` → 400 |
| `type`     | `INCOME` \| `EXPENSE` | `EXPENSE`  | typ sumowanych transakcji             |
| `groupBy`  | `category` \| `month` | `category` | sposób grupowania                     |

Brak filtra `categoryId` i paginacji.

Odpowiedź 200 (`SummaryDto`):

```json
{
  "currency": "PLN",
  "totalCents": 360039,
  "buckets": [
    {
      "key": "01a08d61-...",
      "label": "Mieszkanie",
      "color": "#8b5cf6",
      "totalCents": 185000,
      "count": 1
    },
    {
      "key": "01a08d61-...",
      "label": "Transport",
      "color": "#3b82f6",
      "totalCents": 37000,
      "count": 2
    }
  ]
}
```

| `groupBy`  | `key`           | `label`                                     | `color`         | Kolejność                |
| ---------- | --------------- | ------------------------------------------- | --------------- | ------------------------ |
| `category` | id kategorii    | nazwa kategorii (albo `Nieznana kategoria`) | kolor kategorii | malejąco po `totalCents` |
| `month`    | `YYYY-MM` (UTC) | np. `wrzesień 2026` (pl-PL, UTC)            | `null`          | chronologicznie          |

Błędy: 400 (query), 401.

## 7. Kategorie

`CategoryDto`:

| Pole        | Typ            | Opis                                       |
| ----------- | -------------- | ------------------------------------------ |
| `id`        | uuid           |                                            |
| `name`      | string         | unikalna w obrębie użytkownika             |
| `color`     | `#rrggbb`      |                                            |
| `icon`      | string \| null | nazwa ikony `lucide-react`, np. `utensils` |
| `createdAt` | ISO datetime   |                                            |

### `GET /api/categories`

Wszystkie kategorie użytkownika, alfabetycznie po `name`. Bez paginacji.

| Status | Ciało                  |
| ------ | ---------------------- |
| 200    | `CategoryDto[]`        |
| 401    | brak/niepoprawny token |

### `POST /api/categories`

Body (`createCategorySchema`):

| Pole    | Typ            | Reguły                                    |
| ------- | -------------- | ----------------------------------------- |
| `name`  | string         | trim, 1–48 znaków; unikalna u użytkownika |
| `color` | string         | `#rrggbb`; domyślnie `#64748b`            |
| `icon`  | string \| null | trim, max 32 znaki; opcjonalne            |

```json
{ "name": "Podroze", "color": "#0ea5e9", "icon": "plane" }
```

| Status | Ciało                                              |
| ------ | -------------------------------------------------- |
| 201    | `CategoryDto`                                      |
| 400    | błąd walidacji                                     |
| 401    | brak/niepoprawny token                             |
| 409    | `CONFLICT` — `Kategoria o tej nazwie juz istnieje` |
| 500    | `INTERNAL` — `Nie udalo sie zapisac kategorii`     |

### `PATCH /api/categories/{id}`

Body (`updateCategorySchema` = `createCategorySchema.partial()`).

| Status | Ciało                                    |
| ------ | ---------------------------------------- |
| 200    | `CategoryDto` po zmianie                 |
| 400    | błąd walidacji                           |
| 401    | brak/niepoprawny token                   |
| 404    | `NOT_FOUND` — `Nie znaleziono kategorii` |

Znane problemy — patrz sekcja 9.

### `DELETE /api/categories/{id}`

| Status | Ciało                                                                       |
| ------ | --------------------------------------------------------------------------- |
| 204    | brak ciała                                                                  |
| 401    | brak/niepoprawny token                                                      |
| 404    | `NOT_FOUND` — `Nie znaleziono kategorii`                                    |
| 409    | `CONFLICT` — `Kategoria ma przypisane transakcje` (FK `onDelete: Restrict`) |
| 500    | `INTERNAL` — `Nie udalo sie usunac kategorii`                               |

## 8. Endpointy frontendu

### `GET /api/token` (`:3000`)

Zamienia cookie sesji Auth.js na token API dla przeglądarki. Woła go
wyłącznie `apiFetch` z `lib/api-client.ts` (z `credentials: "include"`).

| Status | Ciało                                                                                   |
| ------ | --------------------------------------------------------------------------------------- |
| 200    | `{ "token": "eyJ...", "expiresAt": 1789032600000 }`, nagłówek `Cache-Control: no-store` |
| 401    | `{ "error": { "code": "UNAUTHORIZED", "message": "Brak aktywnej sesji" } }`             |

### `/api/auth/[...nextauth]` (`:3000`)

Standardowe handlery Auth.js v5 (`handlers` z `src/auth.ts`). Aplikacja nie
woła ich bezpośrednio — logowanie i wylogowanie idą przez Server Actions
(`loginAction`, `registerAction`, `logoutAction`), które używają `signIn`/
`signOut`. Provider `Credentials` w `authorize()` woła backendowe
`POST /api/auth/login`.

## 9. Znane problemy

- **`PATCH /api/categories/{id}` bez pola `color` resetuje kolor do
  `#64748b`.** `updateCategorySchema` powstaje przez `.partial()` ze
  schematu, w którym `color` ma `.default("#64748b")`, a Zod 4 stosuje
  `default` także w polu opcjonalnym (`{ name: "X" }` parsuje się do
  `{ name: "X", color: "#64748b" }`). Częściowa aktualizacja nazwy nadpisuje
  więc kolor. Do poprawki w osobnym branchu `fix/`.
- **`PATCH /api/categories/{id}` z nazwą zajętą przez inną kategorię
  użytkownika** kończy się nieobsłużonym `P2002` → 500 Next.js zamiast
  `409 CONFLICT` (handler nie ma `try/catch`, w przeciwieństwie do `POST`).

## 10. Szybkie sprawdzenie (curl)

```bash
curl localhost:3001/api/health
curl -i localhost:3001/api/transactions            # 401 bez tokenu

TOKEN=$(curl -s -X POST localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@expence.local","password":"dev12345"}' | jq -r .token)

curl localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
curl "localhost:3001/api/transactions?page=1&perPage=5&type=EXPENSE" -H "Authorization: Bearer $TOKEN"
curl "localhost:3001/api/summary?groupBy=month" -H "Authorization: Bearer $TOKEN"
```

Izolację sprawdzasz dwoma tokenami: zasób utworzony tokenem A musi dawać
`404` przy `GET`/`PATCH`/`DELETE` tokenem B.
