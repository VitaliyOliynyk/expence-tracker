import type { Message, MessageFactory } from "./message";

/** Funkcja obslugujaca jeden typ wiadomosci; moze byc synchroniczna albo async. */
export type Handler<TPayload, TResult> = (payload: TPayload) => Promise<TResult> | TResult;

/** Sygnatura, ktora przyjmuja serwisy zamiast importowac singleton z index.ts. */
export type Dispatch = <TPayload, TResult>(message: Message<TPayload, TResult>) => Promise<TResult>;

export type Bus = {
  /**
   * Rejestruje handler dla typu wiadomosci wskazanego przez fabryke.
   *
   * @param factory - fabryka z `defineCommand`/`defineQuery`; jej `type` jest kluczem.
   * @param handler - funkcja obslugujaca payload tej wiadomosci.
   * @returns Nic.
   * @throws {Error} gdy dla `factory.type` jest juz zarejestrowany handler.
   */
  register<TPayload, TResult>(
    factory: MessageFactory<TPayload, TResult>,
    handler: Handler<TPayload, TResult>,
  ): void;
  /**
   * Wysyla wiadomosc do jej jedynego handlera.
   *
   * @param message - wiadomosc utworzona fabryka, np. `GetTransactionQuery({ userId, id })`.
   * @returns Wynik handlera (zawsze jako Promise).
   * @throws {Error} gdy dla `message.type` nie ma zarejestrowanego handlera.
   * @throws Kazdy blad rzucony przez handler - szyna przepuszcza go bez zmian.
   */
  dispatch: Dispatch;
};

/**
 * Szyna komend/zapytan. Kazdy typ wiadomosci ma dokladnie jednego handlera -
 * druga rejestracja tego samego typu jest bledem konfiguracji, nie runtime'u.
 *
 * Nie rzuca wyjatkow; bledy zglaszaja dopiero `register` i `dispatch` zwroconej szyny.
 *
 * @returns Nowa, pusta szyna bez zarejestrowanych handlerow.
 */
export function createBus(): Bus {
  const handlers = new Map<string, Handler<unknown, unknown>>();

  return {
    register(factory, handler) {
      if (handlers.has(factory.type)) {
        throw new Error(`Handler dla "${factory.type}" jest juz zarejestrowany`);
      }
      handlers.set(factory.type, handler as Handler<unknown, unknown>);
    },

    async dispatch(message) {
      const handler = handlers.get(message.type);
      if (!handler) {
        throw new Error(`Brak handlera dla ${message.type}`);
      }
      return (await handler(message.payload)) as never;
    },
  };
}
