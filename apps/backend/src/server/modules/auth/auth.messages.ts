import { defineCommand } from "../../bus/message";
import type { AuthResponse, LoginInput, RegisterInput } from "@expence/types";

/** Jedyny plik modulu auth importowany z zewnatrz (route handlery). */

export const RegisterCommand = defineCommand<RegisterInput, AuthResponse>("auth.register");

// Login jest komenda, mimo ze "czyta" - aktualizuje lastLoginAt, wiec zmienia stan.
export const LoginCommand = defineCommand<LoginInput, AuthResponse>("auth.login");
