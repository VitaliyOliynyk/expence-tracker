import { signAccessToken } from "@expence/auth";
import type { AuthResponse, LoginInput, RegisterInput } from "@expence/types";
import type { Dispatch } from "../../bus/bus";
import {
  RegisterUserCommand,
  TouchUserLoginCommand,
  VerifyUserCredentialsQuery,
  GetUserByIdQuery,
} from "../user/user.messages";
import { InactiveAccountError, InvalidCredentialsError } from "./auth.errors";

/**
 * Funkcje przyjmuja `dispatch` argumentem zamiast importowac singleton z bus/index.ts -
 * bus/index.ts importuje auth.handlers.ts, ktory importuje ten plik; import w druga
 * strone zamknalby cykl. Dodatkowo pozwala to testowac serwis z atrapa dispatch.
 */

export async function register(dispatch: Dispatch, input: RegisterInput): Promise<AuthResponse> {
  const user = await dispatch(RegisterUserCommand(input));
  const { token, expiresAt } = await signAccessToken(user.id);
  return { user, token, expiresAt };
}

export async function login(dispatch: Dispatch, input: LoginInput): Promise<AuthResponse> {
  const verdict = await dispatch(VerifyUserCredentialsQuery(input));
  if (!verdict) throw new InvalidCredentialsError();
  if (!verdict.isActive) throw new InactiveAccountError();

  await dispatch(TouchUserLoginCommand({ userId: verdict.userId }));
  const user = await dispatch(GetUserByIdQuery({ userId: verdict.userId }));
  // Nie powinno sie zdarzyc - verifyCredentials przed chwila potwierdzil istnienie konta.
  if (!user) throw new InvalidCredentialsError();

  const { token, expiresAt } = await signAccessToken(verdict.userId);
  return { user, token, expiresAt };
}
