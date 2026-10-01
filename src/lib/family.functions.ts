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
