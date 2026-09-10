import { createBus } from "./bus";
import type { Bus, Dispatch } from "./bus";
import { registerUserHandlers } from "../modules/user/user.handlers";
import { registerAuthHandlers } from "../modules/auth/auth.handlers";
import { registerTransactionHandlers } from "../modules/transaction/transaction.handlers";

/**
 * Jedyne miejsce, ktore zna komplet handlerow wszystkich modulow.
 * Nowy modul dopisuje tu swoj `register*Handlers(bus)`.
 */
function createAppBus(): Bus {
  const bus = createBus();
  registerUserHandlers(bus);
  registerAuthHandlers(bus);
  registerTransactionHandlers(bus);
  return bus;
}

// Hot reload w Next.js przeladowuje moduly przy kazdej zmianie pliku - bez cache'a
// na globalThis kazde przeladowanie probowaloby zarejestrowac handlery po raz drugi.
// Ten sam zabieg co dla `prisma` w packages/db/src/index.ts.
const globalForBus = globalThis as unknown as { bus?: Bus };

export const bus: Bus = globalForBus.bus ?? createAppBus();

if (process.env.NODE_ENV !== "production") {
  globalForBus.bus = bus;
}

export const dispatch: Dispatch = bus.dispatch;

export type { Dispatch, Bus } from "./bus";
export * from "./message";
