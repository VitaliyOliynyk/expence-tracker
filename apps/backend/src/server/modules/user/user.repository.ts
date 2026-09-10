import { prisma } from "@expence/db";
import type { User } from "@expence/db";

/** Jedyne miejsce w backendzie dotykajace prisma.user. */

export function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function create(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
    },
  });
}

export function touchLastLogin(id: string): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}
