---
name: project-scoped-memory
description: Wszystkie wspomnienia o Expence Tracker zapisuj w repo w .claude/memory/, nigdy globalnie ani w ~/.claude
metadata:
  type: feedback
---

Wszystko, co dotyczy projektu Expence Tracker (konwencje, decyzje, preferencje pracy w tym repo), zapisuj wyłącznie w `.claude/memory/` w repo — nigdy w globalnych plikach użytkownika (`~/.claude/CLAUDE.md`, globalne `settings.json`) ani w katalogu pamięci poza repo (`~/.claude/projects/.../memory/`).

**Why:** użytkownik wyraźnie tego zażądał (2026-09-11) — pamięć ma być wersjonowana razem z kodem i nie wyciekać do innych projektów.

**How to apply:** jeden fakt = jeden plik `.claude/memory/<slug>.md` (frontmatter jak w tym pliku), plus jedna linia w `.claude/memory/MEMORY.md`, który `CLAUDE.md` importuje. Przed zapisem sprawdź, czy istniejący plik już nie opisuje tego samego. Reguły obowiązujące cały zespół mogą trafić wprost do `CLAUDE.md`.
