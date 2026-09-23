---
name: pr
description: Zakłada pull request na GitHubie dla brancha Expence Tracker — sprawdza warunki z GitHub flow, wypycha branch i robi `gh pr create --base master` z podanym tytułem. Używaj, gdy użytkownik prosi o PR ("załóż PR", "otwórz pull request", /pr).
argument-hint: "<tytuł PR> <branch>"
allowed-tools:
  - Read
  - Grep
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git branch *)
  - Bash(git switch *)
  - Bash(git fetch *)
  - Bash(git rev-list *)
  - Bash(git rev-parse *)
  - Bash(git ls-remote *)
  - Bash(git rebase origin/master)
  - Bash(git push -u origin *)
  - Bash(git push --force-with-lease *)
  - Bash(gh pr list *)
  - Bash(gh pr view *)
  - Bash(gh pr create *)
  - Bash(pnpm lint)
  - Bash(pnpm typecheck)
  - Bash(pnpm build)
model: sonnet
---

# Pull request na GitHubie

PR zakładasz **tylko na wyraźną prośbę użytkownika** — wywołanie tego
skilla nią jest. Merge to osobny krok (`gh pr merge <nr> --merge
--delete-branch`, patrz "Praca z branchami" w głównym `CLAUDE.md`) i
wymaga osobnej prośby — ten skill go nie robi.

Argumenty od użytkownika: $ARGUMENTS

## Stan repo w chwili wywołania

- Bieżący branch: !`git branch --show-current`
- Status: !`git status --short`
- Lokalne branche: !`git branch --format='%(refname:short)'`

## 1. Rozbierz argumenty

Oczekiwana postać: `<tytuł PR> <branch>`, np.
`/pr feat(transactions): dodaj filtr po dacie feature/date-filter`.

- **Branch** to token bez spacji w postaci `<typ>/<opis>`, gdzie typ to
  `feature`, `fix`, `refactor`, `docs` albo `chore` — zwykle ostatni.
  Przyjmij go także, gdy użytkownik podał go jako pierwszy.
- **Tytuł** to cała reszta, bez otaczających cudzysłowów.
- **Brak brancha** — weź bieżący, o ile nie jest to `master`.
- **Brak tytułu** — zaproponuj go na podstawie commitów brancha
  (`git log origin/master..<branch> --format='%s'`): przy jednym commicie
  jego tytuł, przy kilku — jedno zdanie o całej intencji brancha. Pokaż
  propozycję i poczekaj na akceptację.

## 2. Sprawdź tytuł

Tytuł PR ma format commita ze skilla `commit`
(`.claude/skills/commit/SKILL.md`): Conventional Commits, po polsku,
**bez znaków diakrytycznych**, tryb rozkazujący, mała litera, bez kropki,
do ~72 znaków — np. `chore: dodaj skill standup z podsumowaniem pracy`.

Tytuł niezgodny z formatem (brak typu, diakrytyki, kropka, wielka litera)
— zaproponuj poprawioną wersję i zapytaj, której użyć. Typ w tytule
powinien pasować do typu brancha (`feature/` → `feat`, `fix/` → `fix`,
`docs/` → `docs`, `refactor/` → `refactor`, `chore/` → `chore`/`build`/`ci`).

## 3. Sprawdź branch

Każdy punkt, który nie przechodzi, zatrzymuje procedurę — zgłoś go
użytkownikowi, zamiast obchodzić.

1. **Nie `master`.** PR z `master` do `master` nie ma sensu, a na `master`
   nie powinno być własnych commitów.
2. **Branch istnieje lokalnie** (`git rev-parse --verify <branch>`). Nazwa
   niezgodna z `<typ>/<opis-kebab-case>` — powiedz o tym, ale nie zmieniaj
   nazwy bez zgody.
3. **Brak otwartego PR-a** z tego brancha:
   `gh pr list --head <branch> --state open --json number,url`. Istnieje —
   podaj jego URL i zakończ (każdy push i tak trafia do tego PR-a).
4. **Czyste drzewo robocze.** Niezacommitowane zmiany nie wejdą do PR-a —
   zapytaj, czy najpierw zrobić commit (`/commit`), czy iść dalej bez nich.
5. **Przełącz się** na branch (`git switch <branch>`), jeśli nie jest
   bieżący — weryfikacja niżej działa na drzewie roboczym.
6. **Są commity do scalenia:** `git fetch origin`, potem
   `git log origin/master..<branch> --format='%h %s'`. Pusto — nie ma czego
   proponować.
7. **Aktualność względem `master`:**
   `git rev-list --count <branch>..origin/master`. Wynik > 0 — branch jest
   w tyle. Zaproponuj `git rebase origin/master`; rób go tylko za zgodą.
   Konflikt — zatrzymaj się i pokaż pliki, nie rozwiązuj go na ślepo.

## 4. Warunki mergu

Wg "Praca z branchami" w głównym `CLAUDE.md` — sprawdź przed
założeniem PR-a, bo recenzja i tak je zweryfikuje:

- **Zmiana kodu** (cokolwiek poza `*.md`, `.claude/`, `.github/`): uruchom
  `pnpm lint`, `pnpm typecheck` i `pnpm build`. Błąd — zgłoś i nie zakładaj
  PR-a bez zgody użytkownika. Sama dokumentacja/konfiguracja Claude — pomiń
  i napisz o tym w opisie.
- **Schemat bazy:** zmiana `packages/db/prisma/schema.prisma` w
  `git diff origin/master...<branch> --stat` bez nowego katalogu w
  `packages/db/prisma/migrations/` — zatrzymaj się.
- **Dokumentacja:** jeśli branch zmienia to, co opisuje któryś `CLAUDE.md`
  ("Stan repozytorium", "Czego jeszcze nie ma", mapa dokumentacji), a diff
  go nie dotyka — zwróć uwagę użytkownikowi.

## 5. Push i PR

1. **Push:** `git push -u origin <branch>`. Jeśli branch był już wypchnięty
   i przeszedł rebase, push zostanie odrzucony — wtedy
   `git push --force-with-lease origin <branch>`, **tylko** dla własnego
   brancha, nigdy `master`.
2. **Opis** — z commitów i diffu całego brancha
   (`git diff origin/master...<branch>`), nie tylko ostatniego commita. Po
   polsku, w stylu dotychczasowych PR-ów (bez diakrytyków, jak tytuł):

   ```markdown
   ## Podsumowanie

   - <co się zmienia i dlaczego — 1–4 punkty>

   ## Jak przetestowano

   - <`pnpm lint`, `pnpm typecheck`, `pnpm build`, curl, przeglądarka —
     tylko to, co faktycznie uruchomiono; sama dokumentacja: "Zmiana tylko
     w dokumentacji — bez kodu aplikacji.">

   <stopka atrybucji>
   ```

   Przy dużej zmianie dodaj sekcje "Co sie zmienia" (po obszarach:
   backend, kontrakt, frontend, dokumentacja) i "Poza zakresem". Zmiana
   łamiąca kontrakt API — wyróżnij ją `⚠️` na początku punktu.
   Na końcu stopka atrybucji PR-a, jeśli harness ją podaje — dokładnie w
   tej postaci, bez wymyślania własnej.

3. **Założenie** przez HEREDOC:

   ```bash
   gh pr create --base master --head <branch> --title "<tytuł>" \
     --body "$(cat <<'EOF'
   ## Podsumowanie
   ...
   EOF
   )"
   ```

## 6. Raport

Podaj użytkownikowi URL PR-a (z wyniku `gh pr create`) i jednym zdaniem
przypomnij, że workflow `claude-code-review.yml` właśnie ruszył z
recenzją, a merge (`gh pr merge <nr> --merge --delete-branch`) zrobisz na
osobną prośbę.
