# Kategorie wydatków — dokończenie frontendu

## Kontekst

Prośba brzmiała jak specyfikacja modułu CRUD dla `Category` w stylu NestJS
(Entity, Service, Controller z JWT guardem, walidacja przez class-validator,
CQRS z modułem User). Eksploracja repo wykazała, że **backend dla kategorii
już w pełni istnieje i jest zweryfikowany end-to-end** (potwierdza to też
`CLAUDE.md`):

- model `Category` w `packages/db/prisma/schema.prisma` (`id`, `userId`,
  `name`, `color`, `icon`, relacja do `User`, `@@unique([userId, name])`),
- kontrakt walidacji Zod w `packages/types/src/category.ts`
  (`categoryDtoSchema`, `createCategorySchema`, `updateCategorySchema`) —
  to jest odpowiednik class-validator w tym stosie,
- serwis `apps/backend/src/server/services/category.service.ts`
  (list/create/update/delete, każda operacja zawężona do `userId` przez
  `updateMany`/`deleteMany`),
- chronione route handlery `GET/POST /api/categories` i
  `PATCH/DELETE /api/categories/[id]` — ochrona JWT dzieje się w
  `apps/backend/src/proxy.ts` (odpowiednik guarda), `userId` trafia do
  handlera przez nagłówek `x-user-id` (`requireUserId()`),
- seed 6 kategorii startowych.

Backend **celowo** nie używa wzorca modułowego z busem (`server/modules/*` +
CQRS) — ten wzorzec jest zarezerwowany w tym repo dla `user`/`auth`.
`category` (podobnie jak `expense`, `summary`) używa prostszego stylu:
route → serwis → Prisma bezpośrednio. Po pokazaniu tego stanu użytkownik
wybrał: **nie ruszać backendu, dokończyć wyłącznie frontend.**

Brakuje: hooków `useUpdateCategory`/`useDeleteCategory` oraz realnego UI na
`/categories` (dziś czysty placeholder z TODO).

## Podejście

Replikujemy wzorzec już użyty dla `expenses`
(`apps/frontend/src/hooks/use-expenses.ts`,
`apps/frontend/src/components/expenses/expense-form.tsx`,
`apps/frontend/src/components/expenses/expense-list.tsx`,
`apps/frontend/src/app/(dashboard)/expenses/page.tsx`) — bez shadcn/ui
(katalog `components/ui` jest pusty), zwykłe elementy HTML stylowane
klasami Tailwind zgodnymi z tokenami z `globals.css`
(`bg-background`, `border-input`, `text-destructive`,
`text-muted-foreground` itd.), react-hook-form ze `standardSchemaResolver`
i tym samym schematem Zod co backend.

### 1. `apps/frontend/src/hooks/use-categories.ts` — dopisać brakujące mutacje

Wzorem `useUpdateExpense`/`useDeleteExpense` z `use-expenses.ts`:

```ts
export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) =>
      apiFetch<CategoryDto>(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      // ExpenseDto i SummaryBucket zagniezdzaja dane kategorii (nazwa/kolor) -
      // trzeba odswiezyc tez cache wydatkow i podsumowania.
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary.all });
    },
  });
}
```

Import `UpdateCategoryInput` z `@expence/types` obok istniejących importów.
Uzasadnienie inwalidacji `expenses`/`summary`: usunięcie kategorii ustawia
`categoryId` powiązanych wydatków na `null` (`onDelete: SetNull` w
schemacie), a `ExpenseDto.category` i `SummaryBucket.color/label` niosą dane
kategorii zagnieżdżone — bez inwalidacji te widoki pokazywałyby nieaktualne
dane. Ten sam wzorzec (`useCreateExpense` invaliduje `expenses.all` +
`summary.all`) już jest w kodzie.

### 2. Nowy komponent `apps/frontend/src/components/categories/category-form.tsx`

Formularz tworzenia **i** edycji w jednym komponencie (analogicznie do
`expense-form.tsx`, ale bez trzyparametrowego generyku `useForm` — schemat
kategorii nie ma zmiany nazwy pola między wejściem a wyjściem, jedyna
różnica to `color` z `.default()`, którą pokrywa jawna wartość domyślna):

```tsx
"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { createCategorySchema, type CategoryDto, type CreateCategoryInput } from "@expence/types";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";

type CategoryFormProps = {
  category?: CategoryDto;
  onSuccess?: () => void;
};

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(category?.id ?? "");
  const mutation = category ? updateCategory : createCategory;

  const form = useForm<CreateCategoryInput>({
    resolver: standardSchemaResolver(createCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      color: category?.color ?? "#64748b",
      icon: category?.icon ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    if (!category) form.reset();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        {...form.register("name")}
        placeholder="Nazwa kategorii"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <input
        {...form.register("color")}
        type="color"
        className="h-9 w-16 rounded-md border border-input bg-background"
      />
      <input
        {...form.register("icon")}
        placeholder="Ikona (opcjonalnie)"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {form.formState.errors.name ? (
        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Zapisywanie..." : category ? "Zapisz zmiany" : "Dodaj kategorie"}
      </button>
    </form>
  );
}
```

Uwaga: `useUpdateCategory(category?.id ?? "")` wywoływane bezwarunkowo (hooki
nie mogą być warunkowe) — mutacja z pustym `id` po prostu nigdy nie zostanie
odpalona w trybie tworzenia, bo używany jest wtedy `createCategory`.

### 3. Nowy komponent `apps/frontend/src/components/categories/category-list.tsx`

Analogicznie do `expense-list.tsx`, z inline-edycją (klik "Edytuj" podmienia
wiersz na `CategoryForm`):

```tsx
"use client";

import { useState } from "react";
import { useCategories, useDeleteCategory } from "@/hooks/use-categories";
import { CategoryForm } from "./category-form";

export function CategoryList() {
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (categories.isPending) return <p className="text-sm text-muted-foreground">Ladowanie...</p>;
  if (categories.isError) return <p className="text-sm text-destructive">{categories.error.message}</p>;
  if (categories.data.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak kategorii.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {categories.data.map((category) =>
        editingId === category.id ? (
          <li key={category.id} className="py-3">
            <CategoryForm category={category} onSuccess={() => setEditingId(null)} />
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="mt-2 text-sm text-muted-foreground hover:underline"
            >
              Anuluj
            </button>
          </li>
        ) : (
          <li key={category.id} className="flex items-center gap-3 py-3 text-sm">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="flex-1">{category.name}</span>
            {category.icon ? <span className="text-muted-foreground">{category.icon}</span> : null}
            <button
              type="button"
              onClick={() => setEditingId(category.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              Edytuj
            </button>
            <button
              type="button"
              onClick={() => deleteCategory.mutate(category.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              Usun
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
```

### 4. `apps/frontend/src/app/(dashboard)/categories/page.tsx` — zastąpić placeholder

Ten sam układ co `expenses/page.tsx`:

```tsx
import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Nowa kategoria</h1>
        <CategoryForm />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Wszystkie kategorie</h2>
        <CategoryList />
      </section>
    </div>
  );
}
```

## Pliki do zmiany/dodania

- `apps/frontend/src/hooks/use-categories.ts` — dopisać `useUpdateCategory`, `useDeleteCategory`
- `apps/frontend/src/components/categories/category-form.tsx` — nowy
- `apps/frontend/src/components/categories/category-list.tsx` — nowy
- `apps/frontend/src/app/(dashboard)/categories/page.tsx` — zastąpić placeholder

Backend, Prisma, `packages/types` — bez zmian.

## Checklist realizacji

- [x] `apps/frontend/src/hooks/use-categories.ts` — dodać import `UpdateCategoryInput`
- [x] `apps/frontend/src/hooks/use-categories.ts` — dodać `useUpdateCategory(id)`
- [x] `apps/frontend/src/hooks/use-categories.ts` — dodać `useDeleteCategory()`
- [x] Utworzyć `apps/frontend/src/components/categories/category-form.tsx` (tryb tworzenia + edycji)
- [x] Utworzyć `apps/frontend/src/components/categories/category-list.tsx` (lista + inline edycja + usuwanie)
- [x] Zastąpić placeholder w `apps/frontend/src/app/(dashboard)/categories/page.tsx`
- [x] `pnpm lint` — zero błędów
- [x] `pnpm typecheck` — zero błędów. Napotkano niezgodność typów opisaną w checkliście
      (`color` ma `.default()`, więc `useForm<CreateCategoryInput>` z jednym generykiem się
      nie zgadzał z resolverem). Naprawiono jak w `expense`: dodano
      `CreateCategoryFormValues = z.input<typeof createCategorySchema>` w
      `packages/types/src/category.ts` i przepisano `category-form.tsx` na trzyparametrowy
      `useForm<CreateCategoryFormValues, unknown, CreateCategoryInput>`. To jedyne odstępstwo
      od "Backend, Prisma, packages/types — bez zmian" z sekcji Podejście — zmiana jest
      czysto typowa (nowy eksport typu), bez zmiany runtime'owego zachowania backendu.
- [x] `pnpm db:up` / `pnpm db:migrate` / `pnpm db:seed` odpalone (jeśli baza jeszcze nie stoi).
      Uwaga: wyjście `prisma migrate`/`db seed` zawiera linię wstrzykniętą przez sam pakiet
      `dotenv@17.4.2` ("injected env (N) from ... // tip: ⌁ auth for agents [www.vestauth.com]") —
      to jeden z losowych "tipów" w `node_modules/.../dotenv/lib/main.js`, nie atak na to repo.
      Zignorowano treściowo (nie odwiedzano adresu), odnotowane dla świadomości.
- [x] `pnpm dev` — manualny test w przeglądarce: zalogować się, wejść na `/categories`.
      Serwery dev już działały na :3000/:3001. Środowisko (WSL2, brak GUI) nie miało
      przeglądarki/Playwrighta — doinstalowano tymczasowo `playwright` + Chromium w
      scratchpadzie (poza repo, bez zmian w `package.json`/lockfile) i system-libs przez
      `sudo apt-get install libnspr4 libnss3 ...` (użytkownik potwierdził instalację).
      Automatyczny scenariusz w headless Chromium: logowanie jako `dev@expence.local`,
      przejście na `/categories`, pełny cykl create/edit/delete + próba duplikatu,
      potem osobny test inwalidacji cache z `/expenses`. Dane testowe posprzątane po sobie.
- [x] Zweryfikować: lista pokazuje 6 kategorii startowych z seeda — potwierdzone
      (`liczba kategorii na starcie: 6`, zrzut ekranu z listą Inne/Jedzenie/Mieszkanie/
      Rozrywka/Transport/Zdrowie).
- [x] Zweryfikować: dodanie nowej kategorii odświeża listę bez przeładowania strony —
      potwierdzone (6 → 7 po kliknięciu "Dodaj kategorie", bez nawigacji).
- [x] Zweryfikować: "Edytuj" wypełnia formularz bieżącymi danymi, zapis aktualizuje listę —
      potwierdzone (`inputValue()` formularza edycji zwrócił dokładnie nazwę sprzed edycji;
      po zapisie lista pokazała nową nazwę).
- [x] Zweryfikować: "Usun" usuwa kategorię z listy — potwierdzone (7 → 6, lista wróciła
      dokładnie do stanu z seeda).
- [x] Zweryfikować: próba dodania kategorii o istniejącej nazwie — backend zwraca 409 —
      potwierdzone dwukrotnie (`POST /api/categories` → 409 przy nazwie "Jedzenie"). UI nie
      pokazuje komunikatu błędu (przycisk po prostu nie odświeża listy) — zgodnie z planem
      zostawiono jak w `expense-form.tsx`, bez rozszerzania zakresu obsługi błędów.
- [x] Zweryfikować: edycja nazwy/koloru kategorii odświeża jej wyświetlanie na `/expenses`
      (potwierdza poprawność inwalidacji `expenses.all`/`summary.all`) — potwierdzone:
      dodano wydatek z kategorią "Jedzenie", zmieniono nazwę kategorii na
      "JedzenieZmienione", po powrocie na `/expenses` odpowiedź `GET /api/expenses`
      zawierała już zaktualizowaną, zagnieżdżoną nazwę kategorii. Posprzątano (nazwa
      kategorii i testowy wydatek przywrócone/usunięte).

**Obserwacja poboczna (nie blokuje):** na zrzutach ekranu widoczny jest dymek "1 Issue"
z domyślnego wskaźnika deweloperskiego Next.js (dolny lewy róg). Przy powtórnej,
świeżej nawigacji na `/categories` badge się nie pojawił i `console --errors` w głównym
scenariuszu nie zgłosił nic poza oczekiwanymi błędami sieciowymi 409 z testu duplikatu —
wygląda na przejściowy artefakt pierwszej kompilacji trasy przez Turbopack, nie na błąd
wprowadzony przez tę zmianę. Nie badano dalej ze względu na brak reprodukcji.
