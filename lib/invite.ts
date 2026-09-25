import { randomBytes } from "crypto";

/** The one family invite code. Do not generate a replacement. */
export const CANONICAL_INVITE_CODE = "259UXGXU";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8) {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}
