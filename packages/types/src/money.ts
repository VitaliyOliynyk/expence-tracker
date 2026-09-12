import { z } from "zod";

/**
 * Kwoty trzymamy w calym repo jako liczby calkowite groszy (`amountCents`).
 * Float na pieniadzach kumuluje bledy zaokraglen przy sumowaniu - tego unikamy.
 * Konwersja na jednostki glowne (PLN) nastepuje wylacznie na granicy UI.
 */
export const CURRENCIES = ["PLN", "EUR", "USD", "GBP"] as const;
export const currencySchema = z
  .enum(CURRENCIES)
  .meta({ description: "Kod waluty (ISO 4217)", example: "PLN" });
export type Currency = z.infer<typeof currencySchema>;

export const DEFAULT_CURRENCY: Currency = "PLN";

/** Wartosc w groszach - to leci przez API i siedzi w bazie. */
export const amountCentsSchema = z
  .int()
  .positive("Kwota musi byc wieksza od zera")
  .max(1_000_000_000, "Kwota poza dopuszczalnym zakresem")
  .meta({ description: "Kwota w groszach (liczba calkowita > 0)", example: 12750 });

/**
 * Wejscie z formularza: uzytkownik wpisuje "12,50" albo 12.5, my zapisujemy 1250.
 * Akceptuje przecinek jako separator dziesietny (uklad PL).
 */
export const amountInputSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
    const parsed = typeof normalized === "string" ? Number(normalized) : normalized;

    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: "Nieprawidlowa kwota" });
      return z.NEVER;
    }
    return Math.round(parsed * 100);
  })
  .pipe(amountCentsSchema)
  .meta({
    description:
      'Kwota w zlotych: liczba (`12.5`) albo tekst z przecinkiem lub kropka (`"12,50"`); ' +
      "zapisywana w groszach, wynik > 0 i <= 1 000 000 000 groszy",
    example: "127,50",
  });

export function centsToUnits(cents: number): number {
  return cents / 100;
}

export function formatAmount(
  cents: number,
  currency: Currency = DEFAULT_CURRENCY,
  locale = "pl-PL",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(centsToUnits(cents));
}
