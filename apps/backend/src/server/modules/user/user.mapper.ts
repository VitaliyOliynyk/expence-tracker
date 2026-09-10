import type { User } from "@expence/db";
import type { UserDto } from "@expence/types";

/** Swiadomie bez passwordHash - DTO nigdy nie niesie hasla ani jego hasha. */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
  };
}
