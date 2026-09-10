# Strona główna: śledzenie transakcji (+ usunięcie `Expense`)

## Kontekst

Użytkownik chce ekranu głównego do śledzenia finansów: menu (Transakcje, Kategorie),
profil użytkownika w nagłówku, lista transakcji ze stronicowaniem po 10, a do tego
karty podsumowania, filtry i dodawanie/edycja/usuwanie transakcji.

Ustalenia z rozmowy:
- **`Expense` znika całkowicie** — to wczesna wersja modelu, `Transaction` (INCOME/EXPENSE)
  ją zastępuje. Usuwamy go z kodu, dokumentacji i bazy (migracja). To rozstrzyga kierunek
  „B” z `.claude/analyze/transaction-vs-expense.md`.
- Profil = menu w nagłówku (awatar z inicjałami → imię, e-mail, wylogowanie), bez strony `/profile`.
- Bez toastów (sonner) — błędy pokazujemy w dialogach.

Stan wyjściowy: `GET /api/transactions` zwraca gołe `TransactionDto[]` bez paginacji;
`/api/summary` liczy tylko `prisma.expense`; frontend nie ma żadnego UI transakcji;
`(dashboard)/layout.tsx` to goły HTML bez shadcn.

## Podział na branche (GitHub flow z CLAUDE.md)

Dwie intencje → dwa branche:
1. **`refactor/remove-expense`** (od `master`) — usunięcie `Expense`, przeniesienie summary na
   transakcje. Po tym etapie `master` nadal działa (przekierowania tymczasowo na `/categories`).
2. **`feature/main-page`** — po etapie 1 odbity od jego wyniku, potem strona główna.

Commit/merge tylko na wyraźną prośbę użytkownika.

---

## Checklista

### Etap 1 — `refactor/remove-expense`

- [x] 1. Branch `refactor/remove-expense` od `master`.
- [x] 2. `schema.prisma`: usunąć `model Expense` i pola relacji `expenses` w `User`/`Category`
      (`Budget` zostaje — wisi na `Category`).
- [x] 3. `pnpm db:migrate --name remove_expense` (→ `DROP TABLE "Expense"`), `pnpm db:generate`.
      Dane `Expense` nie są migrowane (tylko dane dev; `Transaction` wymaga kategorii).
      _Wykonane:_ `migrate dev` odmawia pracy w trybie nieinteraktywnym (drop niepustej tabeli),
      więc SQL z `prisma migrate diff --from-config-datasource --to-schema`, zapis do
      `migrations/*_remove_expense/` i `prisma migrate deploy`.
- [x] 4. `seed.ts`: zamiast wydatków ~30 transakcji z ostatnich 3 miesięcy (wypłata INCOME co
      miesiąc + wydatki w różnych kategoriach), tylko gdy użytkownik nie ma transakcji.
- [x] 5. `packages/types`: usunąć `expense.ts` + eksport; `summary.ts` → `dateFrom`/`dateTo`,
      `type` (domyślnie `EXPENSE`), `key` bez `null`.
- [x] 6. Backend: usunąć `app/api/expenses/**`, `services/expense.service.ts`,
      `services/summary.service.ts`, `toExpenseDto` z `mappers.ts`.
- [x] 7. Summary w module `transaction`: `GetTransactionSummaryQuery` (messages), funkcje
      agregujące w repository, `getSummary` w service, rejestracja w handlers,
      `app/api/summary/route.ts` przez `dispatch`.
- [x] 8. Frontend: usunąć `(dashboard)/expenses/`, `components/expenses/`, `hooks/use-expenses.ts`,
      `queryKeys.expenses`, inwalidacje `expenses.all` w `use-categories.ts`; `use-summary.ts`
      dopasować do nowego `SummaryQuery`.
- [x] 9. Nawigacja bez „Wydatki”; przekierowania (`app/page.tsx`, sign-in/up, login/register
      action) → `/categories`; `proxy.ts` matcher bez `/expenses`.
- [x] 10. Dokumentacja: `CLAUDE.md` (stan repo, curl, CQRS, FSD, notka o schemacie z transformacją
      → `createTransactionSchema`, przykład query-keys), `README.md`, decyzja w
      `.claude/analyze/transaction-vs-expense.md`.
- [x] 11. Weryfikacja: `pnpm lint`, `pnpm typecheck`, `pnpm build`; seed 2× z rzędu; curl
      `/api/expenses` → 404, `/api/summary?groupBy=category|month` z danych transakcji;
      `grep -ri expense` zostawia tylko typ `EXPENSE`.

### Etap 2 — `feature/main-page`

- [ ] 12. Branch `feature/main-page` odbity od wyniku etapu 1.
- [ ] 13. Kontrakt: `transactionListQuerySchema` += `page` (domyślnie 1), `perPage` (1–100,
      domyślnie 10); nowy `transactionListResponseSchema`
      `{ items, page, perPage, total, totals: { incomeCents, expenseCents } }`.
- [ ] 14. Backend: repository `findMany` ze `skip`/`take`, `count`, `sumByType` (groupBy po `type`);
      **sumy z filtrami daty i kategorii, bez filtra `type`**; service/messages zwracają
      `TransactionListResponse`.
- [ ] 15. shadcn: `dialog alert-dialog select table dropdown-menu avatar badge skeleton`;
      po dodaniu `from "cn"` → `from "@/lib/utils"`, usunąć pakiet `cn`, `pnpm typecheck`.
- [ ] 16. `lib/date.ts` (konwersje input date ↔ ISO, początek/koniec dnia),
      `lib/query-keys.ts` += `transactions: { all, list(query) }`.
- [ ] 17. `entities/transaction`: `useTransactions` (keepPreviousData), `TransactionAmount`.
- [ ] 18. `features/transaction/upsert`: mutacje create/update + `TransactionFormDialog`
      (RHF, `createTransactionSchema`, trzyparametrowy `useForm`, błędy pól z `ApiRequestError.fields`).
- [ ] 19. `features/transaction/delete`: mutacja + przycisk z `AlertDialog`.
- [ ] 20. `features/transaction/filter`: stan w URL (type, categoryId, dateFrom, dateTo, page),
      zmiana filtra resetuje stronę; UI filtrów (Select z sentinelem `all`).
- [ ] 21. `features/auth/logout`: Server Action `signOut` + pozycja menu.
- [ ] 22. Widgety: `transactions-summary` (Przychody/Wydatki/Saldo), `transactions-table`
      (tabela, skeleton, pusty stan, paginacja „Strona X z Y”, cofnięcie strony po usunięciu
      ostatniego wiersza), `app-header` (logo, nawigacja z aktywnym linkiem, menu profilu).
- [ ] 23. Strony: `(dashboard)/transactions/page.tsx` (kompozycja w `<Suspense>`),
      `(dashboard)/layout.tsx` z `AppHeader`; przekierowania → `/transactions`;
      `proxy.ts` matcher += `/transactions/:path*`; `use-categories.ts` invaliduje `transactions.all`.
- [ ] 24. Dokumentacja: `CLAUDE.md` (stan repo, czego nie ma, FSD — nowe slice'y, `lib/date.ts`,
      kształt listy transakcji).
- [ ] 25. Weryfikacja: `pnpm lint`, `pnpm typecheck`, `pnpm build`; curl
      `/api/transactions?page=2&perPage=10` (10 elementów, `total`, `totals`), `?type=INCOME`
      nie zmienia `totals`, `perPage=500` → 400; przeglądarka: logowanie → `/transactions`,
      paginacja, filtry w URL (przetrwają odświeżenie), dodanie/edycja/usunięcie odświeża listę
      i sumy, błąd pola kwoty, menu profilu + wylogowanie, `/categories` w nowym nagłówku,
      izolacja danych drugiego użytkownika.

## Konwencje

Komentarze i komunikaty w kodzie po polsku bez diakrytyków; importy spoza slice'a FSD tylko
przez `index.ts`; kategorie do Selectów przez istniejący `useCategories` (stary układ pełni rolę
`shared` — bez migracji kategorii na FSD).
