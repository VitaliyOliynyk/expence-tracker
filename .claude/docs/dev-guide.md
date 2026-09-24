# Przewodnik dewelopera

Jak dodać moduł, funkcję i migrację tak, żeby zmiana pasowała do reszty
repo. Reguły są w plikach `CLAUDE.md` (korzeń, `apps/backend`,
`apps/frontend`) — tu jest kolejność kroków i szkielety kodu.

Powiązane: [architecture.md](architecture.md), [api.md](api.md),
[database.md](database.md).

## 0. Zanim zaczniesz

```bash
git switch master && git pull
git switch -c feature/<opis-po-angielsku>    # albo fix/, refactor/, docs/, chore/
pnpm db:up && pnpm dev                        # Postgres + frontend :3000 + backend :3001
```

- Jeden branch = jedna intencja. Zauważony problem poza zakresem → osobny branch.
- Komentarze i komunikaty w kodzie: po polsku, **bez znaków diakrytycznych**.
- Importy: w aplikacjach przez `@/*` bez rozszerzeń; w `packages/*` ścieżki
  względne **bez** rozszerzenia (`./money`, nie `./money.js` — Turbopack).
- Testy jednostkowe (Vitest) są tylko w `apps/backend` — `pnpm test`, nowy
  test przez `/test <plik>`. Poza nimi weryfikacja: `pnpm lint`,
  `pnpm typecheck`, `pnpm build` + ręcznie (curl, przeglądarka, Swagger UI).

### Gdzie należy zmiana?

| Zmieniasz…                        | Zaczynasz od                                  | Potem                                                   |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| kształt danych / regułę walidacji | `packages/types/src/*.ts`                     | backend, formularz, OpenAPI dostają ją przez import     |
| strukturę bazy                    | `packages/db/prisma/schema.prisma` + migracja | typy, repozytorium, mapper, seed                        |
| logikę biznesową                  | `<modul>.service.ts`                          | wiadomość w `*.messages.ts`, jeśli zmienia się kontrakt |
| endpoint HTTP                     | `apps/backend/src/app/api/**/route.ts`        | `src/openapi/<modul>.paths.ts` (ten sam branch!)        |
| UI                                | slice FSD w `apps/frontend/src/`              | `index.ts` slice'a, `lib/query-keys.ts`                 |
| konwersję kwot                    | `packages/types/src/money.ts`                 | nigdzie indziej                                         |

---

## 1. Nowy moduł backendu (CQRS)

Przykład poniżej używa modułu **`budget`** — to kolejny brakujący element
(model istnieje, API nie), ale **ten moduł jeszcze nie istnieje**; kod
jest szkieletem do adaptacji. Wzorcem referencyjnym jest istniejący moduł
`apps/backend/src/server/modules/transaction/`.

Docelowy układ:

```
apps/backend/src/server/modules/budget/
├── budget.messages.ts     publiczne API modułu (jedyny plik importowany z zewnątrz)
├── budget.errors.ts       błędy domenowe (importuje też route handler)
├── budget.handlers.ts     registerBudgetHandlers(bus)
├── budget.service.ts      logika biznesowa
├── budget.repository.ts   jedyne miejsce z prisma.budget
└── budget.mapper.ts       rekord Prismy → DTO
```

### Krok 1 — kontrakt w `packages/types`

Nowy plik `packages/types/src/budget.ts` i eksport w `src/index.ts`:

```ts
import { z } from "zod";
import { amountCentsSchema, amountInputSchema } from "./money";

export const BUDGET_PERIODS = ["WEEKLY", "MONTHLY"] as const;
export const budgetPeriodSchema = z.enum(BUDGET_PERIODS);

export const budgetDtoSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid().nullable(),
  amountCents: amountCentsSchema,
  period: budgetPeriodSchema,
  startsAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});
export type BudgetDto = z.infer<typeof budgetDtoSchema>;

/** Wspolne dla formularza i walidacji body w backendzie. */
export const createBudgetSchema = z.object({
  amount: amountInputSchema,
  period: budgetPeriodSchema,
  startsAt: z.iso.datetime(),
  categoryId: z.uuid().nullish(),
});
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateBudgetFormValues = z.input<typeof createBudgetSchema>;
```

```ts
// packages/types/src/index.ts
export * from "./budget";
```

Zasady:

- **Nigdy nie dawaj `userId` do schematu wejścia** — przyjdzie z tokenu.
- Kwoty w DTO jako `amountCentsSchema`, na wejściu z formularza
  `amountInputSchema` (wtedy potrzebny typ `z.input` dla react-hook-form).
- Uwaga na `.default()` + `.partial()` w schemacie aktualizacji: Zod 4
  stosuje domyślną wartość także w polu opcjonalnym, więc `PATCH` bez tego
  pola nadpisze je wartością domyślną. Schemat aktualizacji buduj bez
  `default` (patrz „Znane problemy” w [api.md](api.md#9-znane-problemy)).

### Krok 2 — `budget.messages.ts`

```ts
import { defineCommand, defineQuery } from "../../bus/message";
import type { BudgetDto, CreateBudgetInput } from "@expence/types";

/**
 * Jedyny plik modulu budget importowany z zewnatrz. Kazda wiadomosc niesie
 * userId - to jedyna bariera miedzy kontami.
 */

/**
 * Tworzy budzet zalogowanego uzytkownika.
 *
 * @param payload.userId - wlasciciel, wylacznie z `requireUserId(request)`.
 * @param payload.input - body po `createBudgetSchema` (kwota juz w groszach).
 * @returns Utworzony budzet.
 * @throws {BudgetCategoryNotFoundError} gdy kategoria nie istnieje albo jest cudza.
 */
export const CreateBudgetCommand = defineCommand<
  { userId: string; input: CreateBudgetInput },
  BudgetDto
>("budget.create");

export const ListBudgetsQuery = defineQuery<{ userId: string }, BudgetDto[]>("budget.list");
```

- Nazwa typu wiadomości: `<modul>.<akcja>`, unikalna w całej szynie.
- Komenda zmienia stan (ma dokładnie jednego handlera), zapytanie tylko czyta.
- Payload **zawsze** zawiera `userId`.

### Krok 3 — `budget.errors.ts`

```ts
/** Bledy domenowe modulu budzetow - bez wiedzy o kodach HTTP, te tlumaczy route handler. */
export class BudgetCategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Kategoria ${categoryId} nie istnieje albo nalezy do innego uzytkownika`);
    this.name = "BudgetCategoryNotFoundError";
  }
}
```

### Krok 4 — `budget.repository.ts`

```ts
import { prisma } from "@expence/db";
import type { Budget, BudgetPeriod } from "@expence/db";

/** Jedyne miejsce w backendzie dotykajace prisma.budget. Kazde zapytanie zawezone do userId. */

export function findAll(userId: string): Promise<Budget[]> {
  return prisma.budget.findMany({ where: { userId }, orderBy: { startsAt: "desc" } });
}

export function create(input: {
  userId: string;
  categoryId: string | null;
  amountCents: number;
  period: BudgetPeriod;
  startsAt: Date;
}): Promise<Budget> {
  return prisma.budget.create({ data: input });
}

/** deleteMany zamiast delete: filtr po userId sprawia, ze cudzy rekord da count 0. */
export async function deleteScoped(userId: string, id: string): Promise<number> {
  const { count } = await prisma.budget.deleteMany({ where: { id, userId } });
  return count;
}
```

Reguły izolacji:

- Odczyt: `findFirst`/`findMany` z `where: { userId, ... }` — nigdy
  `findUnique({ where: { id } })` na rekordzie domenowym.
- Zapis/usunięcie: `updateMany`/`deleteMany` z `where: { id, userId }`;
  `count === 0` → serwis zwraca `null`/`false` → route `404`.
- Referencja do innego zasobu (tu `categoryId`) musi być sprawdzona pod
  kątem własności — FK sprawdza tylko istnienie.

### Krok 5 — `budget.mapper.ts` i `budget.service.ts`

```ts
// budget.mapper.ts
import type { Budget } from "@expence/db";
import type { BudgetDto } from "@expence/types";

/** Pomija userId - nie jest czescia kontraktu API. */
export function toBudgetDto(budget: Budget): BudgetDto {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    amountCents: budget.amountCents,
    period: budget.period,
    startsAt: budget.startsAt.toISOString(),
    createdAt: budget.createdAt.toISOString(),
  };
}
```

```ts
// budget.service.ts
import type { BudgetDto, CreateBudgetInput } from "@expence/types";
import * as budgetRepository from "./budget.repository";
import { toBudgetDto } from "./budget.mapper";

export async function listBudgets(userId: string): Promise<BudgetDto[]> {
  return (await budgetRepository.findAll(userId)).map(toBudgetDto);
}

export async function createBudget(userId: string, input: CreateBudgetInput): Promise<BudgetDto> {
  // TODO: sprawdzenie wlasnosci kategorii (patrz assertCategoryOwned w transaction.service.ts)
  const budget = await budgetRepository.create({
    userId,
    categoryId: input.categoryId ?? null,
    amountCents: input.amount, // juz w groszach po amountInputSchema
    period: input.period,
    startsAt: new Date(input.startsAt),
  });
  return toBudgetDto(budget);
}
```

Jeśli serwis musi zapytać **inny** moduł — dostaje `dispatch` argumentem i
wysyła wiadomość z cudzego `*.messages.ts` (wzór: `auth.service.ts`).
Nigdy nie importuj cudzego `*.repository.ts`/`*.service.ts` ani nie
importuj singletonu `dispatch` z `bus/index.ts` (cykl importów).

### Krok 6 — `budget.handlers.ts` i rejestracja na szynie

```ts
// budget.handlers.ts
import type { Bus } from "../../bus/bus";
import { CreateBudgetCommand, ListBudgetsQuery } from "./budget.messages";
import { createBudget, listBudgets } from "./budget.service";

/** Cienki adapter: wiaze wiadomosci szyny z serwisem modulu budzetow. */
export function registerBudgetHandlers(bus: Bus): void {
  bus.register(CreateBudgetCommand, (payload) => createBudget(payload.userId, payload.input));
  bus.register(ListBudgetsQuery, (payload) => listBudgets(payload.userId));
}
```

```ts
// apps/backend/src/server/bus/index.ts
import { registerBudgetHandlers } from "../modules/budget/budget.handlers";

function createAppBus(): Bus {
  const bus = createBus();
  registerUserHandlers(bus);
  registerAuthHandlers(bus);
  registerTransactionHandlers(bus);
  registerBudgetHandlers(bus);
  return bus;
}
```

Bez tego kroku `dispatch` rzuci `Brak handlera dla budget.create` → 500.

### Krok 7 — route handler

`apps/backend/src/app/api/budgets/route.ts`:

```ts
import { createBudgetSchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { created, fail, ok, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { CreateBudgetCommand, ListBudgetsQuery } from "@/server/modules/budget/budget.messages";
import { BudgetCategoryNotFoundError } from "@/server/modules/budget/budget.errors";

// Opis OpenAPI tych endpointow: src/openapi/budget.paths.ts - zmiana statusow wymaga zmiany tam.

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  return ok(await dispatch(ListBudgetsQuery({ userId: auth.userId })));
}

export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createBudgetSchema);
  if (body.error) return body.error;

  try {
    return created(await dispatch(CreateBudgetCommand({ userId: auth.userId, input: body.data })));
  } catch (error) {
    if (error instanceof BudgetCategoryNotFoundError) {
      return fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", {
        categoryId: ["Nie znaleziono kategorii"],
      });
    }
    console.error("POST /api/budgets", error);
    return fail("INTERNAL", "Nie udalo sie zapisac budzetu");
  }
}
```

Zasady handlera:

- Kolejność zawsze: `requireUserId` → `parseJsonBody`/`parseQuery` →
  `dispatch` → mapowanie błędów.
- Odpowiedzi **tylko** przez `ok`/`created`/`noContent`/`fail`.
- Ścieżka z parametrem: `app/api/budgets/[id]/route.ts`, kontekst
  `{ params: Promise<{ id: string }> }` (w Next 16 `params` jest async).
- Endpoint publiczny (bez tokenu) → dopisz ścieżkę do `PUBLIC_PATHS` w
  `src/proxy.ts`, inaczej proxy odetnie go na 401.
- Po każdej zmianie metody zaktualizuj JSDoc (`@param`, `@returns`,
  `@throws`) — wzór w `app/api/transactions/route.ts`.

### Krok 8 — OpenAPI

Nowy plik `apps/backend/src/openapi/budget.paths.ts`:

```ts
import { budgetDtoSchema, createBudgetSchema } from "@expence/types";
import { z } from "zod";
import type { ZodOpenApiPathsObject } from "zod-openapi";
import { badRequestResponse, invalidBodyExample, unauthorizedResponse } from "./responses";

export const BUDGETS_TAG = "budgets";

export const budgetPaths: ZodOpenApiPathsObject = {
  "/api/budgets": {
    get: {
      tags: [BUDGETS_TAG],
      operationId: "listBudgets",
      summary: "Lista budzetow",
      responses: {
        "200": {
          description: "Budzety zalogowanego uzytkownika",
          content: { "application/json": { schema: z.array(budgetDtoSchema) } },
        },
        "401": unauthorizedResponse,
      },
    },
    post: {
      tags: [BUDGETS_TAG],
      operationId: "createBudget",
      summary: "Nowy budzet",
      requestBody: {
        required: true,
        content: { "application/json": { schema: createBudgetSchema } },
      },
      responses: {
        "201": {
          description: "Utworzony budzet",
          content: { "application/json": { schema: budgetDtoSchema } },
        },
        "400": badRequestResponse({ invalidBody: invalidBodyExample }),
        "401": unauthorizedResponse,
      },
    },
  },
};
```

W `src/openapi/document.ts`: dopisz tag do `tags`, `...budgetPaths` do
`paths` i schematy (`BudgetDto`, `CreateBudgetInput`) do
`components.schemas`. Parametry: `requestParams: { query: schemat }` albo
`{ path: z.object({ id: z.uuid() }) }`. Endpoint publiczny dostaje
`security: []`. Opisz **każdy** status, który handler faktycznie zwraca.

### Krok 9 — dokumentacja i weryfikacja

- Tabela „Endpointy” i „Układ `src/`” w `apps/backend/CLAUDE.md`,
  „Stan repozytorium” / „Czego jeszcze nie ma” w głównym `CLAUDE.md`.
- `.claude/docs/api.md` (nowe endpointy), `architecture.md` (tabela
  wiadomości), `database.md` („Kto dotyka której tabeli”).
- Sprawdzenie curl-em (token z `POST /api/auth/login`) i izolacji dwoma
  tokenami: zasób A → `404` dla tokenu B.
- `http://localhost:3001/api/docs` — nowe endpointy widoczne w Swagger UI.

---

## 2. Nowa funkcja (end-to-end)

Przykład: nowy filtr, nowe pole albo nowy endpoint w istniejącym module,
wraz z konsumentem w UI. Zmiana dotyka obu aplikacji — przeczytaj oba
`apps/*/CLAUDE.md`.

### 2.1 Kolejność

1. **Kontrakt** — `packages/types`: nowe pole w schemacie DTO/wejścia/query.
   Reguła walidacji żyje tylko tu (nie dopisuj jej w handlerze ani w formularzu).
2. **Baza** (jeśli trzeba) — migracja, patrz [rozdział 3](#3-nowa-migracja).
3. **Repozytorium** — zapytanie z `userId` w `where`.
4. **Mapper** — nowe pole w DTO (daty `.toISOString()`, bez pól wewnętrznych).
5. **Serwis** — logika; nowe błędy w `*.errors.ts`.
6. **Wiadomość** — nowa komenda/zapytanie w `*.messages.ts` (z JSDoc) i jej
   rejestracja w `*.handlers.ts`. Nowy moduł → także `bus/index.ts`.
7. **Route handler** — mapowanie nowych błędów na `fail(...)`.
8. **OpenAPI** — `src/openapi/<modul>.paths.ts` w tym samym branchu.
9. **Frontend** — hook, feature/widget, patrz niżej.
10. **Dokumentacja** — `CLAUDE.md` (jeśli zmienia opisany stan) i `.claude/docs/*`.

### 2.2 Frontend (FSD)

Warstwy (import tylko w dół): `app` → `widgets` → `features` → `entities` →
shared (`components/ui`, `lib`).

| Co dodajesz                      | Gdzie                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| odczyt danych (`useQuery`)       | `entities/<encja>/api/use-<nazwa>.ts`                      |
| mutację / intencję użytkownika   | `features/<domena>/<akcja>/{ui,api,model}/`                |
| blok strony złożony z feature'ów | `widgets/<nazwa>/ui/`                                      |
| nową stronę                      | `app/(dashboard)/<sciezka>/page.tsx` (tylko kompozycja)    |
| klucz cache'a                    | `lib/query-keys.ts` (nigdy inline)                         |
| prymityw UI                      | `pnpm dlx shadcn@latest add <komponent>` w `apps/frontend` |

Szkielet zapytania (encja):

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { BudgetDto } from "@expence/types";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets.all,
    queryFn: () => apiFetch<BudgetDto[]>("/api/budgets"),
  });
}
```

Szkielet mutacji (feature):

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BudgetDto, CreateBudgetFormValues } from "@expence/types";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    // Body to z.input (surowe wartosci formularza) - kwote na grosze przelicza backend.
    mutationFn: (input: CreateBudgetFormValues) =>
      apiFetch<BudgetDto>("/api/budgets", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}
```

I koniecznie:

- Eksport w `index.ts` w korzeniu slice'a; import z zewnątrz tylko przez
  `@/features/<domena>/<akcja>`, nigdy z `ui/…` bezpośrednio.
- Mutacja unieważnia **całe gałęzie** (`queryKeys.x.all`), nie pojedyncze
  wpisy. Jeśli zmiana wpływa na dane zagnieżdżone gdzie indziej (np.
  kategoria w `TransactionDto`), unieważnij też te gałęzie.
- Formularz: react-hook-form + `standardSchemaResolver(schemat)`; przy
  schemacie z transformacją `useForm<FormValues, unknown, Input>`; do API
  `form.getValues()` (`z.input`). `ApiRequestError.fields` →
  `form.setError(pole, …)`.
- Kwoty wyświetlaj tylko przez `formatAmount` z `@expence/types`.
- Stan w URL (`useSearchParams`) wymaga `<Suspense>` na stronie, inaczej
  `pnpm build` wyłoży się na prerenderingu.
- Nowa chroniona sekcja: strona pod `app/(dashboard)/` **i** wpis w
  `matcher` w `apps/frontend/src/proxy.ts`; link w `widgets/app-header`.
- Po `shadcn add`: podmień `from "cn"` na `from "@/lib/utils"` w nowych
  plikach `components/ui/*`, usuń pakiet `cn` z `package.json`, uruchom
  `pnpm typecheck`.
- Wszystko wołające backend idzie przez `apiFetch` — nigdy goły `fetch`.

---

## 3. Nowa migracja

Prisma 7, schemat w `packages/db/prisma/schema.prisma`, migracje w
`packages/db/prisma/migrations/`.

### 3.1 Standardowa ścieżka

```bash
# 1. edytuj packages/db/prisma/schema.prisma
pnpm --filter @expence/db validate           # opcjonalnie: szybka walidacja schematu

# 2. utwórz i zaaplikuj migrację (prisma migrate dev)
pnpm db:migrate --name add_budget_note       # nazwa w snake_case, po angielsku

# 3. wygeneruj klienta — w Prisma 7 migrate dev już tego NIE robi
pnpm db:generate

# 4. sprawdź, że seed nadal działa
pnpm db:seed

# 5. typy i build
pnpm typecheck && pnpm lint
```

Commit zawiera `schema.prisma` **i** nowy katalog
`prisma/migrations/<timestamp>_<nazwa>/migration.sql` (klient w
`src/generated/` jest w `.gitignore`). Zmiana schematu bez migracji w tym
samym branchu blokuje merge.

### 3.2 Migracja z ręcznym SQL

Gdy Prisma nie wygeneruje tego, czego potrzebujesz (dane do przeniesienia,
indeks częściowy, kolumna `NOT NULL` w tabeli z danymi):

```bash
pnpm db:migrate --name add_global_budget_unique --create-only   # tylko plik, bez aplikowania
# edytuj packages/db/prisma/migrations/<timestamp>_add_global_budget_unique/migration.sql
pnpm db:migrate                                                # zaaplikuj
pnpm db:generate
```

Przykład — unikalny budżet globalny (`categoryId IS NULL`), którego nie
załatwi `@@unique` (patrz [database.md](database.md#budget-bez-api)):

```sql
CREATE UNIQUE INDEX "Budget_global_unique"
  ON "Budget" ("userId", "period", "startsAt")
  WHERE "categoryId" IS NULL;
```

Nowa kolumna wymagana w tabeli z danymi — w trzech krokach w jednym pliku:
dodaj jako `NULL`, uzupełnij `UPDATE`, potem `SET NOT NULL`. Alternatywnie
daj jej `@default(...)` w schemacie.

### 3.3 Reguły schematu

- Nowy model domenowy: `id String @id @default(uuid(7))`, `userId String`,
  relacja do `User` z `onDelete: Cascade`, `@@index([userId, ...])` pod
  zapytania listy. Dopisz relację po stronie `User`.
- Pieniądze: `amountCents Int` (grosze), nigdy `Float`/`Decimal`.
- Daty: `DateTime`; `createdAt DateTime @default(now())`, a `updatedAt`
  tylko jeśli naprawdę potrzebne (`@updatedAt`).
- FK do zasobu, który ma „przeżyć” (jak kategoria z transakcjami):
  `onDelete: Restrict` + obsługa `P2003` w serwisie (wzór:
  `CategoryInUseError`).
- Unikalność per użytkownik: `@@unique([userId, pole])`, `P2002` w serwisie
  → `409 CONFLICT`. Pamiętaj, że `NULL` w kluczu unikalnym nie koliduje.
- **Nie zmieniaj** nazw pól `Account`/`Session`/`VerificationToken`
  (adapter Auth.js).
- **Nie dodawaj `url`** do bloku `datasource` (Prisma 7 → błąd P1012);
  connection string jest w `prisma.config.ts`.

### 3.4 Czego nie robić

- Nie edytuj migracji, która już trafiła do `master` — zrób nową.
- Nie używaj `prisma db push` do zmian, które mają trafić do repo (nie
  tworzy pliku migracji).
- Rozjazd lokalnej bazy z historią migracji (np. po zmianie brancha):
  `pnpm db:reset && pnpm db:migrate && pnpm db:generate && pnpm db:seed`
  — kasuje wszystkie dane lokalne.
- Produkcja/CI: `pnpm --filter @expence/db migrate:deploy` (tylko aplikuje
  istniejące migracje, nigdy nie tworzy nowych).

### 3.5 Po migracji — co jeszcze zaktualizować

| Co                        | Gdzie                                                      |
| ------------------------- | ---------------------------------------------------------- |
| schemat Zod DTO / wejścia | `packages/types/src/*.ts`                                  |
| mapper rekord → DTO       | `<modul>.mapper.ts` / `server/mappers.ts`                  |
| zapytania                 | `<modul>.repository.ts`                                    |
| dane startowe             | `packages/db/prisma/seed.ts` (musi zostać idempotentny)    |
| spec OpenAPI              | `src/openapi/<modul>.paths.ts` + `document.ts`             |
| dokumentacja              | `.claude/docs/database.md` (tabele pól, historia migracji) |

---

## 4. Checklista przed PR

- [ ] Branch odbity od aktualnego `master`, po `git fetch && git rebase origin/master`.
- [ ] `pnpm lint` i `pnpm typecheck` — zero błędów; `pnpm build` przechodzi.
- [ ] Zmiana `schema.prisma` ma migrację w tym branchu; `pnpm db:seed` działa.
- [ ] Każde nowe zapytanie do bazy zawężone do `userId`; `userId` tylko z `requireUserId`.
- [ ] Nowy/zmieniony endpoint opisany w `src/openapi/<modul>.paths.ts`.
- [ ] Reguły walidacji tylko w `packages/types`; kwoty w groszach, konwersje tylko w `money.ts`.
- [ ] Import między modułami tylko przez `*.messages.ts` / `index.ts` slice'a.
- [ ] Zaktualizowane `CLAUDE.md` (jeśli zmienia opisany stan) i `.claude/docs/*`.
- [ ] Ręczna weryfikacja: curl (w tym izolacja dwoma tokenami) i/lub przeglądarka na :3000.
- [ ] Commity wg Conventional Commits, opis po polsku (`feat(budgets): dodaj liste budzetow`).
