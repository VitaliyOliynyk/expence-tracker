---
name: commit
description: Tworzy commit na bieżącym branchu Expence Tracker wg reguł repo — Conventional Commits po polsku, bez diakrytyków, małe spójne commity, nigdy na master. Używaj, gdy użytkownik prosi o commit ("zacommituj", "zrób commit", /commit) albo gdy trzeba napisać lub ocenić wiadomość commita.
argument-hint: "[opcjonalna wskazówka: typ, zakres albo opis]"
allowed-tools:
  - Read
  - Grep
  - Bash(git *)
  - Bash(pnpm *)
model: sonnet
---

# Commit na branchu

Commit robisz **tylko na wyraźną prośbę użytkownika** — wywołanie tego
skilla nią jest, sama skończona zmiana w kodzie nie. Push, PR i merge to
osobne kroki (opisane w "Praca z branchami" w głównym `CLAUDE.md`) i też
wymagają osobnej prośby.

Wskazówka od użytkownika (może być pusta): $ARGUMENTS

## Stan repo w chwili wywołania

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Zmiany (staged + unstaged): !`git diff HEAD --stat`
- Ostatnie commity (wzór stylu): !`git log -8 --format='%h %s'`

## Procedura

1. **Branch.** Jeśli bieżący branch to `master` — nie commituj. Utwórz
   branch wg reguł z głównego `CLAUDE.md` (`<typ>/<opis-kebab-case>`, np.
   `feature/main-page`, `fix/...`, `docs/...`, `chore/...`, `refactor/...`)
   odbity od aktualnego `master`, i dopiero na nim commituj. Gdy nazwa nie
   wynika jasno ze zmiany, zapytaj.
2. **Przejrzyj zmiany.** `git diff` i `git diff --staged` — wiesz, co
   wchodzi do commita, zanim napiszesz wiadomość. Jeśli coś jest już w
   stage, zapytaj, czy commit ma objąć tylko to.
3. **Jedna intencja.** Zmiany niezwiązane z celem brancha nie idą do tego
   commita (ani brancha) — zgłoś je użytkownikowi. Duża zmiana dzieli się na
   kilka małych, spójnych commitów (np. osobno kod i osobno dokumentacja,
   gdy da się je sensownie rozdzielić).
4. **Stage po nazwach plików** (`git add <ścieżki>`), nie `git add -A` /
   `git add .`. Nigdy nie dodawaj: `.env` i innych sekretów,
   `packages/db/src/generated/`, `next-env.d.ts`, `.next/`, `node_modules/`.
5. **Zmiana schematu bazy.** Commit ze zmianą `packages/db/prisma/schema.prisma`
   zawiera też nowy katalog
   `packages/db/prisma/migrations/<timestamp>_<nazwa>/migration.sql`.
   Schemat bez migracji — przerwij i powiedz użytkownikowi.
6. **Weryfikacja.** Przy zmianie kodu (nie samej dokumentacji) uruchom
   `pnpm lint` i `pnpm typecheck` przed commitem. Błędy — zgłoś, nie
   commituj bez zgody.
7. **Commit** przez HEREDOC (patrz niżej), potem `git status` i
   `git log -1` na potwierdzenie. Hook odrzucił commit — napraw przyczynę i
   zrób **nowy** commit; nie używaj `--no-verify` ani `--amend`, chyba że
   użytkownik o to prosi.

## Format wiadomości

Wg [Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/):

```
<typ>[(zakres)][!]: <opis>

<treść — opcjonalna>

<stopki>
```

**Typy:**

| Typ        | Kiedy                                                 |
| ---------- | ----------------------------------------------------- |
| `feat`     | nowa funkcjonalność                                   |
| `fix`      | poprawka błędu                                        |
| `docs`     | tylko dokumentacja (CLAUDE.md, `.claude/docs`, JSDoc) |
| `refactor` | zmiana struktury bez zmiany zachowania                |
| `test`     | testy                                                 |
| `build`    | build, zależności                                     |
| `ci`       | workflowy GitHub Actions                              |
| `chore`    | skrypty, konfiguracja, porządki                       |

**Zakres** (opcjonalny) — moduł, slice albo aplikacja, np. `auth`,
`transactions`, `categories`, `backend`, `frontend`, `db`, `types`.

**Zmiana łamiąca kompatybilność:** `!` po typie/zakresie (`feat!:`,
`feat(auth)!:`) albo stopka `BREAKING CHANGE: <opis>` w treści.

**Linia tytułu:**

- po polsku, **bez znaków diakrytycznych** (jak cała dotychczasowa historia:
  `uzupelnij`, `pol`, `modulu`);
- tryb rozkazujący, mała litera, bez kropki na końcu, do ~72 znaków;
- np. `feat(transactions): dodaj filtr po dacie`,
  `fix(backend): nie cache'uj szyny CQRS na globalThis`.

**Treść** (gdy zmiana nie jest oczywista z tytułu): po polsku, bez
diakrytyków, zawijana do ~72 znaków. Mówi **dlaczego** i co to zmienia dla
zachowania, nie przepisuje diffu. Dla kilku niezależnych punktów — lista z
`- `.

**Stopki:** na końcu stopki atrybucji, jeśli harness je podaje
(`Co-Authored-By: ...`, `Claude-Session: ...`) — dokładnie w tej postaci,
bez wymyślania własnych.

## Wywołanie

```bash
git commit -m "$(cat <<'EOF'
fix(backend): nie cache'uj szyny CQRS na globalThis

Szyna na globalThis przezywala hot reload w dev i trzymala handlery ze
starej wersji kodu, wiec `instanceof` w route handlerze nie rozpoznawal
bledu i POST /api/transactions z cudza kategoria konczyl sie 500.

Co-Authored-By: ...
EOF
)"
```
