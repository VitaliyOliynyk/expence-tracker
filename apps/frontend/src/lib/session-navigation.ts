/**
 * Twarda nawigacja przy zmianie tozsamosci w karcie (logowanie, rejestracja,
 * wylogowanie). Token API (api-client.ts) i cache TanStack Query zyja w pamieci
 * karty - nawigacja klienta (router, redirect() z Server Action) zostawilaby je
 * kolejnemu uzytkownikowi: widzialby cudze dane, a jego zapisy trafialyby na
 * poprzednie konto. Pelne przeladowanie czysci oba.
 */
export function navigateWithFreshSession(path: string): void {
  window.location.assign(path);
}
