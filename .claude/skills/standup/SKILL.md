---
name: standup
description: Raport na daily standup — krótkie podsumowanie pracy z poprzedniego dnia w repo Expence Tracker. Wywoływany wyłącznie ręcznie przez /standup.
argument-hint: "[data RRRR-MM-DD albo liczba dni wstecz; domyślnie wczoraj]"
disable-model-invocation: true
allowed-tools:
  - Bash(date *)
  - Bash(git config *)
  - Bash(git log *)
  - Bash(git branch *)
  - Bash(gh pr list *)
model: sonnet
---

# Raport na standup

Skill tylko **czyta** historię repo — niczego nie commituje, nie przełącza
branchy i nie zmienia plików.

Argument od użytkownika (może być pusty): $ARGUMENTS

## Kontekst w chwili wywołania

- Dziś: !`date '+%F (%A)'`
- Autor (git): !`git config user.name`

## Procedura

1. **Zakres dat.** Jeden dzień kalendarzowy, od `00:00` do `00:00`
   następnego dnia. Brak argumentu — wczoraj; `RRRR-MM-DD` — ten dzień;
   liczba `N` — dzień sprzed `N` dni. Daty wylicz przez `date`, np.
   `date -d yesterday +%F`, `date -d '2026-09-12 +1 day' +%F`.
2. **Praca z tego dnia** — ze wszystkich branchy (`--branches --remotes`,
   nie `--all`, bo łapie stash), tylko commity autora z "Autor (git)":

   ```bash
   git log --branches --remotes --no-merges \
     --since="DZIEN 00:00" --until="DZIEN+1 00:00" --format='%s'
   ```

3. **Pusty dzień.** Bez argumentu cofaj się dzień po dniu (maks. 7 dni) do
   ostatniego dnia z pracą i napisz w nagłówku, za jaki dzień jest raport.
   Z argumentem albo po 7 pustych dniach — powiedz to i zakończ.
4. **Status.** Scalone do `master` tego dnia
   (`git log master --merges --since=... --until=... --format='%s'`,
   ewentualnie `gh pr list --state merged --search "merged:DZIEN"`) albo
   w toku, jeśli branch nie jest scalony.

## Format raportu

Sam raport, bez wstępu, bez listy commitów, hashy, plików i statystyk.
Po polsku, z polskimi znakami.

```
**Standup — <dzień tygodnia> <RRRR-MM-DD>**

- <co zostało zrobione, jedno zdanie> — scalone
- <...> — w toku
```

- Grupuj po temacie: kilka commitów do jednej rzeczy to jeden punkt.
- Język rezultatu ("dodałem filtr transakcji po dacie"), nie gitowy żargon
  (`feat(transactions): ...`).
- 2–5 punktów; drobiazgi pomiń albo zbierz w "drobne porządki".
