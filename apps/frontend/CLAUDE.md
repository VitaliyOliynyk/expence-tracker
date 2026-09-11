@AGENTS.md

# Frontend (`@expence/frontend`, :3000)

Uzupełnia główny `CLAUDE.md` (stos, komendy, GitHub flow, przepływ
autoryzacji, kontrakt `packages/types`, pieniądze, pułapki wersji) — tamte
reguły obowiązują tu w całości. Pierwszą linię (`@AGENTS.md`) utrzymuje
`next dev`, nie usuwaj jej.

Całe UI i sesja użytkownika. Dane pobiera przeglądarka **bezpośrednio** z
backendu (:3001) z tokenem Bearer. Serwer frontendu rozmawia z backendem
tylko przy logowaniu i rejestracji.

## Stan

- `/sign-in` i `/sign-up` — react-hook-form + shadcn/ui, Server Actions
  wołające `signIn`/`registerRequest`. Zweryfikowane w przeglądarce
  end-to-end: rejestracja, walidacja klienta, logowanie, błędne hasło,
  wylogowanie.
- `/transactions` — strona główna (tam kierują `/`, logowanie i rejestracja):
  lista transakcji stronicowana po 10, filtry typu/kategorii/zakresu dat
  trzymane w URL, karty Przychody/Wydatki/Saldo, dodawanie i edycja w
  dialogu, usuwanie z potwierdzeniem. Całość w FSD i shadcn/ui.
- Layout panelu `(dashboard)/layout.tsx` — nagłówek z menu sekcji
  (Transakcje, Kategorie) i menu profilu (inicjały, imię, e-mail,
  wylogowanie).

**Czego jeszcze nie ma:** lista i formularz kategorii
(`(dashboard)/categories`) to wciąż gołe elementy HTML bez shadcn/ui, w
starym płaskim układzie `components/`+`hooks/`+`lib/` (nowy nagłówek dostają
już z layoutu). `/api/summary` nie ma jeszcze konsumenta w UI — hook
`hooks/use-summary.ts` istnieje, ale nikt go nie używa (karty podsumowania
czytają `totals` z listy transakcji). Brak UI dla `Budget`.

## Trasy

| Ścieżka | Plik | Uwagi |
| --- | --- | --- |
| `/` | `app/page.tsx` | `redirect("/transactions")` |
| `/sign-in`, `/sign-up` | `app/(auth)/*/page.tsx` | publiczne, `widgets/auth-card` |
| `/transactions`, `/categories` | `app/(dashboard)/*/page.tsx` | chronione przez `(dashboard)/layout.tsx` |
| `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | handlery Auth.js |
| `/api/token` | `app/api/token/route.ts` | mennica tokenów API (niżej) |

`app/providers.tsx` spina `QueryClientProvider` dla całej aplikacji.

## Sesja i token API

- **`src/auth.ts`** (Auth.js, provider Credentials, sesja JWT) **nie** dotyka
  Prismy ani hasha hasła — `authorize()` woła `POST /api/auth/login` przez
  `src/lib/auth-api.ts` i dostaje gotowy `{ user, token }`. `auth-api.ts`
  działa po stronie serwera i używa `API_URL` (fallback:
  `NEXT_PUBLIC_API_URL`). Typy sesji rozszerza `src/types/next-auth.d.ts`.
- **`src/proxy.ts`** robi tylko tanie sprawdzenie obecności cookie
  (`authjs.session-token` / `__Secure-authjs.session-token`) dla
  `/transactions/*` i `/categories/*`; bez cookie → `/sign-in?callbackUrl=…`.
  To nie jest autoryzacja — właściwą jest `auth()` w
  `(dashboard)/layout.tsx`. Nowa chroniona sekcja = nowy wpis w `matcher`
  **i** umieszczenie jej pod `(dashboard)`.
- **`GET /api/token`** zamienia cookie sesji na krótkożyciowy (10 min) token
  HS256 przez `signAccessToken` z `@expence/auth`, z `Cache-Control: no-store`.
  Cookie Auth.js nigdy nie jest przekazywane do backendu.
- **`src/lib/api-client.ts`** to jedyna droga z przeglądarki do backendu:
  - `apiFetch<T>(path, init)` dokleja `Authorization: Bearer`, bije w
    `NEXT_PUBLIC_API_URL`, zwraca `undefined` dla 204;
  - token trzyma w pamięci karty i odświeża z 30-sekundowym zapasem;
    równoległe zapytania dzielą jedno odświeżenie (`pendingToken`), a 401
    czyści cache tokenu;
  - błąd backendu rzuca jako `ApiRequestError` (`status`, `code`,
    `message`, `fields`) — formularze mapują `fields` na błędy pól;
  - `buildQuery(params)` składa query string, pomijając puste wartości.
  Nie wołaj `fetch` na backend z pominięciem `apiFetch`.

### Zmiana tożsamości = pełne przeładowanie

Logowanie, rejestracja i wylogowanie **zawsze** kończą się pełnym
przeładowaniem strony. Server Actions (`loginAction`, `registerAction`,
`logoutAction`) **nie** robią `redirect()`; po sukcesie formularz/menu woła
`navigateWithFreshSession()` z `src/lib/session-navigation.ts`. Token API z
`api-client.ts` i cache TanStack Query żyją w pamięci karty — nawigacja
klienta zostawiłaby je kolejnemu użytkownikowi: widziałby cudze dane, a jego
zapisy trafiałyby na poprzednie konto (odtworzone: A traci sesję w innej
karcie, proxy odsyła kartę A na `/sign-in` bez przeładowania, loguje się
tam B). Nowa akcja zmieniająca tożsamość (np. przełączanie konta) musi
iść tą samą drogą.

## Feature-Sliced Design (FSD)

Nowy kod frontendu — od modułu logowania/rejestracji wzwyż — powstaje wg
[Feature-Sliced Design](https://feature-sliced.design/) zamiast dawnego
płaskiego układu `components/`+`hooks/`+`lib/`. To migracja **częściowa i
celowa**: `categories` (komponenty w `components/categories/`, hooki w
`hooks/`) zostaje w starym układzie do osobnej migracji — nie przenoś ich
przy okazji innej zmiany. Nowe slice'y korzystają z niego jak z `shared`
(np. `useCategories` z `hooks/use-categories.ts` w selectach transakcji).

Warstwy w `src/` (import tylko w dół: `app` → `widgets` → `features` →
`entities` → shared):

- **`app/**/page.tsx`, `layout.tsx`** — trasy Next.js, w duchu FSD pełnią
  rolę warstwy `pages`: tylko kompozycja (auth guard przez `auth()`,
  złożenie widgetu i feature'a), zero logiki biznesowej. Next wymusza tu
  fizyczną lokalizację (routing), więc to jedyna warstwa, której nie da
  się przenieść pod osobny katalog.
- **`widgets/`** — samodzielne bloki strony składane z feature'ów i encji:
  `widgets/auth-card` (ramka `Card` + nagłówek + link zamienny współdzielony
  przez `/sign-in` i `/sign-up`), `widgets/app-header` (logo, menu sekcji,
  menu profilu — w `(dashboard)/layout.tsx`), `widgets/transactions-summary`
  i `widgets/transactions-table` (tabela, paginacja, akcje wiersza).
- **`features/<domena>/<akcja>/`** — jedna intencja użytkownika:
  `features/auth/login`, `features/auth/register`, `features/auth/logout`,
  `features/transaction/upsert` (dodanie/edycja w jednym dialogu),
  `features/transaction/delete`, `features/transaction/filter`. Segmenty w
  środku: `ui/` (komponent kliencki, formularze przez react-hook-form),
  `api/` (Server Action `"use server"` albo mutacja TanStack Query) i
  `model/` (stan, np. `useTransactionFilters` — filtry i strona w URL,
  czytane niezależnie przez filtry, podsumowanie i tabelę; strona
  `/transactions` owija je w `<Suspense>`, bo `useSearchParams` tego
  wymaga).
- **`entities/transaction`** — to, co o transakcji wie każda warstwa wyżej:
  zapytanie listy (`useTransactions`), `TransactionAmount` (znak i kolor z
  `type`), etykiety typów. Mutacje nie należą do encji — to intencje
  użytkownika, więc siedzą w `features/transaction/*`.
- **`shared`** na razie **nie jest osobnym katalogiem** — tę rolę pełnią
  już istniejące `components/ui` (prymitywy shadcn/ui spięte przez
  `components.json`) i `lib/*` (m.in. `cn`, `auth-api.ts`, `api-client.ts`,
  `query-keys.ts`, `session-navigation.ts`, `date.ts` — konwersje
  `<input type="date">` ↔ ISO; dzień transakcji zapisujemy jako południe
  czasu lokalnego, żeby strefa nie przerzuciła go na sąsiedni dzień). Nie
  duplikuj ich pod nowym `shared/`, dopóki nie ruszy pełna migracja reszty
  aplikacji.
- Brak osobnej warstwy `entities` dla auth: sesja/`UserDto` to już
  współdzielony kontrakt z `@expence/types`, a jej infrastruktura
  (`next-auth`) siedzi w `src/auth.ts` — dokładanie `entities/user` tylko
  po to, by zaznaczyć checkbox FSD, byłoby pustą abstrakcją.

**Publiczne API slice'a to wyłącznie `index.ts` w jego korzeniu** — import
spoza slice'a idzie przez `@/features/auth/login`, nigdy przez
`@/features/auth/login/ui/login-form` bezpośrednio. To ten sam pomysł co
`*.messages.ts` w modułach backendu: jeden plik jest granicą, reszta jest
szczegółem implementacyjnym. Nowy eksport = dopisanie go do `index.ts`.

Gdy `categories` przejdzie na FSD, dostanie własne katalogi w
`entities/`/`features/` analogicznie do `entities/transaction` i
`features/transaction/*`.

## TanStack Query

- Klucze cache'a są scentralizowane w `src/lib/query-keys.ts`
  (`queryKeys.transactions`, `.categories`, `.summary`). Nie wpisuj kluczy
  inline w hookach.
- Klucze są hierarchiczne: `["transactions"]` jest prefiksem wszystkich
  stron i filtrów listy. Mutacja unieważnia **całe gałęzie**
  (`queryKeys.transactions.all`, `queryKeys.summary.all`), nie pojedyncze
  wpisy — zmiana transakcji wpływa na każdą stronę listy i na sumy.
- Zapytania (odczyt) mieszkają w `entities/*/api`, mutacje w
  `features/*/*/api`; oba wołają `apiFetch`.

## Formularze

react-hook-form + `standardSchemaResolver` ze schematem z `@expence/types`
— reguł walidacji nie dopisuje się w komponencie. Dla schematów z
transformacją (kwota) obowiązuje trzyparametrowy generyk `useForm` i
wysyłanie `z.input` do API — patrz "`packages/types` to kontrakt" w głównym
`CLAUDE.md`. Błędy pól z `ApiRequestError.fields` przepisuj do
`form.setError`. Kwoty formatuj wyłącznie helperami z
`packages/types/src/money.ts`.

## UI: shadcn/ui i Tailwind 4

- **Tailwind v4 nie ma `tailwind.config.js`** — motyw i tokeny shadcn/ui są
  w `src/app/globals.css`. `components.json` celowo ma pusty
  `tailwind.config`.
- Prymitywy dodajesz przez `pnpm dlx shadcn@latest add <komponent>` (z
  katalogu `apps/frontend`); lądują w `src/components/ui/`. Nie edytuj ich
  pod jeden przypadek użycia — wariant albo kompozycja w warstwie wyżej.
- **Pułapka CLI: `shadcn add` generuje dziś import `cn` z pakietu npm `cn`**,
  nie z `@/lib/utils`, mimo że `components.json` ma
  `"utils": "@/lib/utils"` — ten alias CLI ignoruje dla samego helpera `cn`.
  Repo ma już `cn` w `src/lib/utils.ts` (przez `clsx`+`tailwind-merge`, oba i
  tak zależnościami). Po każdym `shadcn add` podmień `from "cn"` na
  `from "@/lib/utils"` w nowych plikach `components/ui/*` i usuń pakiet `cn`
  z `package.json` — inaczej powstają dwie równoległe implementacje tej
  samej funkcji. `class-variance-authority` CLI też potrafi wpisać do
  importu bez dodania do `package.json` — sprawdź `pnpm typecheck` po każdym
  dodaniu komponentu.
- Ikony z `lucide-react`.

## Pułapki specyficzne dla frontendu

- **`next-auth` jest w becie (`5.0.0-beta.32`), wersja przypięta dokładnie,
  bez `^`.** API bety zmienia się między wydaniami — nie podbijaj jej przy
  okazji innej zmiany.
- `useSearchParams` wymaga granicy `<Suspense>` — bez niej `pnpm build`
  wyłoży się na prerenderingu strony.

Komendy tylko dla tej aplikacji: `pnpm --filter @expence/frontend dev|build|lint|typecheck`.
Weryfikacja zmian w UI: przeglądarka na :3000 z działającym backendem,
konto `dev@expence.local` / `dev12345` z seeda.
