import { createHash } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Stable, non-reversible key for the caller (IP + optional user id). */
export function callerKey(extra?: string): string {
  const headers = getRequest()?.headers;
  const ip =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256")
    .update(`${ip}|${extra ?? ""}`)
    .digest("hex");
}

/**
 * Counts this attempt and throws once the caller exceeded `max` attempts in
 * `windowMinutes`. Backed by the database so it holds across server instances.
 */
export async function enforceRateLimit(
  bucket: string,
  keyHash: string,
  max: number,
  windowMinutes: number,
): Promise<void> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("code_attempts")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("key_hash", keyHash)
    .gte("created_at", since);

  if ((count ?? 0) >= max) {
    throw new Error("יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }
  await supabaseAdmin.from("code_attempts").insert({ bucket, key_hash: keyHash });
}
