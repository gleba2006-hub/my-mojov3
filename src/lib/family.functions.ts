import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LINK_CODE_MINUTES = 15;
const INVITE_CODE_HOURS = 48;
const GENERIC_CODE_ERROR = "הקוד לא תקין או שפג תוקפו";

export type MyContext = {
  role: "admin" | "parent" | "child" | null;
  family: { id: string; name: string; approved: boolean } | null;
  childId: string | null;
};

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyContext> => {
    const { supabase, userId } = context;
    const [{ data: roles }, { data: members }, { data: child }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("family_members").select("family_id, approved").eq("user_id", userId),
      supabase.from("child_profiles").select("id, family_id").eq("user_id", userId).maybeSingle(),
    ]);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const role = roleSet.has("admin") ? "admin" : roleSet.has("parent") ? "parent" : roleSet.has("child") ? "child" : null;
    const member = (members ?? []).find((m) => m.approved) ?? (members ?? [])[0];
    const familyId = member?.family_id ?? child?.family_id ?? null;
    let family: MyContext["family"] = null;
    if (familyId && (member?.approved || child)) {
      const { data } = await supabase.from("families").select("id, name").eq("id", familyId).maybeSingle();
      if (data) family = { id: data.id, name: data.name, approved: true };
    } else if (member && !member.approved) {
      family = { id: member.family_id, name: "", approved: false };
    }
    return { role, family, childId: child?.id ?? null };
  });

export const createFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().min(2).max(60) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    const { data: existing } = await supabaseAdmin.from("family_members").select("id").eq("user_id", userId).limit(1);
    if (existing && existing.length > 0) throw new Error("כבר קיימת משפחה לחשבון הזה");
    const { data: asChild } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", userId).eq("role", "child").limit(1);
    if (asChild && asChild.length > 0) throw new Error("חשבון ילד לא יכול ליצור משפחה");
    const { data: family, error } = await supabaseAdmin.from("families").insert({ name: data.name, created_by: userId }).select("id").single();
    if (error || !family) throw new Error("לא הצלחנו ליצור את המשפחה");
    const { error: memberError } = await supabaseAdmin.from("family_members").insert({ family_id: family.id, user_id: userId, role: "parent", approved: true });
    if (memberError) {
      await supabaseAdmin.from("families").delete().eq("id", family.id);
      throw new Error("לא הצלחנו ליצור את המשפחה");
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "parent" }, { onConflict: "user_id,role" });
    return { familyId: family.id };
  });

async function assertParent(
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>,
  userId: string,
  familyId: string,
) {
  const { data } = await supabase.from("family_members").select("id").eq("user_id", userId).eq("family_id", familyId).eq("role", "parent").eq("approved", true).maybeSingle();
  if (!data) throw new Error("אין הרשאה");
}

export const listChildren = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("child_profiles").select("id, name, gender, birth_year, user_id").order("created_at", { ascending: true });
    if (error) throw new Error("לא הצלחנו לטעון את הילדים");
    return (data ?? []).map((c) => ({ id: c.id, name: c.name, gender: c.gender, birthYear: c.birth_year, connected: c.user_id !== null }));
  });

export const addChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ familyId: z.string().uuid(), name: z.string().trim().min(1).max(40), gender: z.enum(["girl", "boy"]), birthYear: z.number().int().min(2008).max(2026) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertParent(supabase, userId, data.familyId);
    const { data: child, error } = await supabase.from("child_profiles").insert({ family_id: data.familyId, name: data.name, gender: data.gender, birth_year: data.birthYear }).select("id").single();
    if (error || !child) throw new Error("לא הצלחנו להוסיף את הילד");
    return { childId: child.id };
  });

/** New 6-character code (15 min). Any older unused code for the child is removed. */
export const createLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ childId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generateCode } = await import("@/lib/codes.server");
    const { data: child } = await supabase.from("child_profiles").select("id, family_id").eq("id", data.childId).maybeSingle();
    if (!child) throw new Error("אין הרשאה");
    await assertParent(supabase, userId, child.family_id);
    await supabase.from("link_codes").delete().eq("child_id", child.id).is("used_at", null);
    const expiresAt = new Date(Date.now() + LINK_CODE_MINUTES * 60_000).toISOString();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode(6);
      const { error } = await supabase.from("link_codes").insert({ code, child_id: child.id, expires_at: expiresAt, created_by: userId });
      if (!error) return { code, expiresAt };
    }
    throw new Error("לא הצלחנו ליצור קוד, נסו שוב");
  });

/** Public: a child's device trades a valid, unused, unexpired code for a session. */
export const redeemLinkCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().min(4).max(16) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callerKey, enforceRateLimit } = await import("@/lib/rate-limit.server");
    const { normalizeCode } = await import("@/lib/codes.server");
    const { randomBytes } = await import("node:crypto");
    await enforceRateLimit("link_code", callerKey(), 10, 10);
    const code = normalizeCode(data.code);
    const { data: claimed } = await supabaseAdmin
      .from("link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("child_id")
      .maybeSingle();
    if (!claimed) throw new Error(GENERIC_CODE_ERROR);
    const { data: child } = await supabaseAdmin.from("child_profiles").select("id, user_id").eq("id", claimed.child_id).maybeSingle();
    if (!child) throw new Error(GENERIC_CODE_ERROR);
    const password = randomBytes(24).toString("base64url");
    let email: string;
    if (child.user_id) {
      const { data: existing } = await supabaseAdmin.auth.admin.getUserById(child.user_id);
      if (!existing?.user?.email) throw new Error(GENERIC_CODE_ERROR);
      email = existing.user.email;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(child.user_id, { password });
      if (error) throw new Error("לא הצלחנו לחבר את המכשיר");
    } else {
      email = `child-${child.id}@children.example.com`;
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "child" } });
      if (error || !created.user) throw new Error("לא הצלחנו לחבר את המכשיר");
      await supabaseAdmin.from("child_profiles").update({ user_id: created.user.id }).eq("id", child.id);
      await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: "child" }, { onConflict: "user_id,role" });
    }
    return { email, password };
  });

/** Family invite code for a second parent (48h). */
export const createInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ familyId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generateCode } = await import("@/lib/codes.server");
    await assertParent(supabase, userId, data.familyId);
    const expiresAt = new Date(Date.now() + INVITE_CODE_HOURS * 3_600_000).toISOString();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode(8);
      const { error } = await supabase.from("families").update({ invite_code: code, invite_code_expires_at: expiresAt }).eq("id", data.familyId);
      if (!error) return { code, expiresAt };
    }
    throw new Error("לא הצלחנו ליצור קוד, נסו שוב");
  });

/** A signed-in user asks to join a family as a second parent (needs approval). */
export const requestJoinFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().min(4).max(16) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callerKey, enforceRateLimit } = await import("@/lib/rate-limit.server");
    const { normalizeCode } = await import("@/lib/codes.server");
    const { userId } = context;
    await enforceRateLimit("invite_code", callerKey(userId), 10, 10);
    const { data: family } = await supabaseAdmin.from("families").select("id, name, invite_code_expires_at").eq("invite_code", normalizeCode(data.code)).maybeSingle();
    if (!family || !family.invite_code_expires_at || new Date(family.invite_code_expires_at) < new Date()) {
      throw new Error(GENERIC_CODE_ERROR);
    }
    const { data: already } = await supabaseAdmin.from("family_members").select("id").eq("user_id", userId).limit(1);
    if (already && already.length > 0) throw new Error("החשבון הזה כבר משויך למשפחה");
    const { data: asChild } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", userId).eq("role", "child").limit(1);
    if (asChild && asChild.length > 0) throw new Error("חשבון ילד לא יכול להצטרף כהורה");
    const { error } = await supabaseAdmin.from("family_members").insert({ family_id: family.id, user_id: userId, role: "parent", approved: false });
    if (error) throw new Error("לא הצלחנו לשלוח את הבקשה");
    return { familyName: family.name };
  });

export const listJoinRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ familyId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertParent(supabase, userId, data.familyId);
    const { data: pending } = await supabase.from("family_members").select("id, user_id, created_at").eq("family_id", data.familyId).eq("approved", false);
    if (!pending || pending.length === 0) return [];
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, display_name").in("id", pending.map((p) => p.user_id));
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    return pending.map((p) => ({ id: p.id, name: names.get(p.user_id) || "הורה חדש", requestedAt: p.created_at }));
  });

export const decideJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ memberId: z.string().uuid(), approve: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request } = await supabaseAdmin.from("family_members").select("id, family_id, user_id, approved").eq("id", data.memberId).maybeSingle();
    if (!request || request.approved) throw new Error("הבקשה לא נמצאה");
    await assertParent(supabase, userId, request.family_id);
    if (!data.approve) {
      await supabaseAdmin.from("family_members").delete().eq("id", request.id);
      return { ok: true };
    }
    await supabaseAdmin.from("family_members").update({ approved: true }).eq("id", request.id);
    await supabaseAdmin.from("user_roles").upsert({ user_id: request.user_id, role: "parent" }, { onConflict: "user_id,role" });
    return { ok: true };
  });
