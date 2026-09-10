import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@expence/auth";
import type { RegisterInput, UserDto } from "@expence/types";
import * as userRepository from "./user.repository";
import { toUserDto } from "./user.mapper";
import { EmailTakenError } from "./user.errors";

export async function registerUser(input: RegisterInput): Promise<UserDto> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return toUserDto(user);
  } catch (error) {
    // @@unique na email (User.email) - powtorzona rejestracja tego samego adresu.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new EmailTakenError(input.email);
    }
    throw error;
  }
}

export async function verifyCredentials(input: {
  email: string;
  password: string;
}): Promise<{ userId: string; isActive: boolean } | null> {
  const user = await userRepository.findByEmail(input.email);

  // Gdy uzytkownika nie ma, i tak liczymy scrypt przeciw DUMMY_PASSWORD_HASH -
  // inaczej roznica czasu odpowiedzi zdradzalaby, ktore e-maile sa zarejestrowane.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !valid) return null;

  return { userId: user.id, isActive: user.isActive };
}

export async function getUserById(id: string): Promise<UserDto | null> {
  const user = await userRepository.findById(id);
  return user ? toUserDto(user) : null;
}

export async function markLogin(id: string): Promise<void> {
  await userRepository.touchLastLogin(id);
}
