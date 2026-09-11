/**
 * Wiadomosci szyny CQRS. Komenda zmienia stan, zapytanie tylko czyta -
 * obie maja dokladnie jednego handlera (patrz bus.ts).
 */

export type Message<TPayload, TResult> = {
  readonly type: string;
  readonly payload: TPayload;
  /** Nosnik typu wyniku - nigdy nie istnieje w runtime, sluzy tylko inferencji. */
  readonly __result?: TResult;
};

export type MessageFactory<TPayload, TResult> = {
  (payload: TPayload): Message<TPayload, TResult>;
  readonly type: string;
};

/**
 * Tworzy fabryke wiadomosci danego typu; wspolna implementacja komend i zapytan.
 *
 * Nie rzuca wyjatkow.
 *
 * @param type - unikalna nazwa wiadomosci, np. `"transaction.create"`.
 * @returns Funkcja budujaca `{ type, payload }` z tym samym `type` w polu statycznym.
 */
function defineMessage<TPayload, TResult>(type: string): MessageFactory<TPayload, TResult> {
  const factory = (payload: TPayload): Message<TPayload, TResult> => ({ type, payload });
  factory.type = type;
  return factory;
}

/**
 * Komenda: zmienia stan (rejestracja, logowanie, aktualizacja...).
 *
 * Nie rzuca wyjatkow - duplikat nazwy wykrywa dopiero `bus.register`.
 *
 * @param type - unikalna nazwa komendy w formacie `<modul>.<akcja>`.
 * @returns Fabryka komendy z payloadem `TPayload` i wynikiem `TResult` (domyslnie `void`).
 */
export function defineCommand<TPayload, TResult = void>(
  type: string,
): MessageFactory<TPayload, TResult> {
  return defineMessage<TPayload, TResult>(type);
}

/**
 * Zapytanie: wylacznie odczyt, bez efektow ubocznych.
 *
 * Nie rzuca wyjatkow - duplikat nazwy wykrywa dopiero `bus.register`.
 *
 * @param type - unikalna nazwa zapytania w formacie `<modul>.<akcja>`.
 * @returns Fabryka zapytania z payloadem `TPayload` i wynikiem `TResult`.
 */
export function defineQuery<TPayload, TResult>(type: string): MessageFactory<TPayload, TResult> {
  return defineMessage<TPayload, TResult>(type);
}
