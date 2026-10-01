import { randomInt } from "node:crypto";

// No 0/O/1/I/L so codes are easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}
