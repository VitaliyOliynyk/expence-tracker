# Moduł użytkownika + moduł autoryzacji w API (komunikacja przez CQRS)

## Context

Dziś logowanie żyje **wyłącznie we frontendzie**: `apps/frontend/src/auth.ts` (Auth.js Credentials) sam odpytuje Prismę i sam weryfikuje hasło przez `apps/frontend/src/lib/password.ts`. Backend jest tylko bezstanowym weryfikatorem tokenu (`apps/backend/proxy.ts` → `src/lib/jwt.ts`). Skutki:

- **Nie ma rejestracji** — `hashPassword` nie ma ani jednego konsumenta, seed tworzy `dev@expence.local` z `passwordHash: null`, więc **żadne konto nie może się dziś zalogować**.
- API nie ma własnej autoryzacji — klient inny niż przeglądarka z cookie Auth.js nie ma jak zdobyć tokenu.
- Reguły dotyczące użytkownika (hash hasła, unikalność e-maila) nie mają swojego miejsca w domenie backendu.

Cel: API staje się źródłem prawdy o tożsamości. Powstają dwa moduły — użytkownika (repozytorium + serwis) i autoryzacji (`register`, `login`, JWT) — a **rozmawiają ze sobą wyłącznie przez komendy i zapytania na wspólnej szynie (CQRS)**, nigdy przez bezpośredni import cudzych plików. Auth.js zostaje jako warstwa sesji cookie dla przeglądarki, ale jego `authorize()` przestaje dotykać Prismy i woła `POST /api/auth/login`.

Decyzje podjęte z użytkownikiem: backend źródłem prawdy; **sam access token** (bez refresh tokenu, bez nowych tabel); do `User` dochodzą `updatedAt`, `lastLoginAt`, `isActive`. Wzorzec repozytorium i CQRS wprowadzamy **tylko w nowych modułach** — `expense.service.ts`, `category.service.ts` i `summary.service.ts` zostają nietknięte (pytanie o refaktor zostało bez odpowiedzi, biorę wariant o najmniejszym diffie; ścieżka migracji starych serwisów na szynę jest opisana na końcu).

## Postęp realizacji

- [x] 1. Szyna CQRS (`apps/backend/src/server/bus/`)
- [x] 2. Pakiet `@expence/auth`
- [x] 3. `packages/types/src/auth.ts`
- [x] 4. Prisma: pola `User` + migracja + seed
- [x] 5. Moduł użytkownika (`modules/user/`)
- [x] 6. Moduł autoryzacji (`modules/auth/`)
- [x] 7. Route handlery + `proxy.ts`
- [x] 8. Frontend (Auth.js, `/sign-up`)
- [x] 9. Dokumentacja (`CLAUDE.md`)
- [x] 10. Weryfikacja end-to-end

---

## 1. Szyna CQRS — `apps/backend/src/server/bus/`

Warstwa infrastrukturalna, ~80 linii, bez żadnej biblioteki. Zasady:

- **Komenda** zmienia stan i ma **dokładnie jednego** handlera. **Zapytanie** nic nie zmienia i też ma jednego handlera. Zdarzeń (pub/sub, wielu odbiorców) w tej zmianie **nie wprowadzamy** — dopiszemy je dopiero, gdy pojawi się realny odbiorca.
- Moduł nie importuje z cudzego modułu **niczego poza jego plikiem `*.messages.ts`** (definicje wiadomości + typy payloadu i wyniku). `auth.service.ts` nigdy nie widzi `user.repository.ts` ani Prismy.
- Route handler jest kompozytorem: waliduje body istniejącym `parseJsonBody`, robi `dispatch(...)`, tłumaczy błąd domenowy na `fail(...)`.

**`bus/message.ts`** — definicje wiadomości z fantomowym typem wyniku, dzięki czemu `dispatch` sam wnioskuje typ zwracany:

```ts
export type Message<TPayload, TResult> = {
  readonly type: string;
  readonly payload: TPayload;
  /** Nosnik typu wyniku - nigdy nie istnieje w runtime. */
  readonly __result?: TResult;
};

export type MessageFactory<TPayload, TResult> = {
  (payload: TPayload): Message<TPayload, TResult>;
  readonly type: string;
};

/** defineCommand("user.register") i defineQuery("user.getById") - rozne nazwy, ta sama mechanika. */
export function defineCommand<TPayload, TResult = void>(type: string): MessageFactory<TPayload, TResult>;
export function defineQuery<TPayload, TResult>(type: string): MessageFactory<TPayload, TResult>;
```

**`bus/bus.ts`** — `createBus()` zwraca `{ register, dispatch }`:

```ts
register<TPayload, TResult>(
  factory: MessageFactory<TPayload, TResult>,
  handler: (payload: TPayload) => Promise<TResult> | TResult,
): void;                                   // druga rejestracja tego samego typu -> blad

dispatch<TPayload, TResult>(message: Message<TPayload, TResult>): Promise<TResult>;
                                           // brak handlera -> blad "Brak handlera dla <type>"
```

Typ `Dispatch` (`<TPayload, TResult>(message: Message<TPayload, TResult>) => Promise<TResult>`) eksportujemy osobno — serwisy przyjmują go argumentem zamiast importować singleton (patrz sekcja 5).

**`bus/index.ts`** — singleton z rejestracją wszystkich modułów, **jedyne miejsce, które zna komplet handlerów**:

```ts
const globalForBus = globalThis as unknown as { bus?: Bus };

function createAppBus(): Bus {
  const bus = createBus();
  registerUserHandlers(bus);
  registerAuthHandlers(bus);
  return bus;
}

export const bus: Bus = globalForBus.bus ?? createAppBus();
if (process.env.NODE_ENV !== "production") globalForBus.bus = bus;
export const dispatch: Dispatch = (message) => bus.dispatch(message);
```

Cache na `globalThis` jest **konieczny**, nie kosmetyczny: hot reload Next przeładowuje moduły i bez niego druga rejestracja tego samego typu wywaliłaby dev-server. Ten sam zabieg co dla `prisma` w `packages/db/src/index.ts:19`.

## 2. Nowy pakiet `packages/auth` (`@expence/auth`)

Prymitywy kryptograficzne mają **trzech** konsumentów (moduł użytkownika hashuje i weryfikuje, moduł autoryzacji i frontend podpisują token, seed hashuje hasło dev-usera). Bez wspólnego miejsca powielilibyśmy scrypt w trzech plikach, a stałe tokenu są już dziś zduplikowane między `apps/frontend/src/lib/access-token.ts` a `apps/backend/src/lib/jwt.ts`. Pakiet kopiuje strukturę `packages/types` (`package.json` z `main`/`types`/`exports` na `./src/index.ts`, `tsconfig.json` extends `@expence/config/tsconfig.base.json`, importy względne z rozszerzeniem `.js`).

- `src/password.ts` — **przeniesione 1:1** z `apps/frontend/src/lib/password.ts` (scrypt z `node:crypto`, format `scrypt$<salt-hex>$<hash-hex>`, `timingSafeEqual`). Dodatkowo `DUMMY_PASSWORD_HASH` — stały hash do porównania „na pusto" przy nieistniejącym użytkowniku.
- `src/token.ts` — jedno źródło prawdy dla `ACCESS_TOKEN_ISSUER` (**`"expence-auth"`** zamiast dzisiejszego `"expence-frontend"`, bo token bije już nie tylko frontend), `ACCESS_TOKEN_AUDIENCE = "expence-backend"`, `ACCESS_TOKEN_TTL_SECONDS = 600`, plus `signAccessToken(userId)` i `verifyAccessToken(token)` na `jose` — kod przeniesiony z `access-token.ts` i `jwt.ts`.
- `src/index.ts` — barrel. `dependencies`: `jose@^6.2.12` (ta sama wersja co w appach).

**Rejestracja pakietu:** dopisać `"@expence/auth"` do `transpilePackages` w **obu** `next.config.ts` (`apps/backend/next.config.ts:12`, `apps/frontend/next.config.ts:10`) oraz do `dependencies` w `apps/backend/package.json`, `apps/frontend/package.json` i (jako devDependency, dla seeda) `packages/db/package.json`. Po tym `pnpm install`.

## 3. `packages/types/src/auth.ts` — kontrakt (nowy plik + wpis w barrelu)

Zgodnie z CLAUDE.md walidacja zaczyna się tutaj; te same schematy zasilają `parseJsonBody` w backendzie, payloady komend i formularze w UI.

- `userDtoSchema` — `id` (`z.uuid()`), `name` (nullable), `email` (`z.email()`), `image` (nullable), `createdAt` (`z.iso.datetime()`). **Bez `passwordHash`** — DTO nigdy go nie niesie.
- `passwordSchema` — `z.string().min(8, "Haslo musi miec co najmniej 8 znakow").max(128)`.
- `registerSchema` — `name` (`z.string().trim().min(1).max(64)`), `email` (`z.email().trim().toLowerCase()`), `password: passwordSchema`.
- `loginSchema` — `email` (jw.), `password: z.string().min(1)` (przy logowaniu nie powtarzamy reguły długości — dla starych haseł dałaby 400 zamiast 401).
- `authResponseSchema` — `{ user: userDtoSchema, token: z.string(), expiresAt: z.number() }`; kształt zgodny z tym, czego `api-client.ts` oczekuje dziś od `/api/token`.
- Dopisać `export * from "./auth.js";` do `packages/types/src/index.ts` (alfabetycznie, przed `./category.js`).

## 4. Prisma — pola `User` i pierwsza migracja

W `packages/db/prisma/schema.prisma`, model `User`:

```prisma
  passwordHash  String?
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
```

Migracji jeszcze nie ma (`packages/db/prisma/migrations/` nie istnieje), więc `pnpm db:migrate` utworzy migrację startową obejmującą od razu nowe pola. `passwordHash` zostaje opcjonalny — konta OAuth i seedowe go nie mają.

**Seed** (`packages/db/prisma/seed.ts`): `passwordHash: null` → `passwordHash: await hashPassword(DEV_USER_PASSWORD)` z importem z `@expence/auth` (`DEV_USER_PASSWORD = "dev12345"`, wypisane w `console.log` na końcu seeda). Hash idzie w `create` **i** w `update`, żeby powtórny seed naprawiał konto bez hasła.

## 5. Moduł użytkownika — `apps/backend/src/server/modules/user/`

Nowy katalog `modules/` obok istniejącego `services/`; stare serwisy zostają na miejscu.

| Plik | Rola |
| --- | --- |
| `user.messages.ts` | **Jedyny plik importowany z zewnątrz.** Definicje komend/zapytań + typy payloadu i wyniku. |
| `user.repository.ts` | Jedyne miejsce w backendzie dotykające `prisma.user`. |
| `user.service.ts` | Reguły domenowe; czysty TS, nie zna szyny ani HTTP. |
| `user.handlers.ts` | Cienki adapter: `registerUserHandlers(bus)` wiąże wiadomości z serwisem. |
| `user.mapper.ts` | `toUserDto(user: User): UserDto` — konwencja jak `toCategoryDto` (`Date → toISOString()`), świadomie bez `passwordHash`. |
| `user.errors.ts` | `EmailTakenError` — błąd domenowy, bez wiedzy o kodach HTTP. |

**Publiczny kontrakt modułu (`user.messages.ts`):**

```ts
export const RegisterUserCommand   = defineCommand<RegisterInput, UserDto>("user.register");
export const TouchUserLoginCommand = defineCommand<{ userId: string }>("user.touchLogin");
export const VerifyUserCredentialsQuery =
  defineQuery<{ email: string; password: string }, { userId: string; isActive: boolean } | null>("user.verifyCredentials");
export const GetUserByIdQuery = defineQuery<{ userId: string }, UserDto | null>("user.getById");
```

Kluczowa decyzja: **`passwordHash` nigdy nie przekracza granicy modułu.** Zamiast wystawiać „daj mi hash tego e-maila", moduł użytkownika sam porównuje hasło i oddaje wyłącznie werdykt. Weryfikacja niczego nie zmienia, więc jest **zapytaniem**, nie komendą; zapis `lastLoginAt` to osobna komenda, którą wywoła moduł autoryzacji po sukcesie.

`user.repository.ts`: `findByEmail`, `findById`, `create`, `touchLastLogin` — funkcje modułowe (spójnie z resztą backendu, żadnych klas), zwracające surowe modele Prismy; mapowanie do DTO to zadanie serwisu.

`user.service.ts`:
- `registerUser(input)` — normalizacja e-maila, `hashPassword`, `create`, przechwycenie `P2002` → `EmailTakenError`, zwrot `UserDto`.
- `verifyCredentials({ email, password })` — `findByEmail`, potem `verifyPassword(password, user?.passwordHash ?? null)`. **Gdy użytkownika nie ma, i tak wykonujemy `verifyPassword` przeciw `DUMMY_PASSWORD_HASH`** — inaczej różnica czasu odpowiedzi zdradza, które e-maile są zarejestrowane.
- `getUserById(id)`, `markLogin(id)`.

## 6. Moduł autoryzacji — `apps/backend/src/server/modules/auth/`

Ten moduł **nie ma repozytorium ani dostępu do bazy** — o użytkownika pyta wyłącznie przez szynę. Cała jego własna wiedza to podpisywanie tokenów.

**`auth.messages.ts`:**

```ts
export const RegisterCommand = defineCommand<RegisterInput, AuthResponse>("auth.register");
export const LoginCommand    = defineCommand<LoginInput, AuthResponse>("auth.login");
```

Login jest **komendą**, mimo że „czyta" — aktualizuje `lastLoginAt`, więc zmienia stan. `/api/auth/me` nie dostaje własnej wiadomości w module auth: handler dispatchuje wprost `GetUserByIdQuery` modułu użytkownika (route jest kompozytorem, wolno mu sięgnąć po dowolną wiadomość — pusty przelot przez drugi moduł byłby czystą ceremonią).

**`auth.service.ts`** — funkcje przyjmują `dispatch` **pierwszym argumentem** zamiast importować singleton z `bus/index.ts`. To nie jest ozdobnik: `bus/index.ts` importuje `auth.handlers.ts`, a ten `auth.service.ts` — import w drugą stronę zamknąłby cykl. Przy okazji serwis da się testować z atrapą `dispatch`.

- `register(dispatch, input)` → `dispatch(RegisterUserCommand(input))` → `signAccessToken(user.id)` → `{ user, token, expiresAt }`.
- `login(dispatch, input)` → `dispatch(VerifyUserCredentialsQuery(input))`; `null` → `InvalidCredentialsError`; `isActive === false` → `InactiveAccountError`; sukces → `dispatch(TouchUserLoginCommand)` + `dispatch(GetUserByIdQuery)` + token.

**`auth.errors.ts`** — `InvalidCredentialsError`, `InactiveAccountError`. Serwis nie zna HTTP; tłumaczenie na kody robi handler.

**`apps/backend/src/lib/jwt.ts`** — zostaje `readBearerToken` (czysto HTTP-owe), a `verifyAccessToken` i stałe re-eksportujemy z `@expence/auth`, żeby `proxy.ts` nie zmieniał importów.

## 7. Route handlery i proxy

Wzorzec identyczny jak w `categories/route.ts` — zmienia się tylko środek: zamiast wołania serwisu jest `dispatch`.

```ts
// apps/backend/src/app/api/auth/login/route.ts
export async function POST(request: Request) {
  const body = await parseJsonBody(request, loginSchema);
  if (body.error) return body.error;

  try {
    return ok(await dispatch(LoginCommand(body.data)));
  } catch (error) {
    if (error instanceof InvalidCredentialsError)
      return fail("UNAUTHORIZED", "Nieprawidlowy e-mail lub haslo");
    if (error instanceof InactiveAccountError)
      return fail("FORBIDDEN", "Konto jest nieaktywne");
    console.error("POST /api/auth/login", error);
    return fail("INTERNAL", "Nie udalo sie zalogowac");
  }
}
```

- `api/auth/register/route.ts` — `POST`, `registerSchema` → `created(...)`; `EmailTakenError` → `fail("CONFLICT", "Konto z tym adresem juz istnieje")`.
- `api/auth/login/route.ts` — jak wyżej; **ten sam komunikat 401 dla złego hasła i nieistniejącego konta**.
- `api/auth/me/route.ts` — `GET`, chroniony przez `requireUserId` z `src/lib/auth-context.ts` → `dispatch(GetUserByIdQuery({ userId: auth.userId }))`, `null` → `fail("NOT_FOUND", ...)`.

**`apps/backend/proxy.ts:9`** — `PUBLIC_PATHS` to porównanie **dokładne**, nie prefiksowe, więc obie ścieżki wpisujemy literalnie:

```ts
const PUBLIC_PATHS = ["/api/health", "/api/auth/login", "/api/auth/register"];
```

`/api/auth/me` celowo **nie** trafia na tę listę.

> **Odkryty i naprawiony pre-existing bug (nie z tego planu, ale blokujacy caly backend):**
> `apps/backend/proxy.ts` i `apps/frontend/proxy.ts` lezaly w korzeniu pakietu, a `app/`
> jest w `src/app/`. Next 16 wymaga, zeby `proxy.ts` byl **na tym samym poziomie co `app`**
> ("Create a proxy.ts file... located at the same level as pages or app" — patrz
> `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
> Przy zlej lokalizacji proxy.ts nigdy sie nie uruchamial (zero logow, zaden `console.error`
> w jego ciele nie drukowal sie), a kazdy chroniony route "dzialal" tylko dzieki wlasnemu
> `requireUserId()` jako drugiej barierze — token z `/api/auth/login` zawsze konczyl sie 401,
> bo `x-user-id` nigdy nie byl ustawiany. Naprawa: `mv apps/backend/proxy.ts apps/backend/src/proxy.ts`
> (analogicznie dla frontendu). Zero zmian w tresci plikow. Odkryte dopiero teraz, bo
> CLAUDE.md przyznaje, ze backend nigdy nie byl uruchomiony przeciw bazie przed ta sesja.
>
> Druga odkryta pre-existing wada: relatywne importy z rozszerzeniem `.js` wskazujace na
> pliki `.ts` (`packages/types/src/index.ts` i siostrzane pliki, `packages/db/src/index.ts`)
> psuly bundling Turbopacka dla App Route i Middleware ("Module not found: Can't resolve
> './money.js'") — mimo ze to dokladnie konwencja opisana w CLAUDE.md ("sciezki wzgledne
> z rozszerzeniem .js"). `tsx` (seed, migracje) toleruje **oba** warianty, wiec usunieto
> rozszerzenia z tych plikow; nowy pakiet `@expence/auth` od razu pisany bez rozszerzen.
> `packages/db/prisma/seed.ts` (uruchamiany wylacznie przez tsx, nigdy bundlowany) zostal
> bez zmian.

## 8. Frontend — Auth.js przestaje dotykać Prismy

- **`apps/frontend/src/lib/auth-api.ts`** (nowy) — serwerowy klient bez Bearera: `loginRequest(email, password)` i `registerRequest(input)` wołające `POST ${API_URL}/api/auth/{login,register}`, parsujące odpowiedź `authResponseSchema`, zwracające `null` przy 401 i rzucające błąd przy 409/400. Bazowy URL: `process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"` — dopisać opcjonalne `API_URL` do `.env.example` z komentarzem, że służy do wołania backendu z serwera (w dev równe `NEXT_PUBLIC_API_URL`).
- **`apps/frontend/src/auth.ts`** — `authorize()` zamiast `prisma.user.findUnique` + `verifyPassword` woła `loginRequest(...)` i zwraca `{ id, email, name, image }`. `PrismaAdapter`, `session: { strategy: "jwt" }` i callbacki `jwt`/`session` bez zmian. Lokalny `credentialsSchema` zastąpić importem `loginSchema` z `@expence/types` (koniec z trzecią definicją reguł).
- **`apps/frontend/src/lib/password.ts` — usunąć.** Po zmianie w `auth.ts` nie ma konsumenta; logika żyje w `@expence/auth`.
- **`apps/frontend/src/lib/access-token.ts`** — zredukować do re-eksportu z `@expence/auth` (albo usunąć i poprawić import w `src/app/api/token/route.ts`). Frontend nadal bije własny token, bo sesja cookie żyje dłużej niż 10-minutowy token i po jego wygaśnięciu nie ma jak wrócić do hasła.
- **`apps/frontend/src/app/(auth)/sign-up/page.tsx`** (nowy) — w stylu istniejącego `sign-in/page.tsx` (Server Component + inline Server Action, gołe `<input>`): `registerRequest(...)`, a po sukcesie `signIn("credentials", { ..., redirectTo: "/expenses" })`, żeby od razu powstała sesja cookie. Wzajemne linki ze `sign-in`. `/sign-up` jest poza matcherem w `apps/frontend/proxy.ts`, więc tam nic nie zmieniamy.

## 9. Dokumentacja

`CLAUDE.md`: dopisać `@expence/auth` do listy nazw pakietów, zaktualizować sekcję „Przepływ autoryzacji" (login/register w backendzie, `authorize()` woła API, stałe tokenu w `@expence/auth`), dodać `/api/auth/*` do przykładów `curl` i **nową podsekcję o CQRS**: komenda/zapytanie ma jednego handlera, moduł importuje z cudzego modułu tylko `*.messages.ts`, nowy handler rejestruje się w `bus/index.ts`. Usunąć z „Czego jeszcze nie ma" nieaktualne zdanie o braku migracji.

Poza zakresem, do rozważenia później: przeniesienie `expense`/`category`/`summary` na szynę (te same route handlery, `dispatch` zamiast wołania serwisu), zdarzenia domenowe (np. `UserRegistered` → założenie kategorii startowych) oraz reguła ESLinta `no-restricted-imports` blokująca import `modules/*/!(*.messages)` spoza modułu.

---

## Weryfikacja

```bash
pnpm install                 # nowy pakiet @expence/auth w workspace
pnpm db:up
pnpm db:migrate              # pierwsza migracja: User z isActive/lastLoginAt/updatedAt
pnpm db:seed                 # dev@expence.local ma juz hash hasla dev12345
pnpm typecheck && pnpm lint  # musi zostac na zerze bledow
pnpm dev
```

Backend bez UI (`API=localhost:3001`):

```bash
curl -s $API/api/health                          # {"status":"ok","database":"up"}

# rejestracja -> 201 z uzytkownikiem i tokenem
curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ala","email":"ala@example.com","password":"tajnehaslo"}'

# powtorka tego samego e-maila -> 409 CONFLICT
# haslo krotsze niz 8 znakow -> 400 BAD_REQUEST z mapa fields.password

TOKEN=$(curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ala@example.com","password":"tajnehaslo"}' | jq -r .token)

curl -s $API/api/auth/me -H "Authorization: Bearer $TOKEN"   # dane uzytkownika, bez passwordHash
curl -i $API/api/auth/me                                     # 401 bez tokenu
curl -s $API/api/expenses -H "Authorization: Bearer $TOKEN"   # token z /api/auth/login dziala na chronionych trasach

# zle haslo i nieistniejacy e-mail -> identyczne 401 "Nieprawidlowy e-mail lub haslo"
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ala@example.com","password":"zle"}'
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"email":"nikt@example.com","password":"tajnehaslo"}'
```

Kontrole specyficzne dla CQRS:

- **Hot reload nie wywala szyny:** przy działającym `pnpm dev` zapisać `auth.service.ts` i ponowić logowanie — brak błędu o podwójnej rejestracji handlera (dowód, że cache na `globalThis` działa).
- **Brak handlera jest głośny:** tymczasowo zakomentować `registerUserHandlers(bus)` w `bus/index.ts` → `POST /api/auth/login` musi zwrócić 500 z logiem „Brak handlera dla user.verifyCredentials", a nie po cichu przejść.
- **Granica modułów trzyma:** `grep -rn "user.repository\|user.service" apps/backend/src/server/modules/auth` nie zwraca nic; `grep -rn "prisma" apps/backend/src/server/modules/auth` nie zwraca nic.
- **`passwordHash` nie wycieka:** `curl -s $API/api/auth/me -H "Authorization: Bearer $TOKEN" | grep -i password` bez trafień; to samo dla odpowiedzi `/api/auth/login` i `/register`.

Izolacja danych (regresja, której nie wolno złamać): tokenem użytkownika A odpytać `GET /api/expenses/<id-rekordu-B>` → musi być 404, nie 200.

Przez UI: `/sign-up` → rejestracja → automatyczne przekierowanie na `/expenses`; wylogowanie → `/sign-in` z `dev@expence.local` / `dev12345` → lista wydatków z seeda się ładuje (dowód, że `authorize()` przez API i mennica `/api/token` nadal działają razem).

Testów automatycznych w repo nie ma (brak Vitest/Playwright) — weryfikacja jest ręczna. Postawienie runnera to osobne zadanie, poza zakresem tej zmiany.
