import type { EducationMethod } from "./types";
import { tracksMethod } from "./tracks";
import { classicMethod } from "./classic";
import { pocketMoneyMethod } from "./pocket_money";

/**
 * The single place that knows which education methods exist.
 * Adding a method = one folder + one line here + one row in `education_methods`.
 */
const methods: EducationMethod[] = [tracksMethod, classicMethod, pocketMoneyMethod];

const byId = new Map(methods.map((m) => [m.id, m]));

export function listMethods(): EducationMethod[] {
  return methods;
}

export function getMethod(id: string): EducationMethod | undefined {
  return byId.get(id);
}

export function requireMethod(id: string): EducationMethod {
  const method = byId.get(id);
  if (!method) throw new Error(`Unknown education method: ${id}`);
  return method;
}

export type { EducationMethod };
