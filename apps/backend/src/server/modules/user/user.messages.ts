import { defineCommand, defineQuery } from "../../bus/message";
import type { RegisterInput, UserDto } from "@expence/types";

/**
 * Jedyny plik modulu user importowany z zewnatrz. Reszta modulu
 * (repository, service, mapper, errors) jest jego szczegolem implementacyjnym.
 */

export const RegisterUserCommand = defineCommand<RegisterInput, UserDto>("user.register");

export const TouchUserLoginCommand = defineCommand<{ userId: string }>("user.touchLogin");

/**
 * Zapytanie, nie komenda - weryfikacja hasla niczego nie zmienia.
 * Zwraca wylacznie werdykt, nigdy passwordHash - ten nie przekracza granicy modulu.
 */
export const VerifyUserCredentialsQuery = defineQuery<
  { email: string; password: string },
  { userId: string; isActive: boolean } | null
>("user.verifyCredentials");

export const GetUserByIdQuery = defineQuery<{ userId: string }, UserDto | null>("user.getById");
