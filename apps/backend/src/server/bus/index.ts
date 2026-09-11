import { createBus } from "./bus";
import type { Bus, Dispatch } from "./bus";
import { registerUserHandlers } from "../modules/user/user.handlers";
import { registerAuthHandlers } from "../modules/auth/auth.handlers";
import { registerTransactionHandlers } from "../modules/transaction/transaction.handlers";

/**
 * Jedyne miejsce, ktore zna komplet handlerow wszystkich modulow.
 * Nowy modul dopisuje tu swoj `register*Handlers(bus)`.
 *
 * @returns Szyna z zarejestrowanymi handlerami modulow user, auth i transaction.
 * @throws {Error} gdy dwa moduly zarejestruja handler dla tego samego typu wiadomosci.
 */
function createAppBus(): Bus {
  const bus = createBus();
  registerUserHandlers(bus);
  registerAuthHandlers(bus);
  registerTransactionHandlers(bus);
  return bus;
}

// Szyna celowo NIE jest cache'owana na globalThis (w przeciwienstwie do `prisma`).
// Hot reload w dev wykonuje ten modul ponownie po zmianie dowolnego pliku modulow;
// szyna z globalThis trzymalaby wtedy handlery - a przez nie serwisy i klasy bledow -
// ze starej wersji kodu. `instanceof` w route handlerze porownywalby z nowa klasa i nie
// rozpoznawal bledu (TransactionCategoryNotFoundError konczyl sie 500 zamiast 400).
// Podwojnej rejestracji nie ma: `createAppBus` za kazdym razem zaczyna od pustej szyny.
// Prisma zostaje na globalThis, bo tam cache chroni pule polaczen, a nie kod.

/** Singleton szyny aplikacji; w dev odtwarzany z aktualnym kodem po kazdym hot reloadzie. */
export const bus: Bus = createAppBus();

/**
 * Wysyla wiadomosc na szyne aplikacji - punkt wejscia dla route handlerow.
 * Serwisy modulow dostaja `dispatch` jako argument, nie importuja go stad.
 *
 * @param message - wiadomosc utworzona fabryka z `*.messages.ts` modulu.
 * @returns Wynik handlera wiadomosci.
 * @throws {Error} gdy dla typu wiadomosci nie ma handlera.
 * @throws Kazdy blad handlera, np. `TransactionCategoryNotFoundError` albo blad Prismy.
 */
export const dispatch: Dispatch = bus.dispatch;

export type { Dispatch, Bus } from "./bus";
export * from "./message";
