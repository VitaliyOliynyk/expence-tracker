import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt z modulu node:crypto - bez dodatkowej zaleznosci na bcrypt/argon2.
// Format zapisu w kolumnie User.passwordHash:  scrypt$<salt-hex>$<hash-hex>
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;

  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  // timingSafeEqual zamiast === : porownanie w stalym czasie.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Staly hash do porownania "na pusto", gdy uzytkownik o podanym e-mailu nie istnieje.
 * Bez tego czas odpowiedzi login() zdradzalby, ktore adresy sa zarejestrowane
 * (brak uzytkownika = natychmiastowy return, istniejacy = pelny koszt scrypt).
 * Haslo pod tym hashem nigdy nie zostanie sprawdzone poprawnie - to celowe.
 */
export const DUMMY_PASSWORD_HASH =
  "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
