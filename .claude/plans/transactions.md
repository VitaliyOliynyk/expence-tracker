# Plan: moduł transakcji (`/api/transactions`)

## Context

Zadanie z `.claude/prompts/transactions.md`: nowy model `Transaction` (przychody i wydatki
z kategorią) plus CRUD z filtrowaniem listy. Prompt opisuje projekt jako NestJS
z class-validator, ale backend to route handlery Next.js (`apps/backend`), a CLAUDE.md
wymaga Zoda jako jedynego kontraktu. Ustalenia z użytkownikiem:

- **Walidacja: Zod w `@expence/types`** (nie class-validator, zero nowych zależności).
- **Usunięcie kategorii z transakcjami: `onDelete: Restrict` → `409 CONFLICT`.**
- **`Expense` zostaje bez zmian** — Transaction to osobny, niezależny moduł.
- Wzorzec z `.claude/templates/feature.md`: **komunikacja przez CQRS** — nowy moduł
  w `apps/backend/src/server/modules/transaction/` na szynie (`server/bus`), jak `user`/`auth`.

Założenia (bez pytania, zgodne z konwencjami repo):
- Kwota jako `Int` w groszach. Kolumna i DTO: `amountCents` (konwencja CLAUDE.md
  „amountCents w całym stosie”); w body wejściowym pole `amount` przez istniejący
  `amountInputSchema` (akceptuje `"12,50"` → `1250`), dokładnie jak w Expense. Zawsze
  dodatnia — znak wynika z `type`.
- Ścieżki w stylu repo: `/api/transactions`, `/api/transactions/:id` (proxy już je chroni;
  CORS już dopuszcza PATCH/DELETE).
- Lista zwraca `TransactionDto[]` posortowane `date desc` (spec nie wymaga paginacji).
- Zakres: tylko backend + kontrakt typów. Bez frontendu, bez zmian w seedzie.

## 1. Schemat Prisma — `packages/db/prisma/schema.prisma`

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(uuid(7))
  userId      String
  categoryId  String
  // Kwota w groszach (Int), nigdy Float - patrz packages/types/src/money.ts.
  amountCents Int
  type        TransactionType
  description String?
  date        DateTime
  createdAt   DateTime        @default(now())

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // Restrict: kategorii z transakcjami nie da sie usunac (API zwraca 409).
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@index([userId, date])
  @@index([userId, categoryId])
}
```

Do `User` i `Category` dopisać `transactions Transaction[]`.

Migracja (odpowiednik `npx prisma migrate dev --name add-transactions` w tym monorepo,
wymaga `pnpm db:up`):
```bash
pnpm db:migrate --name add-transactions
```
Sprawdzić w wygenerowanym `migration.sql` `ON DELETE RESTRICT` dla `categoryId`.

## 2. Kontrakt — `packages/types/src/transaction.ts` (+ eksport w `index.ts`)

Wzorowane na `packages/types/src/expense.ts`, reużywa `amountCentsSchema`,
`amountInputSchema` (`money.ts`) i `categoryDtoSchema` (`category.ts`). Importy bez rozszerzeń.

- `TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const`, `transactionTypeSchema`, `TransactionType`.
- `transactionDtoSchema`: `id`, `amountCents`, `type`, `description` (nullable),
  `date` (`z.iso.datetime()`), `category: categoryDtoSchema`, `createdAt`.
- `createTransactionSchema`: `amount: amountInputSchema`, `type`, `description`
  (`trim().max(280).nullish()`), `date: z.iso.datetime()`, `categoryId: z.uuid()`.
  Typy `CreateTransactionInput` (`z.infer`) i `CreateTransactionFormValues` (`z.input`).
- `updateTransactionSchema = createTransactionSchema.partial()` + `UpdateTransactionInput`.
- `transactionListQuerySchema`: `dateFrom`, `dateTo` (`z.iso.datetime().optional()`),
  `type` (optional), `categoryId` (`z.uuid().optional()`), `.refine` dateFrom ≤ dateTo
  (jak w `expenseListQuerySchema`).

## 3. Moduł CQRS — `apps/backend/src/server/modules/transaction/`

Układ plików 1:1 z modułem `user`:

- **`transaction.messages.ts`** — jedyny plik importowany z zewnątrz:
  - `CreateTransactionCommand<{ userId; input: CreateTransactionInput }, TransactionDto>`
  - `UpdateTransactionCommand<{ userId; id; input: UpdateTransactionInput }, TransactionDto | null>`
  - `DeleteTransactionCommand<{ userId; id }, boolean>`
  - `ListTransactionsQuery<{ userId; query: TransactionListQuery }, TransactionDto[]>`
  - `GetTransactionQuery<{ userId; id }, TransactionDto | null>`
- **`transaction.repository.ts`** — jedyne miejsce dotykające `prisma.transaction`;
  każde zapytanie zawężone do `userId`, modyfikacje przez `updateMany`/`deleteMany`
  z `where: { id, userId }`, odczyty z `include: { category: true }`. Filtr listy:
  `date: { gte: dateFrom, lte: dateTo }`, `type`, `categoryId`.
  Plus `categoryBelongsToUser(userId, categoryId)` (`prisma.category.count`) — kategorie
  nie są jeszcze modułem CQRS, więc nie ma komu wysłać zapytania; komentarz, że po
  migracji kategorii zamienia się to na `dispatch(...)`.
- **`transaction.service.ts`** — logika: przed create/update z `categoryId` sprawdza
  własność kategorii → `TransactionCategoryNotFoundError`; update: `count === 0` → `null`,
  potem ponowny odczyt (jak `updateExpense`). Nie potrzebuje `dispatch` (brak wywołań
  innych modułów).
- **`transaction.mapper.ts`** — `toTransactionDto(tx & { category: Category })`,
  reużywa `toCategoryDto` z `apps/backend/src/server/mappers.ts`.
- **`transaction.errors.ts`** — `TransactionCategoryNotFoundError` (bez wiedzy o HTTP).
- **`transaction.handlers.ts`** — `registerTransactionHandlers(bus)`, cienki adapter.
- **`apps/backend/src/server/bus/index.ts`** — dopisać `registerTransactionHandlers(bus)`.

## 4. Route handlery

Wzorzec: `apps/backend/src/app/api/expenses/route.ts` + `[id]/route.ts`, ale zamiast
serwisu — `dispatch(...)` jak w `apps/backend/src/app/api/auth/me/route.ts`.
Reużyć `requireUserId` (`src/lib/auth-context.ts`), `ok/created/noContent/fail`,
`parseJsonBody/parseQuery` (`src/lib/http.ts`).

- `apps/backend/src/app/api/transactions/route.ts` — `GET` (lista, `parseQuery`),
  `POST` (`201`).
- `apps/backend/src/app/api/transactions/[id]/route.ts` — `GET`, `PATCH`, `DELETE`
  (`204`); brak rekordu / cudzy rekord → `404 NOT_FOUND`.
- `TransactionCategoryNotFoundError` → `400 BAD_REQUEST` z `fields: { categoryId: [...] }`
  (pasuje do mapowania błędów pól w formularzach). Pozostałe błędy → `console.error` + `500`.

## 5. Usuwanie kategorii z transakcjami → 409

- `apps/backend/src/server/services/category.service.ts` — `deleteCategory` łapie
  Prisma `P2003` (naruszenie FK) i rzuca nowy `CategoryInUseError` (sprawdzanie kodu
  jak w `user.service.ts` dla `P2002`).
- `apps/backend/src/app/api/categories/[id]/route.ts` — `DELETE` mapuje go na
  `fail("CONFLICT", "Kategoria ma przypisane transakcje")`.

## 6. Dokumentacja

`CLAUDE.md`: w „Stan repozytorium” dopisać `/api/transactions`; w sekcji CQRS krótko,
że `transaction` to trzeci moduł i wyjątek z `categoryBelongsToUser` (do czasu migracji
kategorii na moduł).

## Weryfikacja

1. `pnpm db:up && pnpm db:migrate --name add-transactions` — migracja powstaje i się aplikuje.
2. `pnpm typecheck`, `pnpm lint`, **`pnpm build`** (wymóg z promptu) — zero błędów.
3. `pnpm dev`, potem curl (token dev jak w CLAUDE.md, `CAT=$(curl .../api/categories | jq -r '.[0].id')`):
   - `POST /api/transactions` `{"amount":"12,50","type":"EXPENSE","date":"2026-09-10T10:00:00.000Z","categoryId":"$CAT"}` → `201`, `amountCents: 1250`.
   - `GET /api/transactions?type=EXPENSE&dateFrom=...&dateTo=...&categoryId=$CAT` — filtry działają; `dateFrom > dateTo` → `400`.
   - `GET/PATCH/DELETE /api/transactions/:id` → `200/200/204`, ponowny `GET` → `404`.
   - Złe body (`amount: -1`, zły `type`) → `400` z `fields`.
   - Drugi zarejestrowany użytkownik: `GET/PATCH/DELETE` cudzej transakcji → `404`;
     `POST` z cudzym `categoryId` → `400`.
   - `DELETE /api/categories/$CAT` gdy ma transakcje → `409`.
   - Bez tokenu → `401`.
