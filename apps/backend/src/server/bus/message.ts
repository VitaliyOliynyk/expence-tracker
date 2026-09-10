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

function defineMessage<TPayload, TResult>(type: string): MessageFactory<TPayload, TResult> {
  const factory = (payload: TPayload): Message<TPayload, TResult> => ({ type, payload });
  factory.type = type;
  return factory;
}

/** Komenda: zmienia stan (rejestracja, logowanie, aktualizacja...). */
export function defineCommand<TPayload, TResult = void>(
  type: string,
): MessageFactory<TPayload, TResult> {
  return defineMessage<TPayload, TResult>(type);
}

/** Zapytanie: wylacznie odczyt, bez efektow ubocznych. */
export function defineQuery<TPayload, TResult>(type: string): MessageFactory<TPayload, TResult> {
  return defineMessage<TPayload, TResult>(type);
}
