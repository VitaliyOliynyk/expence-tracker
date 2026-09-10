# Transaction vs Expense — analiza (2026-09-10)

Kontekst: plan `.claude/plans/transactions.md` wprowadzil model `Transaction` jako
"osobny, niezalezny modul", a `Expense` zostawil bez zmian. Prompt
`.claude/prompts/transactions.md` w ogole nie wspomina o `Expense` (zaklada tez
NestJS + class-validator, co nie pasuje do repo), wiec duplikacja wynika z tego,
ze prompt powstal bez wiedzy o istniejacym modelu wydatkow.

## Roznice

| | `Expense` (istniejacy) | `Transaction` (nowy) |
|---|---|---|
| Znaczenie | tylko wydatki | przychody i wydatki (`type: INCOME \| EXPENSE`) |
| Kategoria | opcjonalna (`categoryId?`) | wymagana |
| Usuniecie kategorii | `SetNull` — wydatek traci kategorie | `Restrict` — API zwraca `409 CONFLICT` |
| Waluta | `currency` (domyslnie `PLN`) | brak |
| Data | `spentAt` | `date` |
| `updatedAt` | jest | brak |
| Filtry listy | `from`, `to`, `categoryId`, `search`, sort, paginacja | `dateFrom`, `dateTo`, `type`, `categoryId`, bez paginacji |
| Odpowiedz listy | `{ items, page, perPage, total, totalCents }` | gole `TransactionDto[]` |
| Architektura | `server/services/expense.service.ts` (stary uklad) | modul CQRS `server/modules/transaction/` |
| Konsumenci | `/api/summary` (`prisma.expense.groupBy`), budzety, UI dashboardu | brak (nie ma frontendu) |

## Problemy

1. **Dwa zrodla prawdy o wydatkach.** Wydatek dodany jako `Transaction` nie trafia
   do `/api/summary` ani do budzetow — te licza wylacznie `prisma.expense`.
2. **Niespojne usuwanie kategorii.** Kategoria z samymi wydatkami usuwa sie
   (wydatki traca kategorie); ta sama kategoria z choc jedna transakcja -> `409`.
3. **Rozjazd nazw w kontrakcie:** `spentAt` vs `date`, `from`/`to` vs
   `dateFrom`/`dateTo`, lista z paginacja vs bez — frontend musialby obslugiwac
   dwie konwencje.

## Mozliwe kierunki (decyzja otwarta)

- **A. Zostawic jak jest** — cwiczenie z kursu; dopisac w CLAUDE.md jawna notke
  o duplikacji i o tym, ze summary/budzety widza tylko `Expense`.
- **B. Migracja do `Transaction`** — `Transaction` jedynym modelem: migracja danych
  `Expense` -> `Transaction` (`type=EXPENSE`), przepiecie `/api/summary` i budzetow,
  decyzja co z `currency`, paginacja i nullable kategoria, usuniecie `Expense`.
- **C. Ujednolicic kontrakt** — oba modele zostaja, ale wyrownane nazwy filtrow
  i ksztalt odpowiedzi listy (z paginacja).

## Decyzja (2026-09-11)

Wybrano **B**. `Expense` usuniety z kodu, kontraktu i bazy (migracja `remove_expense`),
`/api/summary` liczy `Transaction` (modul CQRS, `GetTransactionSummaryQuery`, parametry
`dateFrom`/`dateTo`/`type`). Danych `Expense` nie przenoszono - byly tylko danymi dev z seeda,
a seed tworzy teraz transakcje. Plan: `.claude/plans/main-page.md`.
