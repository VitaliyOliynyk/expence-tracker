/**
 * Konwersje miedzy <input type="date"> (YYYY-MM-DD w strefie uzytkownika)
 * a datami ISO z API. Transakcje z samym dniem zapisujemy jako poludnie czasu
 * lokalnego - przesuniecie strefy nie przerzuci jej wtedy na sasiedni dzien.
 */

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Date -> "YYYY-MM-DD" w strefie lokalnej. */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateInput(): string {
  return toDateInput(new Date());
}

/** "YYYY-MM-DD" -> ISO (poludnie lokalne); pusty string dla niepoprawnej daty. */
export function dateInputToIso(value: string): string {
  const date = parseDateInput(value);
  if (!date) return "";
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

/** ISO -> "YYYY-MM-DD" w strefie lokalnej; pusty string dla niepoprawnej daty. */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : toDateInput(date);
}

/** Poczatek dnia lokalnego jako ISO - dolna granica filtra dat. */
export function startOfDayIso(value: string | undefined): string | undefined {
  const date = value ? parseDateInput(value) : null;
  return date ? date.toISOString() : undefined;
}

/** Koniec dnia lokalnego jako ISO - gorna granica filtra dat (wlacznie). */
export function endOfDayIso(value: string | undefined): string | undefined {
  const date = value ? parseDateInput(value) : null;
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

const DATE_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
