# Nowa funkcjonalność - utworzyc moduł transakcji

## Kontekst (co już istnieje)
Projekt: NestJS + Next.js + PostgreSQL + Prisma
Co juz jest: User, autoryzacja (JWT), modul kategorii + frontend


## Zadanie
[]
## Model danych
Транзакция: id, amount, type (Enum INCOME, EXPENSE), description, date (datetime), categoryId (String powiązane z Category), userId (String, powiązane z User), createdAt(DateTime, @default(now()))

Zaktualizuj modele User i Category - dodaj relacje z transactions Transaction[]

Po zmianie schematu stwórz i zastosuj migracje:
npx prisma migrate dev --name add-transactions


## Kontroler i endpointy
- POST /transactions
- GET /transactions: lista z query parametrami dateFrom, dateTo, type, categoryId(w ramach użytkownika)
- GET /transactions/:id 
- GET /transactions/:id 
-PATCH /transactions/:id 
-DELETE /transactions/:id

## Wzorzec

## Ograniczenia
- Nie dodawać zależności bez wskazania
- Używać `class-validator` dla DTO
- Po implementacji uruchomić build