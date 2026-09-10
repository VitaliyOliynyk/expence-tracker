import type { Message, MessageFactory } from "./message";

export type Handler<TPayload, TResult> = (payload: TPayload) => Promise<TResult> | TResult;

/** Sygnatura, ktora przyjmuja serwisy zamiast importowac singleton z index.ts. */
export type Dispatch = <TPayload, TResult>(message: Message<TPayload, TResult>) => Promise<TResult>;

export type Bus = {
  register<TPayload, TResult>(
    factory: MessageFactory<TPayload, TResult>,
    handler: Handler<TPayload, TResult>,
  ): void;
  dispatch: Dispatch;
};

/**
 * Szyna komend/zapytan. Kazdy typ wiadomosci ma dokladnie jednego handlera -
 * druga rejestracja tego samego typu jest bledem konfiguracji, nie runtime'u.
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
