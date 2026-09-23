---
name: pr
description: Zakłada pull request na GitHubie z bieżącego brancha Expence Tracker — odmawia na `master`, sprawdza warunki z GitHub flow, wypycha branch, jeśli nie ma go na remote, i robi `gh pr create` z podanym tytułem do podanego brancha docelowego (domyślnie `master`). Używaj, gdy użytkownik prosi o PR ("załóż PR", "otwórz pull request", /pr).
argument-hint: '"<tytuł PR>" [branch docelowy=master]'
allowed-tools:
  - Read
  - Grep
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git branch *)
  - Bash(git fetch *)
  - Bash(git rev-list *)
  - Bash(git rev-parse *)
  - Bash(git ls-remote *)
  - Bash(git rebase origin/*)
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

Argumenty od użytkownika (surowo): $ARGUMENTS

- Pierwszy argument (tytuł PR): $0
- Drugi argument (branch docelowy): $1

## Stan repo w chwili wywołania

- Bieżący branch: !`git branch --show-current`
- Status: !`git status --short`

## 1. Bieżący branch nie może być `master`

PR zawsze idzie **z bieżącego brancha** (`--head`). Jeśli bieżący branch
(wyżej) to `master` albo jest pusty (detached HEAD) — **zgłoś błąd i
zakończ**, niczego dalej nie rób (żadnego switcha, pusha, `gh`):

> Błąd: jesteś na `master` — PR musi wyjść z osobnego brancha
> (`git switch -c <typ>/<opis>`, patrz "Praca z branchami" w `CLAUDE.md`).

Nazwa bieżącego brancha niezgodna z `<typ>/<opis-kebab-case>` (typy:
`feature`, `fix`, `refactor`, `docs`, `chore`) — powiedz o tym, ale nie
zmieniaj nazwy bez zgody.

## 2. Rozbierz argumenty

Postać: `/pr "<tytuł PR>" [branch docelowy]`, np.
`/pr "feat(transactions): dodaj filtr po dacie"` albo
`/pr "fix: popraw saldo" release/1.0`.

- **Tytuł** — pierwszy argument (`$0`), bez otaczających cudzysłowów.
- **Branch docelowy** (`--base`) — drugi argument (`$1`); pusty → `master`.
- **Tytuł bez cudzysłowów** (`$0` to tylko pierwsze słowo, np. `feat:`) —
  rozbierz surowe `$ARGUMENTS`: ostatni token jest branchem docelowym
  tylko wtedy, gdy taki branch istnieje na remote
  (`git ls-remote --exit-code --heads origin <token>`); inaczej całość to
  tytuł, a docelowy to `master`.
- **Branch docelowy musi istnieć na remote**
  (`git ls-remote --exit-code --heads origin <docelowy>`) i być różny od
  bieżącego. Inaczej — zgłoś błąd i zakończ.
- **Brak tytułu** — zaproponuj go na podstawie commitów brancha
  (`git log origin/<docelowy>..HEAD --format='%s'`): przy jednym commicie
  jego tytuł, przy kilku — jedno zdanie o całej intencji brancha. Pokaż
  propozycję i poczekaj na akceptację.

Dalej `<branch>` = bieżący branch, `<docelowy>` = branch docelowy.

## 3. Sprawdź tytuł

Tytuł PR ma format commita ze skilla `commit`
(`.claude/skills/commit/SKILL.md`): Conventional Commits, po polsku,
**bez znaków diakrytycznych**, tryb rozkazujący, mała litera, bez kropki,
do ~72 znaków — np. `chore: dodaj skill standup z podsumowaniem pracy`.

Tytuł niezgodny z formatem (brak typu, diakrytyki, kropka, wielka litera)
— zaproponuj poprawioną wersję i zapytaj, której użyć. Typ w tytule
powinien pasować do typu brancha (`feature/` → `feat`, `fix/` → `fix`,
`docs/` → `docs`, `refactor/` → `refactor`, `chore/` → `chore`/`build`/`ci`).

## 4. Sprawdź branch

Każdy punkt, który nie przechodzi, zatrzymuje procedurę — zgłoś go
użytkownikowi, zamiast obchodzić.

1. **Brak otwartego PR-a** z tego brancha:
   `gh pr list --head <branch> --state open --json number,url,baseRefName`.
   Istnieje — podaj jego URL i zakończ (każdy push i tak trafia do tego
   PR-a).
2. **Czyste drzewo robocze.** Niezacommitowane zmiany nie wejdą do PR-a —
   zapytaj, czy najpierw zrobić commit (`/commit`), czy iść dalej bez nich.
3. **Są commity do scalenia:** `git fetch origin`, potem
   `git log origin/<docelowy>..<branch> --format='%h %s'`. Pusto — nie ma
   czego proponować.
4. **Aktualność względem brancha docelowego:**
   `git rev-list --count <branch>..origin/<docelowy>`. Wynik > 0 — branch
   jest w tyle. Zaproponuj `git rebase origin/<docelowy>`; rób go tylko za
   zgodą. Konflikt — zatrzymaj się i pokaż pliki, nie rozwiązuj go na
   ślepo.

## 5. Warunki mergu

Wg "Praca z branchami" w głównym `CLAUDE.md` — sprawdź przed
założeniem PR-a, bo recenzja i tak je zweryfikuje:

- **Zmiana kodu** (cokolwiek poza `*.md`, `.claude/`, `.github/`): uruchom
  `pnpm lint`, `pnpm typecheck` i `pnpm build`. Błąd — zgłoś i nie zakładaj
  PR-a bez zgody użytkownika. Sama dokumentacja/konfiguracja Claude — pomiń
  i napisz o tym w opisie.
- **Schemat bazy:** zmiana `packages/db/prisma/schema.prisma` w
  `git diff origin/<docelowy>...<branch> --stat` bez nowego katalogu w
  `packages/db/prisma/migrations/` — zatrzymaj się.
- **Dokumentacja:** jeśli branch zmienia to, co opisuje któryś `CLAUDE.md`
  ("Stan repozytorium", "Czego jeszcze nie ma", mapa dokumentacji), a diff
  go nie dotyka — zwróć uwagę użytkownikowi.

## 6. Branch na remote

`gh pr create` potrzebuje brancha na `origin` z aktualnymi commitami.

1. **Czy branch jest na remote:**
   `git ls-remote --exit-code --heads origin <branch>`.
   - Kod wyjścia 2 (brak) — **wypchnij**: `git push -u origin <branch>`.
   - Jest — porównaj: `git rev-list --count origin/<branch>..<branch>`
     (lokalne commity, których nie ma na remote). Wynik > 0 — wypchnij
     `git push -u origin <branch>`. Wynik 0 — push niepotrzebny.
2. **Push odrzucony** (branch przeszedł rebase po wcześniejszym pushu) —
   `git push --force-with-lease origin <branch>`, **tylko** dla własnego
   brancha, nigdy `master`.
3. Po pushu sprawdź ponownie punkt 1 — branch musi być na remote, zanim
   pójdziesz dalej.

## 7. Założenie PR-a

1. **Opis** — z commitów i diffu całego brancha
   (`git diff origin/<docelowy>...<branch>`), nie tylko ostatniego
   commita. Po polsku, w stylu dotychczasowych PR-ów (bez diakrytyków,
   jak tytuł):

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

2. **Założenie** przez `gh`, tytuł = pierwszy argument, base = drugi
   argument (domyślnie `master`), opis przez HEREDOC:

   ```bash
   gh pr create --base <docelowy> --head <branch> --title "<tytuł>" \
     --body "$(cat <<'EOF'
   ## Podsumowanie
   ...
   EOF
   )"
   ```

## 8. Raport

Podaj użytkownikowi URL PR-a (z wyniku `gh pr create`) i branch docelowy,
a jednym zdaniem przypomnij, że workflow `claude-code-review.yml` właśnie
ruszył z recenzją, a merge (`gh pr merge <nr> --merge --delete-branch`)
zrobisz na osobną prośbę.
