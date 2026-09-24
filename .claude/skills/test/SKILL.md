---
name: test
description: Dopisuje test jednostkowy (Vitest) dla wskazanego pliku Expence Tracker — sprawdza branch i plik, dobiera strategię do warstwy (kontrakt Zod, `@expence/auth`, serwis/mapper/route handler backendu, `lib` frontendu), kładzie `<plik>.test.ts` obok źródła, uruchamia go i raportuje wynik. Brak Vitesta w pakiecie — proponuje jego konfigurację i robi ją tylko za zgodą. Używaj, gdy użytkownik prosi o test dla konkretnego pliku ("dodaj test do money.ts", "napisz testy dla serwisu", /test).
argument-hint: '<ścieżka do pliku> ["dodatkowe wskazówki"]'
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Bash(git status *)
  - Bash(git branch *)
  - Bash(git switch -c *)
  - Bash(ls *)
  - Bash(pnpm --filter * test *)
  - Bash(pnpm --filter * exec vitest *)
  - Bash(pnpm --filter * lint)
  - Bash(pnpm --filter * typecheck)
---

# Test dla wskazanego pliku

Skill **dopisuje test** — nie zmienia testowanego pliku. Błąd znaleziony
przez test to osobna poprawka (branch `fix/`, patrz "Praca z branchami" w
głównym `CLAUDE.md`), nie część tego zadania. Commit robisz osobno, na
wyraźną prośbę (`/commit`, typ `test`).

Argumenty od użytkownika (surowo): $ARGUMENTS

- Pierwszy argument (plik do przetestowania): $0
- Reszta (opcjonalne wskazówki — np. na czym się skupić): $1

## Stan repo w chwili wywołania

- Bieżący branch: !`git branch --show-current`
- Status: !`git status --short`

## 1. Branch

Zmiany nie idą na `master`. Jeśli bieżący branch (wyżej) to `master` albo
jest pusty (detached HEAD) — zaproponuj branch
`chore/test-<nazwa-pliku-kebab-case>` (np. `chore/test-money`) i po
akceptacji utwórz go (`git switch -c <branch>`). Na innym branchu pracuj
na nim — test dopisany do brancha z featurem jest częścią tego featura.

## 2. Rozbierz argumenty i sprawdź plik

Postać: `/test <ścieżka> ["wskazówki"]`, np.
`/test packages/types/src/money.ts` albo
`/test apps/backend/src/server/modules/transaction/transaction.service.ts "izolacja userId"`.

- **Brak ścieżki** — zapytaj o nią i zakończ.
- Ścieżka względna liczy się od korzenia repo. Sama nazwa (`money.ts`) —
  znajdź plik (`Glob`); kilka trafień — pokaż je i zapytaj, o który chodzi.
- **Plik musi istnieć** i być `.ts`/`.tsx` z kodem aplikacji. Zgłoś błąd i
  zakończ, jeśli to:
  - plik testu (`*.test.ts(x)`) — zamiast tego zaproponuj uzupełnienie go;
  - kod generowany (`packages/db/src/generated/`), `next-env.d.ts`,
    deklaracje `*.d.ts`, konfiguracja (`*.config.*`, `eslint.config.mjs`);
  - plik bez logiki do sprawdzenia (same reeksporty jak `index.ts`,
    same typy) — powiedz, które pliki obok warto testować zamiast niego.
- **Test już istnieje** (`<nazwa>.test.ts(x)` obok pliku) — przeczytaj go
  i dopisz brakujące przypadki zamiast tworzyć drugi plik.

Dalej `<plik>` = testowany plik, `<pakiet>` = pakiet pnpm, do którego
należy (najbliższy `package.json` w górę, np. `@expence/types`).

## 3. Runner w pakiecie

W repo **nie ma jeszcze runnera testów** (główny `CLAUDE.md`, "Czego
jeszcze nie ma"). Sprawdź `package.json` pakietu: `vitest` w
`devDependencies` i skrypt `"test"`.

**Jest** — przejdź do punktu 4.

**Nie ma** — zatrzymaj się i zaproponuj konfigurację Vitesta w tym
pakiecie (zmienia zależności i dokumentację, więc **tylko za zgodą**;
najlepiej osobnym commitem `chore(<zakres>): dodaj vitest`, przed commitem
z testem):

1. `pnpm --filter <pakiet> add -D vitest`; komponenty i hooki React
   (`.tsx`) dodatkowo `jsdom @testing-library/react
@testing-library/user-event`.
2. `vitest.config.ts` w korzeniu pakietu — ESM, bez `globals`:

   ```ts
   import { fileURLToPath } from "node:url";
   import { defineConfig } from "vitest/config";

   export default defineConfig({
     resolve: {
       // tylko w apps/*: alias @/* -> src/* jak w tsconfig.json
       alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
     },
     test: {
       environment: "node", // "jsdom" dla komponentow React
       include: ["src/**/*.test.{ts,tsx}"],
     },
   });
   ```

3. Skrypt w `package.json` pakietu: `"test": "vitest run"`; w korzeniu
   repo `"test": "pnpm -r --if-present test"`.
4. Dokumentacja w tym samym branchu (warunek mergu): główny `CLAUDE.md`
   ("Stan repozytorium", "Czego jeszcze nie ma", tabela "Komendy", akapit
   "Testy"), `.claude/docs/dev-guide.md` i `.claude/docs/architecture.md`
   (zdania "Testów automatycznych nie ma" / "Brak runnera testów"),
   `apps/REVIEW.md` (punkt o braku runnera). Nie przepisuj ich na zapas —
   zaktualizuj tylko to, co przestało być prawdą.

Odmowa — zakończ, nie pisz testu "do szuflady", którego nie da się
uruchomić.

## 4. Poznaj plik i jego kontrakt

Zanim napiszesz test, przeczytaj:

- `<plik>` w całości — publiczne eksporty to przedmiot testu; funkcje
  nieeksportowane testujesz przez publiczne API, nie eksportujesz ich na
  potrzeby testu.
- to, czego używa z `@expence/types` (schematy Zod, `money.ts`) — kontrakt
  mówi, jakie dane są poprawne;
- przy module CQRS backendu: `*.messages.ts` (granica modułu) i
  `apps/backend/CLAUDE.md`; przy frontendzie: `apps/frontend/CLAUDE.md`;
- istniejące testy w repo (`Glob` `**/*.test.ts*` bez `node_modules`) —
  trzymaj się ich stylu.

## 5. Strategia wg warstwy

| Plik                                                                  | Jak testować                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/types/src/*` (schematy Zod, `money.ts`)                     | czyste testy tablicowe (`it.each`): wejścia poprawne i odrzucane, komunikaty błędów, transformacje. Przy kwotach: `z.input` ≠ `z.infer` (`"12,50"` → `1250`), zaokrąglenia, przecinek i kropka, wartości ujemne i zero.                                                                               |
| `packages/auth/src/*`                                                 | prawdziwe `node:crypto`/`jose`, bez mocków: hash → verify `true`, złe hasło → `false`; token podpisany i zweryfikowany testowym sekretem, zły sekret i wygasły token (`vi.useFakeTimers`) → odrzucony. Sekret podaj w teście, nie czytaj `.env`.                                                      |
| backend `*.mapper.ts`                                                 | czyste: rekord Prismy → DTO (daty jako ISO, grosze jako `Int`, brak pól spoza DTO, np. hasha).                                                                                                                                                                                                        |
| backend `*.service.ts`                                                | `vi.mock("./<modul>.repository")`, a `dispatch` jako `vi.fn()` przekazany argumentem (patrz `architecture.md` §4.3). Obowiązkowo: **każde wywołanie repozytorium dostaje `userId` z argumentu** (izolacja danych) i cudzy/nieistniejący zasób kończy się błędem modułu (`*.errors.ts`), nie wynikiem. |
| backend `src/server/services/*.service.ts` (poza CQRS, np. kategorie) | woła `prisma` bezpośrednio — `vi.mock("@expence/db", () => ({ prisma: { category: { findMany: vi.fn(), … } } }))`. Te same obowiązki co wyżej: `userId` w każdym `where`, cudzy zasób → błąd.                                                                                                         |
| backend `src/app/api/**/route.ts`                                     | wywołaj eksportowane `GET`/`POST`/… z `new Request(...)` i nagłówkiem `x-user-id`; szynę (`@/server/bus`) zamockuj. Sprawdź status i kształt odpowiedzi (`apiErrorSchema` przy błędach), `400` dla złego body/query. `userId` w body/query ma być **ignorowany**.                                     |
| backend `src/proxy.ts`                                                | `NextRequest` z tokenem podpisanym testowym `AUTH_SECRET` (`vi.stubEnv`): brak/zły token → `401`, dobry → `x-user-id` ustawiony, preflight CORS.                                                                                                                                                      |
| backend `*.repository.ts`, `packages/db`                              | potrzebują bazy — testy integracyjne są poza zakresem tego skilla. Powiedz to i zaproponuj test serwisu nad tym repozytorium.                                                                                                                                                                         |
| frontend `src/lib/*`, `src/**/model/*`                                | czyste funkcje: testy tablicowe. `api-client.ts`: `vi.stubGlobal("fetch", vi.fn())`. Plik z `import "server-only"` → `vi.mock("server-only", () => ({}))`.                                                                                                                                            |
| frontend komponenty i hooki (`.tsx`)                                  | `@testing-library/react` w `jsdom`, zapytania po roli/etykiecie, interakcje przez `user-event`; `QueryClientProvider` z nowym `QueryClient` na test (`retry: false`). Bez testowania klas Tailwinda i struktury DOM shadcn.                                                                           |

Wskazówki z drugiego argumentu mają pierwszeństwo przy wyborze
przypadków, ale nie zwalniają z obowiązkowych (izolacja `userId`,
grosze).

## 6. Napisz test

- **Lokalizacja:** `<nazwa>.test.ts` (`.test.tsx` dla JSX) obok `<plik>`.
- **Importy:** jawnie z `vitest` (`import { describe, expect, it, vi } from
"vitest"`) — bez `globals`, żeby `tsc --noEmit` znał typy. Testowany
  kod: w aplikacjach przez `@/*`, w `packages/*` ścieżką względną **bez**
  rozszerzenia (`./money`) — jak w "Konwencje" głównego `CLAUDE.md`.
- **Nazwy i komentarze** po polsku, **bez znaków diakrytycznych**:
  `describe("amountInputSchema")`, `it("zamienia przecinek na grosze")`.
- **Zachowanie, nie implementacja:** asercje na wyniku, rzuconym błędzie
  i wywołaniach zależności na granicy (repozytorium, `dispatch`, `fetch`)
  — nie na prywatnych szczegółach. Bez snapshotów.
- **Determinizm:** stałe daty (`new Date("2026-01-15T00:00:00Z")`,
  `vi.setSystemTime`), bez prawdziwej sieci, bazy i `.env`; mocki
  sprzątane w `afterEach`: `vi.resetAllMocks()` (czyści `vi.fn()` z
  `vi.hoisted`/`vi.mock` — samo `vi.restoreAllMocks()` w Vitest 3+ ich nie
  resetuje), `vi.restoreAllMocks()` przy `vi.spyOn`, `vi.useRealTimers()`
  przy fałszywym czasie. Wzorzec:
  `apps/backend/src/server/services/category.service.test.ts`.
- Kwoty zawsze w groszach (`Int`) — bez `Float` i własnych konwersji;
  do budowania danych testowych używaj funkcji z `@expence/types`.

## 7. Uruchom i sprawdź

1. `pnpm --filter <pakiet> exec vitest run <ścieżka testu względem pakietu>`.
2. **Test nie przechodzi** — ustal, po czyjej stronie jest błąd:
   - pomyłka w teście (złe założenie, zła atrapa) — popraw test;
   - **błąd w `<plik>`** (test opisuje zachowanie zgodne z kontraktem, a
     kod robi co innego) — **nie poprawiaj kodu i nie naginaj asercji**
     pod błąd. Oznacz przypadek `it.fails(...)` z komentarzem, co jest
     nie tak, i zgłoś to w raporcie jako kandydata na branch `fix/`.
3. `pnpm --filter <pakiet> typecheck`, a w pakietach, które go mają,
   `pnpm --filter <pakiet> lint` (`packages/types` i `packages/auth` nie
   mają `lint`). Błędy w pliku testu — popraw.

## 8. Raport

Krótko, po polsku:

- ścieżka pliku testu i czy powstał, czy został uzupełniony;
- lista przypadków (jedna linia na `describe`/grupę);
- wynik `vitest run` (liczba testów, przeszły/nie) i typecheck/lint;
- znalezione błędy w kodzie (przypadki `it.fails`) — z propozycją brancha
  `fix/`;
- czego świadomie nie testowano (np. repozytorium bez bazy).

Na koniec jednym zdaniem: commit (`test(<zakres>): ...`) zrobisz przez
`/commit` na osobną prośbę.
