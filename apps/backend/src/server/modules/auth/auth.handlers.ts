import type { Bus, Dispatch } from "../../bus/bus";
import { RegisterCommand, LoginCommand } from "./auth.messages";
import { register, login } from "./auth.service";

/** Cienki adapter: wiaze wiadomosci szyny z serwisem modulu autoryzacji. */
export function registerAuthHandlers(bus: Bus): void {
  const dispatch: Dispatch = bus.dispatch;

  bus.register(RegisterCommand, (payload) => register(dispatch, payload));
  bus.register(LoginCommand, (payload) => login(dispatch, payload));
}
