import type { Bus } from "../../bus/bus";
import {
  RegisterUserCommand,
  TouchUserLoginCommand,
  VerifyUserCredentialsQuery,
  GetUserByIdQuery,
} from "./user.messages";
import { registerUser, verifyCredentials, getUserById, markLogin } from "./user.service";

/** Cienki adapter: wiaze wiadomosci szyny z serwisem modulu uzytkownika. */
export function registerUserHandlers(bus: Bus): void {
  bus.register(RegisterUserCommand, (payload) => registerUser(payload));
  bus.register(TouchUserLoginCommand, (payload) => markLogin(payload.userId));
  bus.register(VerifyUserCredentialsQuery, (payload) => verifyCredentials(payload));
  bus.register(GetUserByIdQuery, (payload) => getUserById(payload.userId));
}
